-- Salad Bowl database test suite: command-flow, RLS, moderation, pause math,
-- idempotency, undo, and clear. Runs against a local stack:
--
--   ./scripts/test-salad-bowl-db.sh
--
-- Everything runs in one transaction and rolls back. Failures raise, so a
-- clean exit means every assertion passed.

\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.impersonate(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.as_postgres()
returns void language plpgsql as $$
begin
  execute 'reset role';
end;
$$;

do $test$
declare
  u_teacher constant uuid := '00000000-0000-4000-8000-000000000001';
  u_alice   constant uuid := '00000000-0000-4000-8000-00000000000a';
  u_bob     constant uuid := '00000000-0000-4000-8000-00000000000b';
  u_cara    constant uuid := '00000000-0000-4000-8000-00000000000c';
  u_dan     constant uuid := '00000000-0000-4000-8000-00000000000d';
  u_intruder constant uuid := '00000000-0000-4000-8000-0000000000ff';
  r jsonb;
  r2 jsonb;
  v_game uuid;
  v_code text;
  v_pin text;
  v_card uuid;
  v_turn record;
  v_cnt int;
  v_pts int;
  v_status text;
  v_active_uid uuid;
  v_round int;
  v_guard int;
begin
  -- ------------------------------------------------------------ create/join
  r := public.sb_command(u_teacher, 'create_game',
    '{"mode":"free_for_all","responsesPerPlayer":2,"turnSeconds":60,"teamCount":2,"displayName":"Ms. E"}');
  if not (r->>'ok')::boolean then raise exception 'create_game failed: %', r; end if;
  v_game := (r->>'gameId')::uuid;
  v_code := r->>'code';
  v_pin  := r->>'recoveryPin';
  if v_code !~ '^[A-Z2-9]{5}$' then raise exception 'bad code %', v_code; end if;
  if v_pin !~ '^\d{6}$' then raise exception 'bad pin'; end if;

  r := public.sb_command(u_alice, 'join_game',
    jsonb_build_object('code', v_code, 'displayName', 'Alice'));
  if not (r->>'ok')::boolean then raise exception 'alice join failed: %', r; end if;
  r := public.sb_command(u_bob, 'join_game',
    jsonb_build_object('code', v_code, 'displayName', 'Bob'));
  r := public.sb_command(u_cara, 'join_game',
    jsonb_build_object('code', v_code, 'displayName', 'Cara'));
  r := public.sb_command(u_dan, 'join_game',
    jsonb_build_object('code', v_code, 'displayName', 'Dan'));

  -- Duplicate display name is rejected.
  r := public.sb_command(u_intruder, 'join_game',
    jsonb_build_object('code', v_code, 'displayName', 'alice'));
  if (r->>'ok')::boolean or r->>'error' <> 'name_taken' then
    raise exception 'duplicate name should be rejected: %', r;
  end if;

  -- Rejoin from the same anonymous user returns the same seat.
  r := public.sb_command(u_alice, 'join_game',
    jsonb_build_object('code', v_code, 'displayName', 'Alice2'));
  if not (r->>'rejoined')::boolean then raise exception 'rejoin failed: %', r; end if;

  -- Blocked name.
  r := public.sb_command(u_intruder, 'join_game',
    jsonb_build_object('code', v_code, 'displayName', 'sh!t head'));
  if r->>'error' <> 'name_blocked' then raise exception 'name should be blocked: %', r; end if;

  -- ------------------------------------------------------------- collection
  r := public.sb_command(u_teacher, 'open_submissions',
    jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'open failed: %', r; end if;

  r := public.sb_command(u_alice, 'submit_response',
    jsonb_build_object('gameId', v_game, 'text', 'air guitar'));
  if r->>'status' <> 'pending' then raise exception 'submit failed: %', r; end if;

  -- Exact duplicate across students (with spacing/case tricks) is rejected.
  r := public.sb_command(u_bob, 'submit_response',
    jsonb_build_object('gameId', v_game, 'text', 'AIR  GUITAR'));
  if r->>'error' <> 'duplicate' then raise exception 'dup should reject: %', r; end if;

  -- Banned term (leetspeak) is flagged, not stored live, and returns the
  -- neutral replacement message.
  r := public.sb_command(u_bob, 'submit_response',
    jsonb_build_object('gameId', v_game, 'text', 'b0mb@claat'));
  if r->>'status' <> 'flagged' then raise exception 'banned should flag: %', r; end if;
  select count(*) into v_cnt from public.sb_responses
   where game_id = v_game and status = 'flagged';
  if v_cnt <> 1 then raise exception 'flagged row missing'; end if;
  -- Flagged does not consume quota.
  select cards_in into v_cnt from public.sb_players
   where game_id = v_game and user_id = u_bob;
  if v_cnt <> 0 then raise exception 'flagged consumed quota'; end if;

  -- Near-duplicate is accepted as pending but flagged for review.
  r := public.sb_command(u_bob, 'submit_response',
    jsonb_build_object('gameId', v_game, 'text', 'air guitars'));
  if not (r->>'ok')::boolean then raise exception 'near-dup submit failed: %', r; end if;
  select count(*) into v_cnt from public.sb_responses
   where game_id = v_game and flag_reason = 'near-duplicate' and status = 'pending';
  if v_cnt <> 1 then raise exception 'near-duplicate not marked'; end if;

  -- Fill remaining quotas.
  perform public.sb_command(u_alice, 'submit_response', jsonb_build_object('gameId', v_game, 'text', 'kick drum'));
  perform public.sb_command(u_bob,   'submit_response', jsonb_build_object('gameId', v_game, 'text', 'chorus'));
  perform public.sb_command(u_cara,  'submit_response', jsonb_build_object('gameId', v_game, 'text', 'quarter note'));
  perform public.sb_command(u_cara,  'submit_response', jsonb_build_object('gameId', v_game, 'text', 'koala sampler'));
  perform public.sb_command(u_dan,   'submit_response', jsonb_build_object('gameId', v_game, 'text', 'eight oh eight'));

  -- Quota enforced.
  r := public.sb_command(u_alice, 'submit_response',
    jsonb_build_object('gameId', v_game, 'text', 'one too many'));
  if r->>'error' <> 'quota' then raise exception 'quota should block: %', r; end if;

  -- Non-member cannot act inside the game.
  r := public.sb_command(u_intruder, 'submit_response',
    jsonb_build_object('gameId', v_game, 'text', 'sneaky'));
  if r->>'error' <> 'not_member' then raise exception 'intruder not blocked: %', r; end if;

  -- Student cannot run host commands.
  r := public.sb_command(u_alice, 'lock_responses', jsonb_build_object('gameId', v_game));
  if r->>'error' <> 'not_host' then raise exception 'student ran host cmd: %', r; end if;

  -- Dan still owes one card: lock refuses without a waiver, accepts with it.
  r := public.sb_command(u_teacher, 'lock_responses', jsonb_build_object('gameId', v_game));
  if r->>'error' <> 'quota_unmet' then raise exception 'lock should need waiver: %', r; end if;
  r := public.sb_command(u_teacher, 'lock_responses',
    jsonb_build_object('gameId', v_game, 'waive', true));
  if not (r->>'ok')::boolean then raise exception 'waived lock failed: %', r; end if;

  -- ------------------------------------------------------------- moderation
  -- Approve all pending, then teacher-ban a term and watch it pull the card.
  r := public.sb_command(u_teacher, 'review_response',
    jsonb_build_object('gameId', v_game, 'action', 'approve_all_pending'));
  select count(*) into v_cnt from public.sb_responses
   where game_id = v_game and status = 'accepted';
  if v_cnt <> 7 then raise exception 'expected 7 accepted, got %', v_cnt; end if;

  r := public.sb_command(u_teacher, 'add_banned_word',
    jsonb_build_object('gameId', v_game, 'term', 'guitars'));
  select count(*) into v_cnt from public.sb_responses
   where game_id = v_game and status = 'flagged' and flag_reason like 'blocked term%';
  if v_cnt < 2 then raise exception 'teacher ban did not flag'; end if;

  -- Teacher edits the flagged near-dup back into play with new text.
  select id into v_card from public.sb_responses
   where game_id = v_game and text = 'air guitars';
  r := public.sb_command(u_teacher, 'review_response',
    jsonb_build_object('gameId', v_game, 'action', 'edit', 'responseId', v_card, 'text', 'bass drop'));
  if not (r->>'ok')::boolean then raise exception 'edit failed: %', r; end if;

  select count(*) into v_cnt from public.sb_responses
   where game_id = v_game and status = 'accepted';
  if v_cnt <> 7 then raise exception 'expected 7 accepted after edit, got %', v_cnt; end if;

  -- ------------------------------------------------------------------- RLS
  perform pg_temp.impersonate(u_alice);
  -- Member sees game + players, but never the PIN column.
  select count(*) into v_cnt from public.sb_games where id = v_game;
  if v_cnt <> 1 then raise exception 'member cannot read game'; end if;
  begin
    execute format('select recovery_pin_hash from public.sb_games where id = %L', v_game);
    raise exception 'PIN column readable by member!';
  exception when insufficient_privilege then null;
  end;
  -- Alice reads only her own response text.
  select count(*) into v_cnt from public.sb_responses where game_id = v_game;
  if v_cnt <> 2 then raise exception 'alice sees % responses, expected 2 (own only)', v_cnt; end if;

  perform pg_temp.impersonate(u_intruder);
  select count(*) into v_cnt from public.sb_games where id = v_game;
  if v_cnt <> 0 then raise exception 'non-member can read game'; end if;
  select count(*) into v_cnt from public.sb_players where game_id = v_game;
  if v_cnt <> 0 then raise exception 'non-member can read players'; end if;
  select count(*) into v_cnt from public.sb_responses where game_id = v_game;
  if v_cnt <> 0 then raise exception 'non-member can read responses'; end if;

  perform pg_temp.impersonate(u_teacher);
  select count(*) into v_cnt from public.sb_responses where game_id = v_game;
  if v_cnt < 8 then raise exception 'host cannot read all responses (%)', v_cnt; end if;
  -- Direct writes are revoked even for members.
  begin
    execute format('update public.sb_games set status = %L where id = %L', 'finished', v_game);
    raise exception 'client could write sb_games!';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.as_postgres();

  -- ------------------------------------------------------------- team draw
  r := public.sb_command(u_teacher, 'randomize_teams', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'randomize failed: %', r; end if;
  select count(*) into v_cnt from public.sb_teams where game_id = v_game;
  if v_cnt <> 2 then raise exception 'expected 2 teams'; end if;
  -- Balanced: 4 students over 2 teams = 2 + 2.
  select max(c) - min(c) into v_cnt from (
    select count(*) as c from public.sb_players
    where game_id = v_game and team_id is not null group by team_id) s;
  if v_cnt <> 0 then raise exception 'teams unbalanced'; end if;

  r := public.sb_command(u_teacher, 'lock_teams', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'lock_teams failed: %', r; end if;
  select status::text, round into v_status, v_round from public.sb_games where id = v_game;
  if v_status <> 'round_intro' or v_round <> 1 then
    raise exception 'expected round_intro r1, got % r%', v_status, v_round;
  end if;

  -- ------------------------------------------------------- round 1 mechanics
  r := public.sb_command(u_teacher, 'begin_round', jsonb_build_object('gameId', v_game));
  select count(*) into v_cnt from public.sb_round_cards
   where game_id = v_game and round = 1 and state = 'bowl';
  if v_cnt <> 7 then raise exception 'bowl should hold 7 cards, got %', v_cnt; end if;

  r := public.sb_command(u_teacher, 'start_turn', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'start_turn failed: %', r; end if;
  if coalesce(r->>'card', '') = '' then raise exception 'no card drawn'; end if;

  -- Clue privacy: the active player reads the in-hand card; a teammate can't.
  select t.player_id, p.user_id into v_turn
    from public.sb_turns t join public.sb_players p on p.id = t.player_id
   where t.game_id = v_game and t.status = 'active';
  v_active_uid := v_turn.user_id;
  perform pg_temp.impersonate(v_active_uid);
  select count(*) into v_cnt
    from public.sb_responses r3
    join public.sb_turns t on t.current_card_id = r3.id and t.status = 'active'
   where r3.game_id = v_game;
  if v_cnt <> 1 then raise exception 'active player cannot read own card'; end if;
  perform pg_temp.impersonate(u_intruder);
  select count(*) into v_cnt from public.sb_responses r3
   where r3.game_id = v_game;
  if v_cnt <> 0 then raise exception 'intruder reads cards'; end if;
  perform pg_temp.as_postgres();

  -- Idempotency: replaying the same mark_correct applies exactly once.
  r  := public.sb_command(u_teacher, 'mark_correct',
    jsonb_build_object('gameId', v_game), 'idem-score-1');
  r2 := public.sb_command(u_teacher, 'mark_correct',
    jsonb_build_object('gameId', v_game), 'idem-score-1');
  if r::text <> r2::text then raise exception 'idempotent replay diverged'; end if;
  select points into v_pts from public.sb_turns
   where game_id = v_game and status = 'active';
  if v_pts <> 1 then raise exception 'double-scored: %', v_pts; end if;

  -- Undo: the score comes back off and the card returns to the hand.
  r := public.sb_command(u_teacher, 'undo_last', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'undo failed: %', r; end if;
  select points into v_pts from public.sb_turns
   where game_id = v_game and status = 'active';
  if v_pts <> 0 then raise exception 'undo did not revert points'; end if;
  select count(*) into v_cnt from public.sb_round_cards
   where game_id = v_game and round = 1 and state = 'guessed';
  if v_cnt <> 0 then raise exception 'undo left a guessed card'; end if;

  -- Pass: card returns to bowl, pass consumed, second pass refused.
  r := public.sb_command(u_teacher, 'pass_card', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'pass failed: %', r; end if;
  r := public.sb_command(u_teacher, 'pass_card', jsonb_build_object('gameId', v_game));
  if r->>'error' <> 'pass_used' then raise exception 'second pass allowed: %', r; end if;

  -- Pause freezes the remainder; resume restores a sane ends_at.
  r := public.sb_command(u_teacher, 'pause', jsonb_build_object('gameId', v_game));
  select remaining_ms into v_cnt from public.sb_turns
   where game_id = v_game and status = 'active';
  if v_cnt is null or v_cnt <= 0 or v_cnt > 60000 then
    raise exception 'bad frozen remainder %', v_cnt;
  end if;
  -- Students are blocked while paused.
  r := public.sb_command(v_active_uid, 'mark_correct', jsonb_build_object('gameId', v_game));
  if r->>'error' <> 'paused' then raise exception 'pause not enforced: %', r; end if;
  r := public.sb_command(u_teacher, 'resume', jsonb_build_object('gameId', v_game));
  select extract(epoch from (ends_at - now())) * 1000 into v_pts
    from public.sb_turns where game_id = v_game and status = 'active';
  if v_pts <= 0 or v_pts > 60000 then raise exception 'bad resumed ends_at (% ms)', v_pts; end if;

  -- Host ends the turn: card back in the bowl, rotation advances.
  r := public.sb_command(u_teacher, 'end_turn', jsonb_build_object('gameId', v_game));
  select status::text into v_status from public.sb_games where id = v_game;
  if v_status <> 'turn_ready' then raise exception 'expected turn_ready'; end if;
  select count(*) into v_cnt from public.sb_round_cards
   where game_id = v_game and round = 1 and state = 'bowl';
  if v_cnt <> 7 then raise exception 'bowl should be full again, got %', v_cnt; end if;

  -- Wrong student cannot start someone else's turn.
  select p.user_id into v_active_uid
    from public.sb_players p
    join (select o_player from sb_private.up_next(v_game)) u on u.o_player = p.id;
  r := public.sb_command(
    (select user_id from public.sb_players
      where game_id = v_game and not is_host and user_id <> v_active_uid limit 1),
    'start_turn', jsonb_build_object('gameId', v_game));
  if r->>'error' <> 'not_your_turn' then raise exception 'wrong player started turn: %', r; end if;

  -- --------------------------------------------- play out all three rounds
  v_guard := 0;
  loop
    v_guard := v_guard + 1;
    if v_guard > 200 then raise exception 'game loop runaway'; end if;
    select status::text into v_status from public.sb_games where id = v_game;
    exit when v_status = 'finished';
    if v_status = 'round_intro' then
      perform public.sb_command(u_teacher, 'begin_round', jsonb_build_object('gameId', v_game));
    elsif v_status = 'turn_ready' then
      perform public.sb_command(u_teacher, 'start_turn', jsonb_build_object('gameId', v_game));
    elsif v_status = 'turn_active' then
      perform public.sb_command(u_teacher, 'mark_correct', jsonb_build_object('gameId', v_game));
    elsif v_status = 'round_end' then
      perform public.sb_command(u_teacher, 'next_round', jsonb_build_object('gameId', v_game));
    else
      raise exception 'unexpected status %', v_status;
    end if;
  end loop;

  -- All 7 cards guessed in each of 3 rounds; team totals must sum to 21.
  select sum(points) into v_pts from (
    select count(*) as points from public.sb_round_cards
    where game_id = v_game and state = 'guessed' group by round, guessed_by_team) s;
  if v_pts <> 21 then raise exception 'expected 21 total guesses, got %', v_pts; end if;

  -- ---------------------------------------------------------- host recovery
  r := public.sb_command(u_intruder, 'recover_host',
    jsonb_build_object('code', v_code, 'pin', '000001'), null, '10.0.0.9');
  if r->>'error' <> 'bad_pin' then raise exception 'wrong pin accepted: %', r; end if;
  r := public.sb_command(u_intruder, 'recover_host',
    jsonb_build_object('code', v_code, 'pin', v_pin), null, '10.0.0.9');
  if not (r->>'ok')::boolean then raise exception 'recovery with real pin failed: %', r; end if;
  select host_user_id into v_active_uid from public.sb_games where id = v_game;
  if v_active_uid <> u_intruder then raise exception 'host not transferred'; end if;

  -- ------------------------------------------------------------ clear bowl
  r := public.sb_command(u_intruder, 'clear_game', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'clear failed: %', r; end if;
  select status::text into v_status from public.sb_games where id = v_game;
  if v_status <> 'lobby' then raise exception 'clear should return to lobby'; end if;
  select count(*) into v_cnt from public.sb_responses where game_id = v_game;
  if v_cnt <> 0 then raise exception 'clear left responses'; end if;
  select count(*) into v_cnt from public.sb_players where game_id = v_game;
  if v_cnt < 5 then raise exception 'clear dropped players'; end if;

  -- ---------------------------------------------------------------- expiry
  update public.sb_games set expires_at = now() - interval '1 minute' where id = v_game;
  perform sb_private.cleanup();
  select count(*) into v_cnt from public.sb_games where id = v_game;
  if v_cnt <> 0 then raise exception 'cleanup left expired game'; end if;
  select count(*) into v_cnt from public.sb_players where game_id = v_game;
  if v_cnt <> 0 then raise exception 'cleanup did not cascade players'; end if;

  -- ------------------------------------------- teacher cards + cancel game
  -- Small class (2 players x 2 cards) can't reach the 5-card minimum on its
  -- own; the teacher tops up the bowl, then cancels the whole room.
  r := public.sb_command(u_teacher, 'create_game',
    '{"mode":"free_for_all","responsesPerPlayer":2,"turnSeconds":60,"teamCount":2,"displayName":"Ms. E"}');
  if not (r->>'ok')::boolean then raise exception 'small create failed: %', r; end if;
  v_game := (r->>'gameId')::uuid;
  v_code := r->>'code';
  perform public.sb_command(u_alice, 'join_game', jsonb_build_object('code', v_code, 'displayName', 'Alice'));
  perform public.sb_command(u_bob,   'join_game', jsonb_build_object('code', v_code, 'displayName', 'Bob'));
  perform public.sb_command(u_teacher, 'open_submissions', jsonb_build_object('gameId', v_game));

  -- Teacher card allowed while collecting.
  r := public.sb_command(u_teacher, 'add_teacher_response',
    jsonb_build_object('gameId', v_game, 'text', 'warm up'));
  if not (r->>'ok')::boolean then raise exception 'collecting teacher card failed: %', r; end if;

  perform public.sb_command(u_alice, 'submit_response', jsonb_build_object('gameId', v_game, 'text', 'red'));
  perform public.sb_command(u_alice, 'submit_response', jsonb_build_object('gameId', v_game, 'text', 'blue'));
  perform public.sb_command(u_bob,   'submit_response', jsonb_build_object('gameId', v_game, 'text', 'green'));

  -- Bob still owes a card; lock with a waiver, then approve the three pending.
  r := public.sb_command(u_teacher, 'lock_responses',
    jsonb_build_object('gameId', v_game, 'waive', true));
  if not (r->>'ok')::boolean then raise exception 'small lock failed: %', r; end if;
  perform public.sb_command(u_teacher, 'review_response',
    jsonb_build_object('gameId', v_game, 'action', 'approve_all_pending'));
  select count(*) into v_cnt from public.sb_responses
   where game_id = v_game and status = 'accepted';
  if v_cnt <> 4 then raise exception 'expected 4 accepted before top-up, got %', v_cnt; end if;

  -- Four cards is under the minimum: draw refuses.
  r := public.sb_command(u_teacher, 'randomize_teams', jsonb_build_object('gameId', v_game));
  if r->>'error' <> 'too_few_cards' then raise exception 'draw should need 5 cards: %', r; end if;

  -- Students can't add teacher cards.
  r := public.sb_command(u_alice, 'add_teacher_response',
    jsonb_build_object('gameId', v_game, 'text', 'sneaky'));
  if r->>'error' <> 'not_host' then raise exception 'student added teacher card: %', r; end if;

  -- Teacher tops up to five while reviewing.
  r := public.sb_command(u_teacher, 'add_teacher_response',
    jsonb_build_object('gameId', v_game, 'text', 'kazoo'));
  if not (r->>'ok')::boolean then raise exception 'reviewing teacher card failed: %', r; end if;
  -- Duplicate (case/space folded) and banned terms are rejected.
  r := public.sb_command(u_teacher, 'add_teacher_response',
    jsonb_build_object('gameId', v_game, 'text', 'KAZOO'));
  if r->>'error' <> 'duplicate' then raise exception 'teacher dup not caught: %', r; end if;
  r := public.sb_command(u_teacher, 'add_teacher_response',
    jsonb_build_object('gameId', v_game, 'text', 'b0mb@claat'));
  if r->>'error' <> 'name_blocked' then raise exception 'teacher banned not caught: %', r; end if;

  select count(*) into v_cnt from public.sb_responses
   where game_id = v_game and status = 'accepted';
  if v_cnt <> 5 then raise exception 'expected 5 accepted after top-up, got %', v_cnt; end if;

  -- Now the draw succeeds.
  r := public.sb_command(u_teacher, 'randomize_teams', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean then raise exception 'draw after top-up failed: %', r; end if;

  -- Cancel deletes the room and cascades everything.
  r := public.sb_command(u_teacher, 'cancel_game', jsonb_build_object('gameId', v_game));
  if not (r->>'ok')::boolean or not (r->>'cancelled')::boolean then
    raise exception 'cancel_game failed: %', r;
  end if;
  select count(*) into v_cnt from public.sb_games where id = v_game;
  if v_cnt <> 0 then raise exception 'cancel left the game row'; end if;
  select count(*) into v_cnt from public.sb_players where game_id = v_game;
  if v_cnt <> 0 then raise exception 'cancel did not cascade players'; end if;
  select count(*) into v_cnt from public.sb_responses where game_id = v_game;
  if v_cnt <> 0 then raise exception 'cancel did not cascade responses'; end if;

  -- A second cancel finds nothing.
  r := public.sb_command(u_teacher, 'cancel_game', jsonb_build_object('gameId', v_game));
  if r->>'error' <> 'not_found' then raise exception 'cancel of gone game: %', r; end if;

  raise notice 'SALAD BOWL DB TESTS PASSED';
end;
$test$;

rollback;
