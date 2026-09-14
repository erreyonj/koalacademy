-- ---------------------------------------------------------------------------
-- Salad Bowl: cancel_game + add_teacher_response
--
-- Adds two host-only commands. The V1 sb_command is already applied on the
-- hosted project, so instead of re-emitting its ~800-line body (transcription
-- risk against the tested core) we rename it to sb_command_core and add a thin
-- sb_command dispatcher: the two new host-only commands are handled inline and
-- every other command delegates to the untouched core. External behaviour and
-- grants are identical.
-- ---------------------------------------------------------------------------

alter function public.sb_command(uuid, text, jsonb, text, text)
  rename to sb_command_core;

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
  g        public.sb_games%rowtype;
  me       public.sb_players%rowtype;
  v_game_id uuid;
  v_text   text;
  v_key    text;
  v_id     uuid;
  v_result jsonb;
begin
  if p_user is null or p_type is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  -- Everything except the two new host commands runs the tested core untouched.
  if p_type not in ('cancel_game', 'add_teacher_response') then
    return public.sb_command_core(p_user, p_type, p_payload, p_idem_key, p_ip);
  end if;

  -- Idempotent replay, scoped to actor + type (mirrors the core). cancel_game
  -- never stores an action (the row is gone), so this only ever fires for
  -- add_teacher_response retries.
  if p_idem_key is not null then
    select a.result into v_result from public.sb_actions a
     where a.idem_key = p_idem_key
       and a.actor_user_id = p_user
       and a.type = p_type;
    if found then
      return v_result;
    end if;
  end if;

  -- Game-scoped loader (mirrors sb_command_core).
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
  if not me.is_host then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  -- ------------------------------------------------------------- cancel_game
  -- Ends the room entirely (cascades players, responses, teams, turns,
  -- actions). Returns early: the deleted row can't take the trailing
  -- sb_actions insert / touch.
  if p_type = 'cancel_game' then
    delete from public.sb_games where id = g.id;
    return jsonb_build_object('ok', true, 'cancelled', true);
  end if;

  -- ------------------------------------------------- add_teacher_response
  -- Host tops up the bowl with an accepted card (teacher-deck style:
  -- submitted_by null, does not touch any student's cards_in). Allowed while
  -- collecting or reviewing so a small class can still reach the minimum.
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
end;
$fn$;

revoke all on function public.sb_command(uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.sb_command(uuid, text, jsonb, text, text) to service_role;
