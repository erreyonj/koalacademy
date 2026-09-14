-- ---------------------------------------------------------------------------
-- Salad Bowl: foul_card (teacher Foul / Next)
--
-- Host-only rule-break control: return the active card to the bowl without
-- consuming the turn's pass, keep the clock running, draw the next card.
-- Extends the thin sb_command dispatcher (after cancel/teacher-cards) — does
-- not re-emit the V1 core.
-- ---------------------------------------------------------------------------

create or replace function public.sb_command(
  p_user     uuid,
  p_type     text,
  p_payload  jsonb default '{}'::jsonb,
  p_idem_key text default null,
  p_ip       text default null
) returns jsonb
language plpgsql volatile
set search_path = ''
as $fn$
declare
  g         public.sb_games%rowtype;
  me        public.sb_players%rowtype;
  t         public.sb_turns%rowtype;
  v_game_id uuid;
  v_text    text;
  v_key     text;
  v_id      uuid;
  v_fouled  uuid;
  v_result  jsonb;
  v_row     record;
begin
  if p_user is null or p_type is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  -- Delegate everything the wrapper does not own. undo_last is intercepted
  -- only when the latest action on the active turn is a foul_card.
  if p_type not in ('cancel_game', 'add_teacher_response', 'foul_card', 'undo_last') then
    return public.sb_command_core(p_user, p_type, p_payload, p_idem_key, p_ip);
  end if;

  -- Idempotent replay, scoped to actor + type.
  if p_idem_key is not null then
    select a.result into v_result from public.sb_actions a
     where a.idem_key = p_idem_key
       and a.actor_user_id = p_user
       and a.type = p_type;
    if found then
      return v_result;
    end if;
  end if;

  v_game_id := nullif(p_payload->>'gameId', '')::uuid;
  if v_game_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  select * into g from public.sb_games where id = v_game_id for update;
  if not found or g.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select * into me from public.sb_players
   where game_id = g.id and user_id = p_user and not removed;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_member');
  end if;

  -- ------------------------------------------------------------- undo_last
  -- If the latest undoable action is foul_card, reverse it here. Otherwise
  -- hand off to the core (mark_correct / pass_card).
  if p_type = 'undo_last' then
    if not me.is_host then
      return jsonb_build_object('ok', false, 'error', 'not_host');
    end if;
    if g.status <> 'turn_active' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select * into t from public.sb_turns
     where game_id = g.id and status = 'active'
     order by started_at desc limit 1;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'no_turn');
    end if;
    select * into v_row from public.sb_actions
     where game_id = g.id and turn_id = t.id and not undone
       and type in ('mark_correct', 'pass_card', 'foul_card')
     order by id desc limit 1;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'nothing_to_undo');
    end if;
    if v_row.type <> 'foul_card' then
      return public.sb_command_core(p_user, p_type, p_payload, p_idem_key, p_ip);
    end if;

    v_id := nullif(v_row.payload->>'cardId', '')::uuid;
    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'nothing_to_undo');
    end if;
    if t.current_card_id is not null then
      update public.sb_round_cards set state = 'bowl'
       where game_id = g.id and round = g.round and response_id = t.current_card_id;
    end if;
    update public.sb_round_cards set state = 'hand'
     where game_id = g.id and round = g.round and response_id = v_id;
    update public.sb_turns set current_card_id = v_id where id = t.id;
    update public.sb_actions set undone = true where id = v_row.id;
    select text into v_text from public.sb_responses where id = v_id;
    v_result := jsonb_build_object('ok', true, 'card', v_text);
    insert into public.sb_actions (game_id, turn_id, actor_user_id, type, payload, result, idem_key)
    values (g.id, t.id, p_user, p_type, p_payload - 'gameId', v_result, p_idem_key)
    on conflict (idem_key) do nothing;
    perform sb_private.touch(g.id);
    return v_result;
  end if;

  -- Remaining wrapper commands are host-only.
  if not me.is_host then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  -- ------------------------------------------------------------- cancel_game
  if p_type = 'cancel_game' then
    delete from public.sb_games where id = g.id;
    return jsonb_build_object('ok', true, 'cancelled', true);
  end if;

  -- ------------------------------------------------- add_teacher_response
  if p_type = 'add_teacher_response' then
    if g.status not in ('collecting', 'reviewing') then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    v_text := regexp_replace(trim(coalesce(p_payload->>'text', '')), '\s+', ' ', 'g');
    v_key := sb_private.norm(v_text);
    if char_length(v_text) < 1 or char_length(v_text) > 60 or char_length(v_key) < 1 then
      return jsonb_build_object('ok', false, 'error', 'invalid',
        'message', 'Use 1–60 characters with at least one letter or number.');
    end if;
    if sb_private.is_banned(g.id, v_key) then
      return jsonb_build_object('ok', false, 'error', 'name_blocked',
        'message', 'That word is blocked. Try another.');
    end if;
    begin
      insert into public.sb_responses (game_id, submitted_by, text, text_key, status)
      values (g.id, null, v_text, v_key, 'accepted')
      returning id into v_id;
    exception when unique_violation then
      return jsonb_build_object('ok', false, 'error', 'duplicate',
        'message', 'That card is already in the bowl.');
    end;
    v_result := jsonb_build_object('ok', true, 'responseId', v_id);
    insert into public.sb_actions (game_id, actor_user_id, type, payload, result, idem_key)
    values (g.id, p_user, p_type, p_payload - 'gameId', v_result, p_idem_key)
    on conflict (idem_key) do nothing;
    perform sb_private.touch(g.id);
    return v_result;
  end if;

  -- --------------------------------------------------------------- foul_card
  -- Rule break: card back to the bowl, pass untouched, same turn continues.
  if g.status <> 'turn_active' then
    return jsonb_build_object('ok', false, 'error', 'bad_state');
  end if;
  select * into t from public.sb_turns
   where game_id = g.id and status = 'active'
   order by started_at desc limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_turn');
  end if;
  if t.current_card_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_card');
  end if;

  v_fouled := t.current_card_id;
  update public.sb_round_cards set state = 'bowl'
   where game_id = g.id and round = g.round and response_id = v_fouled;
  update public.sb_turns set current_card_id = null where id = t.id;

  select response_id into v_id from public.sb_round_cards
   where game_id = g.id and round = g.round and state = 'bowl'
   order by gen_random_uuid() limit 1;
  if v_id is null then
    -- Should be rare (we just returned a card); mirror pass empty-bowl path.
    update public.sb_turns set status = 'ended' where id = t.id;
    update public.sb_teams set next_slot = next_slot + 1 where id = t.team_id;
    update public.sb_games
       set current_team_pos = (current_team_pos + 1) % team_count,
           status = case when g.round >= 3 then 'finished'::public.sb_game_status
                         else 'round_end'::public.sb_game_status end
     where id = g.id;
    v_result := jsonb_build_object('ok', true, 'roundOver', true);
  else
    update public.sb_round_cards set state = 'hand'
     where game_id = g.id and round = g.round and response_id = v_id;
    update public.sb_turns set current_card_id = v_id where id = t.id;
    select text into v_text from public.sb_responses where id = v_id;
    v_result := jsonb_build_object('ok', true, 'card', v_text);
  end if;

  insert into public.sb_actions (game_id, turn_id, actor_user_id, type, payload, result, idem_key)
  values (g.id, t.id, p_user, p_type,
          jsonb_build_object('cardId', v_fouled),
          v_result, p_idem_key)
  on conflict (idem_key) do nothing;
  perform sb_private.touch(g.id);
  return v_result;
end;
$fn$;

revoke all on function public.sb_command(uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.sb_command(uuid, text, jsonb, text, text) to service_role;
