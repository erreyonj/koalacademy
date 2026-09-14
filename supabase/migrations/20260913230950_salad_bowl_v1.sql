-- Salad Bowl V1 — classroom party game (Toolkit > Games > Salad Bowl).
--
-- Design:
--   * Students join with anonymous auth sessions (no accounts, no roster).
--   * Clients may only ever SELECT (RLS-guarded). Every mutation goes through
--     public.sb_command, which is executable by service_role only and is
--     called from the salad-bowl Edge Function after JWT verification.
--   * Realtime uses one private broadcast topic per game ("sb:game:<uuid>")
--     carrying only a version tick — clue text never rides a broadcast.
--   * All game content is ephemeral: games expire on a sliding window and a
--     cron job deletes expired games and old anonymous auth users.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

-- Private schema: helpers that must not be exposed through the Data API.
create schema if not exists sb_private;
grant usage on schema sb_private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.sb_game_status as enum (
  'lobby',        -- players entering names
  'collecting',   -- free-for-all response entry open
  'reviewing',    -- submissions locked, teacher moderating
  'teams',        -- teams drawn, teacher may reshuffle/move before locking
  'round_intro',  -- rules screen for the upcoming round
  'turn_ready',   -- waiting for the up-next player to start
  'turn_active',  -- clock running
  'round_end',    -- bowl emptied, round scoreboard
  'finished'      -- after round 3
);

create type public.sb_game_mode as enum ('free_for_all', 'teacher_deck');

create type public.sb_response_status as enum ('pending', 'accepted', 'rejected', 'flagged');

create type public.sb_card_state as enum ('bowl', 'hand', 'guessed');

create type public.sb_turn_status as enum ('active', 'ended');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.sb_games (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique check (code ~ '^[A-Z2-9]{5}$'),
  status               public.sb_game_status not null default 'lobby',
  mode                 public.sb_game_mode not null,
  responses_per_player smallint not null default 2 check (responses_per_player between 1 and 3),
  turn_seconds         smallint not null default 60 check (turn_seconds between 15 and 300),
  team_count           smallint not null default 2 check (team_count between 2 and 4),
  round                smallint not null default 0 check (round between 0 and 3),
  current_team_pos     smallint not null default 0,
  is_paused            boolean not null default false,
  host_user_id         uuid not null,
  recovery_pin_hash    text not null,
  pin_attempts         smallint not null default 0,
  pin_locked_until     timestamptz,
  custom_banned        text[] not null default '{}',
  version              bigint not null default 1,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null default now() + interval '6 hours'
);

create table public.sb_teams (
  id        uuid primary key default gen_random_uuid(),
  game_id   uuid not null references public.sb_games(id) on delete cascade,
  position  smallint not null,
  name      text not null,
  next_slot integer not null default 0,
  unique (game_id, position)
);

create table public.sb_players (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.sb_games(id) on delete cascade,
  user_id      uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 24),
  name_key     text not null check (char_length(name_key) between 1 and 40),
  is_host      boolean not null default false,
  team_id      uuid references public.sb_teams(id) on delete set null,
  team_order   smallint,
  -- pending + accepted submissions, denormalised so every member can watch
  -- quota progress without read access to anyone else's response rows.
  cards_in     smallint not null default 0,
  removed      boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (game_id, user_id),
  unique (game_id, name_key)
);

create index sb_players_game_idx on public.sb_players (game_id);
create index sb_players_team_idx on public.sb_players (team_id);
create index sb_players_user_idx on public.sb_players (user_id);

create table public.sb_responses (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.sb_games(id) on delete cascade,
  -- null = teacher-pasted deck entry
  submitted_by uuid references public.sb_players(id) on delete set null,
  text         text not null check (char_length(text) between 1 and 60),
  text_key     text not null check (char_length(text_key) between 1 and 80),
  status       public.sb_response_status not null default 'pending',
  flag_reason  text,
  created_at   timestamptz not null default now()
);

create index sb_responses_game_idx on public.sb_responses (game_id);
-- Race-safe duplicate rejection: only live entries hold the key, so a
-- flagged/rejected word does not block (or reveal) a later resubmission.
create unique index sb_responses_live_key
  on public.sb_responses (game_id, text_key)
  where status in ('pending', 'accepted');

create table public.sb_round_cards (
  game_id         uuid not null references public.sb_games(id) on delete cascade,
  round           smallint not null,
  response_id     uuid not null references public.sb_responses(id) on delete cascade,
  state           public.sb_card_state not null default 'bowl',
  guessed_by_team uuid references public.sb_teams(id) on delete set null,
  primary key (game_id, round, response_id)
);

create index sb_round_cards_state_idx on public.sb_round_cards (game_id, round, state);

create table public.sb_turns (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.sb_games(id) on delete cascade,
  round           smallint not null,
  team_id         uuid not null references public.sb_teams(id) on delete cascade,
  player_id       uuid not null references public.sb_players(id) on delete cascade,
  status          public.sb_turn_status not null default 'active',
  started_at      timestamptz not null default now(),
  ends_at         timestamptz not null,
  remaining_ms    integer,     -- frozen remainder while master-paused
  pass_used       boolean not null default false,
  points          smallint not null default 0,
  current_card_id uuid references public.sb_responses(id) on delete set null
);

create index sb_turns_game_idx on public.sb_turns (game_id, started_at desc);

create table public.sb_actions (
  id            bigint generated always as identity primary key,
  game_id       uuid not null references public.sb_games(id) on delete cascade,
  turn_id       uuid references public.sb_turns(id) on delete cascade,
  actor_user_id uuid not null,
  type          text not null,
  payload       jsonb not null default '{}'::jsonb,
  result        jsonb,
  idem_key      text unique,
  undone        boolean not null default false,
  created_at    timestamptz not null default now()
);

create index sb_actions_game_idx on public.sb_actions (game_id, id desc);

-- School-inappropriate terms, stored pre-normalised. Version bumps when the
-- shipped list changes; per-game teacher additions live on sb_games.
create table public.sb_banned_terms (
  term_key     text primary key,
  list_version smallint not null default 1
);

-- IP throttle for join-code / recovery-PIN guessing (IP supplied by the Edge
-- Function; rows are short-lived).
create table public.sb_join_attempts (
  ip           text not null,
  attempted_at timestamptz not null default now()
);

create index sb_join_attempts_idx on public.sb_join_attempts (ip, attempted_at);

-- ---------------------------------------------------------------------------
-- Helpers (sb_private)
-- ---------------------------------------------------------------------------

-- Canonical form used for duplicate + banned-word checks: lowercase, light
-- leetspeak folding, then strip everything but a-z0-9.
create or replace function sb_private.norm(p_text text)
returns text
language sql immutable
set search_path = ''
as $fn$
  select regexp_replace(
    translate(lower(coalesce(p_text, '')), '0134578@$!', 'oieastbasi'),
    '[^a-z0-9]', '', 'g');
$fn$;

create or replace function sb_private.is_member(p_game uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.sb_players p
    where p.game_id = p_game
      and p.user_id = (select auth.uid())
      and not p.removed
  );
$fn$;

create or replace function sb_private.is_host(p_game uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.sb_games g
    where g.id = p_game and g.host_user_id = (select auth.uid())
  );
$fn$;

revoke all on function sb_private.norm(text) from public;
revoke all on function sb_private.is_member(uuid) from public;
revoke all on function sb_private.is_host(uuid) from public;
grant execute on function sb_private.norm(text) to authenticated, service_role;
grant execute on function sb_private.is_member(uuid) to authenticated, service_role;
grant execute on function sb_private.is_host(uuid) to authenticated, service_role;

-- Parse "sb:game:<uuid>" topics; null for anything else.
create or replace function sb_private.topic_game(p_topic text)
returns uuid
language plpgsql immutable
set search_path = ''
as $fn$
begin
  if p_topic like 'sb:game:%' then
    return substring(p_topic from 9)::uuid;
  end if;
  return null;
exception when others then
  return null;
end;
$fn$;

revoke all on function sb_private.topic_game(text) from public;
grant execute on function sb_private.topic_game(text) to authenticated, service_role;

create or replace function sb_private.is_banned(p_game uuid, p_key text)
returns boolean
language sql stable
set search_path = ''
as $fn$
  select exists (
      select 1 from public.sb_banned_terms t
      where p_key like '%' || t.term_key || '%'
    )
    or exists (
      select 1
      from public.sb_games g, unnest(g.custom_banned) cb
      where g.id = p_game
        and char_length(sb_private.norm(cb)) > 0
        and p_key like '%' || sb_private.norm(cb) || '%'
    );
$fn$;

revoke all on function sb_private.is_banned(uuid, text) from public;
grant execute on function sb_private.is_banned(uuid, text) to service_role;

-- Bump the game version, slide expiry, and tick the private Realtime topic.
-- Broadcast payload is just {v} — clients refetch state; clue text never
-- travels game-wide.
create or replace function sb_private.touch(p_game uuid)
returns void
language plpgsql
set search_path = ''
as $fn$
declare
  v_version bigint;
begin
  update public.sb_games
     set version = version + 1,
         expires_at = now() + interval '6 hours'
   where id = p_game
   returning version into v_version;
  begin
    perform realtime.send(
      jsonb_build_object('v', v_version),
      'state',
      'sb:game:' || p_game::text,
      true);
  exception when others then
    null; -- realtime unavailable (e.g. bare test db) must never fail a command
  end;
end;
$fn$;

revoke all on function sb_private.touch(uuid) from public;
grant execute on function sb_private.touch(uuid) to service_role;

-- Who plays next: team at current_team_pos, player at next_slot within it.
create or replace function sb_private.up_next(p_game uuid, out o_team uuid, out o_player uuid)
language plpgsql stable
set search_path = ''
as $fn$
declare
  v_pos  smallint;
  v_team public.sb_teams%rowtype;
  v_cnt  integer;
begin
  select current_team_pos into v_pos from public.sb_games where id = p_game;
  if not found then return; end if;
  select * into v_team from public.sb_teams where game_id = p_game and position = v_pos;
  if not found then return; end if;
  o_team := v_team.id;
  select count(*) into v_cnt
    from public.sb_players where team_id = v_team.id and not removed;
  if v_cnt = 0 then return; end if;
  select s.id into o_player from (
    select p.id, row_number() over (order by p.team_order, p.id) - 1 as rn
    from public.sb_players p
    where p.team_id = v_team.id and not p.removed
  ) s
  where s.rn = (v_team.next_slot % v_cnt);
end;
$fn$;

revoke all on function sb_private.up_next(uuid) from public;
grant execute on function sb_private.up_next(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Command function — the only write path. service_role only; the Edge
-- Function verifies the caller's JWT and passes the auth uid as p_user.
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
  v_alpha    constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  g          public.sb_games%rowtype;
  me         public.sb_players%rowtype;
  t          public.sb_turns%rowtype;
  v_result   jsonb;
  v_turn_id  uuid;
  v_game_id  uuid;
  v_code     text;
  v_pin      text;
  v_text     text;
  v_key      text;
  v_name     text;
  v_id       uuid;
  v_id2      uuid;
  v_cnt      integer;
  v_cnt2     integer;
  v_b        bytea;
  v_i        integer;
  v_reason   text;
  v_row      record;
  v_items    text[];
  v_added    integer := 0;
  v_skipped  integer := 0;
begin
  if p_user is null or p_type is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  -- Idempotent replay: a retried command returns its original result. Scoped
  -- to the same actor and command type so nobody can fish another device's
  -- stored result (e.g. a start_turn result carrying card text) by key.
  if p_idem_key is not null then
    select a.result into v_result from public.sb_actions a
     where a.idem_key = p_idem_key
       and a.actor_user_id = p_user
       and a.type = p_type;
    if found then
      return v_result;
    end if;
  end if;

  -- ---------------------------------------------------------------- create
  if p_type = 'create_game' then
    if coalesce(p_payload->>'mode', '') not in ('free_for_all', 'teacher_deck') then
      return jsonb_build_object('ok', false, 'error', 'bad_mode');
    end if;
    v_name := trim(coalesce(p_payload->>'displayName', 'Teacher'));
    if char_length(v_name) < 1 or char_length(v_name) > 24 then
      return jsonb_build_object('ok', false, 'error', 'bad_name');
    end if;

    -- 6-digit recovery PIN, returned exactly once.
    v_b := extensions.gen_random_bytes(4);
    v_pin := lpad(((get_byte(v_b,0)::bigint * 16777216 + get_byte(v_b,1)::bigint * 65536
                  + get_byte(v_b,2)::bigint * 256 + get_byte(v_b,3)::bigint) % 1000000)::text, 6, '0');

    loop
      v_code := '';
      v_b := extensions.gen_random_bytes(5);
      for v_i in 0..4 loop
        v_code := v_code || substr(v_alpha, 1 + (get_byte(v_b, v_i) % 31), 1);
      end loop;
      begin
        insert into public.sb_games (code, mode, responses_per_player, turn_seconds, team_count,
                                     host_user_id, recovery_pin_hash)
        values (
          v_code,
          (p_payload->>'mode')::public.sb_game_mode,
          coalesce(nullif(p_payload->>'responsesPerPlayer', '')::smallint, 2),
          coalesce(nullif(p_payload->>'turnSeconds', '')::smallint, 60),
          coalesce(nullif(p_payload->>'teamCount', '')::smallint, 2),
          p_user,
          extensions.crypt(v_pin, extensions.gen_salt('bf', 8)))
        returning * into g;
        exit;
      exception when unique_violation then
        continue; -- code collision; roll again
      end;
    end loop;

    insert into public.sb_players (game_id, user_id, display_name, name_key, is_host)
    values (g.id, p_user, v_name, sb_private.norm(v_name) || ':host', true)
    returning id into v_id;

    v_result := jsonb_build_object(
      'ok', true, 'gameId', g.id, 'code', g.code,
      'playerId', v_id, 'recoveryPin', v_pin);
    insert into public.sb_actions (game_id, actor_user_id, type, payload, result, idem_key)
    values (g.id, p_user, p_type, '{}'::jsonb,
            v_result - 'recoveryPin', p_idem_key)
    on conflict (idem_key) do nothing;
    perform sb_private.touch(g.id);
    return v_result;
  end if;

  -- ------------------------------------------------------------ join paths
  if p_type in ('join_game', 'recover_host') then
    if p_ip is not null then
      select count(*) into v_cnt from public.sb_join_attempts
       where ip = p_ip and attempted_at > now() - interval '10 minutes';
      if v_cnt >= 30 then
        return jsonb_build_object('ok', false, 'error', 'throttled',
          'message', 'Too many attempts. Wait a few minutes.');
      end if;
    end if;

    select * into g from public.sb_games
     where code = upper(trim(coalesce(p_payload->>'code', ''))) and expires_at > now()
     for update;
    if not found then
      insert into public.sb_join_attempts (ip) values (coalesce(p_ip, 'unknown'));
      return jsonb_build_object('ok', false, 'error', 'not_found',
        'message', 'No game with that code.');
    end if;

    if p_type = 'join_game' then
      -- Rejoining device: same anonymous user already has a seat.
      select * into me from public.sb_players where game_id = g.id and user_id = p_user;
      if found then
        return jsonb_build_object('ok', true, 'gameId', g.id, 'playerId', me.id,
          'rejoined', true);
      end if;
      if g.status not in ('lobby', 'collecting') then
        return jsonb_build_object('ok', false, 'error', 'closed',
          'message', 'This game has already started.');
      end if;
      select count(*) into v_cnt from public.sb_players where game_id = g.id;
      if v_cnt >= 40 then
        return jsonb_build_object('ok', false, 'error', 'full');
      end if;
      v_name := regexp_replace(trim(coalesce(p_payload->>'displayName', '')), '\s+', ' ', 'g');
      v_key := sb_private.norm(v_name);
      if char_length(v_name) < 1 or char_length(v_name) > 24 or char_length(v_key) < 1 then
        return jsonb_build_object('ok', false, 'error', 'bad_name',
          'message', 'Use 1–24 letters or numbers.');
      end if;
      if sb_private.is_banned(g.id, v_key) then
        return jsonb_build_object('ok', false, 'error', 'name_blocked',
          'message', 'Pick a school-appropriate name.');
      end if;
      begin
        insert into public.sb_players (game_id, user_id, display_name, name_key)
        values (g.id, p_user, v_name, v_key)
        returning * into me;
      exception when unique_violation then
        return jsonb_build_object('ok', false, 'error', 'name_taken',
          'message', 'That name is taken — add a last initial.');
      end;
      v_result := jsonb_build_object('ok', true, 'gameId', g.id, 'playerId', me.id);

    else -- recover_host
      if g.pin_locked_until is not null and g.pin_locked_until > now() then
        return jsonb_build_object('ok', false, 'error', 'pin_locked',
          'message', 'Recovery locked. Try again in a few minutes.');
      end if;
      if g.recovery_pin_hash <> extensions.crypt(coalesce(p_payload->>'pin', ''), g.recovery_pin_hash) then
        update public.sb_games
           set pin_attempts = case when pin_attempts + 1 >= 5 then 0 else pin_attempts + 1 end,
               pin_locked_until = case when pin_attempts + 1 >= 5
                                       then now() + interval '15 minutes'
                                       else pin_locked_until end
         where id = g.id;
        insert into public.sb_join_attempts (ip) values (coalesce(p_ip, 'unknown'));
        return jsonb_build_object('ok', false, 'error', 'bad_pin');
      end if;
      -- Success: this device becomes the host.
      update public.sb_games
         set host_user_id = p_user, pin_attempts = 0, pin_locked_until = null
       where id = g.id;
      delete from public.sb_players
       where game_id = g.id and user_id = p_user and not is_host;
      update public.sb_players set user_id = p_user
       where game_id = g.id and is_host
       returning id into v_id;
      v_result := jsonb_build_object('ok', true, 'gameId', g.id, 'playerId', v_id);
    end if;

    insert into public.sb_actions (game_id, actor_user_id, type, payload, result, idem_key)
    values (g.id, p_user, p_type, jsonb_build_object('code', g.code), v_result, p_idem_key)
    on conflict (idem_key) do nothing;
    perform sb_private.touch(g.id);
    return v_result;
  end if;

  -- ---------------------------------------------------- game-scoped loader
  v_game_id := nullif(p_payload->>'gameId', '')::uuid;
  if v_game_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  -- Row lock serialises every command per game: no draw/score races.
  select * into g from public.sb_games where id = v_game_id for update;
  if not found or g.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select * into me from public.sb_players
   where game_id = g.id and user_id = p_user and not removed;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_member');
  end if;

  -- Master pause blocks non-host play commands.
  if g.is_paused and not me.is_host
     and p_type in ('submit_response', 'retract_response', 'start_turn',
                    'mark_correct', 'pass_card', 'end_turn') then
    return jsonb_build_object('ok', false, 'error', 'paused');
  end if;

  -- ------------------------------------------------------------- dispatch
  if p_type = 'update_settings' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if p_payload ? 'turnSeconds' and g.status not in ('finished') then
      update public.sb_games set turn_seconds = (p_payload->>'turnSeconds')::smallint where id = g.id;
    end if;
    if p_payload ? 'responsesPerPlayer' then
      if g.status not in ('lobby', 'collecting') then
        return jsonb_build_object('ok', false, 'error', 'too_late');
      end if;
      update public.sb_games set responses_per_player = (p_payload->>'responsesPerPlayer')::smallint where id = g.id;
    end if;
    if p_payload ? 'teamCount' then
      if g.status not in ('lobby', 'collecting', 'reviewing') then
        return jsonb_build_object('ok', false, 'error', 'too_late');
      end if;
      update public.sb_games set team_count = (p_payload->>'teamCount')::smallint where id = g.id;
    end if;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'open_submissions' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.mode <> 'free_for_all' or g.status <> 'lobby' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    update public.sb_games set status = 'collecting' where id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'set_deck' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.mode <> 'teacher_deck' or g.status <> 'lobby' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select array_agg(x) into v_items
      from (select jsonb_array_elements_text(coalesce(p_payload->'items', '[]'::jsonb)) x limit 201) s;
    if v_items is null or array_length(v_items, 1) > 200 then
      return jsonb_build_object('ok', false, 'error', 'bad_deck',
        'message', 'Paste between 1 and 200 lines.');
    end if;
    delete from public.sb_responses where game_id = g.id and submitted_by is null;
    foreach v_text in array v_items loop
      v_text := regexp_replace(trim(v_text), '\s+', ' ', 'g');
      v_key := sb_private.norm(v_text);
      if char_length(v_text) < 1 or char_length(v_text) > 60 or char_length(v_key) < 1 then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      begin
        insert into public.sb_responses (game_id, submitted_by, text, text_key, status)
        values (g.id, null, v_text, v_key, 'accepted');
        v_added := v_added + 1;
      exception when unique_violation then
        v_skipped := v_skipped + 1;
      end;
    end loop;
    v_result := jsonb_build_object('ok', true, 'added', v_added, 'skipped', v_skipped);

  elsif p_type = 'submit_response' then
    if g.status <> 'collecting' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    if me.is_host then
      return jsonb_build_object('ok', false, 'error', 'host_cannot_submit',
        'message', 'Use Koala/Music mode to enter a teacher deck.');
    end if;
    v_text := regexp_replace(trim(coalesce(p_payload->>'text', '')), '\s+', ' ', 'g');
    v_key := sb_private.norm(v_text);
    if char_length(v_text) < 1 or char_length(v_text) > 60 or char_length(v_key) < 1 then
      return jsonb_build_object('ok', false, 'error', 'invalid',
        'message', 'Use 1–60 characters with at least one letter or number.');
    end if;
    select count(*) into v_cnt from public.sb_responses
     where game_id = g.id and submitted_by = me.id and status in ('pending', 'accepted');
    if v_cnt >= g.responses_per_player then
      return jsonb_build_object('ok', false, 'error', 'quota',
        'message', 'You already put in all your cards.');
    end if;

    if sb_private.is_banned(g.id, v_key) then
      insert into public.sb_responses (game_id, submitted_by, text, text_key, status, flag_reason)
      values (g.id, me.id, v_text, v_key, 'flagged', 'blocked term');
      v_result := jsonb_build_object('ok', true, 'status', 'flagged',
        'message', 'That one can''t go in the bowl — try a different card.');
    else
      -- Near-duplicates go to the teacher flagged as such, not auto-rejected.
      v_reason := null;
      if char_length(v_key) > 3 and exists (
        select 1 from public.sb_responses r
        where r.game_id = g.id and r.status in ('pending', 'accepted')
          and abs(char_length(r.text_key) - char_length(v_key)) <= 1
          and extensions.levenshtein(r.text_key, v_key) = 1
      ) then
        v_reason := 'near-duplicate';
      end if;
      begin
        insert into public.sb_responses (game_id, submitted_by, text, text_key, status, flag_reason)
        values (g.id, me.id, v_text, v_key, 'pending', v_reason);
      exception when unique_violation then
        return jsonb_build_object('ok', false, 'error', 'duplicate',
          'message', 'Someone already put that in the bowl.');
      end;
      v_result := jsonb_build_object('ok', true, 'status', 'pending');
    end if;
    update public.sb_players p set cards_in = (
      select count(*) from public.sb_responses r
      where r.game_id = g.id and r.submitted_by = p.id and r.status in ('pending', 'accepted'))
     where p.id = me.id;

  elsif p_type = 'retract_response' then
    if g.status <> 'collecting' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    delete from public.sb_responses
     where id = nullif(p_payload->>'responseId', '')::uuid
       and game_id = g.id and submitted_by = me.id and status in ('pending', 'flagged');
    if not found then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    update public.sb_players p set cards_in = (
      select count(*) from public.sb_responses r
      where r.game_id = g.id and r.submitted_by = p.id and r.status in ('pending', 'accepted'))
     where p.id = me.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'review_response' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status not in ('collecting', 'reviewing') then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    if p_payload->>'action' = 'approve_all_pending' then
      update public.sb_responses set status = 'accepted'
       where game_id = g.id and status = 'pending';
    else
      select * into v_row from public.sb_responses
       where id = nullif(p_payload->>'responseId', '')::uuid and game_id = g.id;
      if not found then
        return jsonb_build_object('ok', false, 'error', 'not_found');
      end if;
      if p_payload->>'action' = 'approve' then
        begin
          update public.sb_responses set status = 'accepted', flag_reason = null
           where id = v_row.id;
        exception when unique_violation then
          return jsonb_build_object('ok', false, 'error', 'duplicate');
        end;
      elsif p_payload->>'action' = 'reject' then
        update public.sb_responses set status = 'rejected' where id = v_row.id;
      elsif p_payload->>'action' = 'edit' then
        v_text := regexp_replace(trim(coalesce(p_payload->>'text', '')), '\s+', ' ', 'g');
        v_key := sb_private.norm(v_text);
        if char_length(v_text) < 1 or char_length(v_text) > 60 or char_length(v_key) < 1 then
          return jsonb_build_object('ok', false, 'error', 'invalid');
        end if;
        begin
          update public.sb_responses
             set text = v_text, text_key = v_key, status = 'accepted', flag_reason = null
           where id = v_row.id;
        exception when unique_violation then
          return jsonb_build_object('ok', false, 'error', 'duplicate');
        end;
      else
        return jsonb_build_object('ok', false, 'error', 'bad_action');
      end if;
      -- Rejections and flag-overrides change the submitter's quota count.
      if v_row.submitted_by is not null then
        update public.sb_players p set cards_in = (
          select count(*) from public.sb_responses r
          where r.game_id = g.id and r.submitted_by = p.id and r.status in ('pending', 'accepted'))
         where p.id = v_row.submitted_by;
      end if;
    end if;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'add_banned_word' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    v_text := trim(coalesce(p_payload->>'term', ''));
    if char_length(sb_private.norm(v_text)) < 2 then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
    update public.sb_games set custom_banned = array_append(custom_banned, v_text)
     where id = g.id and not (v_text = any(custom_banned));
    -- Newly banned: pull matching live submissions back out of play.
    update public.sb_responses set status = 'flagged', flag_reason = 'blocked term (teacher)'
     where game_id = g.id and status in ('pending', 'accepted')
       and text_key like '%' || sb_private.norm(v_text) || '%';
    update public.sb_players p set cards_in = (
      select count(*) from public.sb_responses r
      where r.game_id = g.id and r.submitted_by = p.id and r.status in ('pending', 'accepted'))
     where p.game_id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'lock_responses' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.mode = 'free_for_all' then
      if g.status <> 'collecting' then
        return jsonb_build_object('ok', false, 'error', 'bad_state');
      end if;
      if coalesce((p_payload->>'waive')::boolean, false) is distinct from true then
        select count(*) into v_cnt from public.sb_players p
         where p.game_id = g.id and not p.is_host and not p.removed
           and p.cards_in < g.responses_per_player;
        if v_cnt > 0 then
          return jsonb_build_object('ok', false, 'error', 'quota_unmet',
            'missingPlayers', v_cnt,
            'message', 'Some players still owe cards. Lock anyway to waive them.');
        end if;
      end if;
    else
      if g.status <> 'lobby' then
        return jsonb_build_object('ok', false, 'error', 'bad_state');
      end if;
      select count(*) into v_cnt from public.sb_responses
       where game_id = g.id and status = 'accepted';
      if v_cnt < 1 then
        return jsonb_build_object('ok', false, 'error', 'empty_deck',
          'message', 'Paste the deck first.');
      end if;
    end if;
    update public.sb_games set status = 'reviewing' where id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'randomize_teams' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status not in ('reviewing', 'teams') then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select count(*) into v_cnt from public.sb_responses
     where game_id = g.id and status = 'accepted';
    if v_cnt < 5 then
      return jsonb_build_object('ok', false, 'error', 'too_few_cards',
        'message', 'Need at least 5 accepted cards in the bowl.');
    end if;
    select count(*) into v_cnt from public.sb_players
     where game_id = g.id and not is_host and not removed;
    if v_cnt < g.team_count then
      return jsonb_build_object('ok', false, 'error', 'too_few_players');
    end if;
    delete from public.sb_teams where game_id = g.id;
    for v_i in 0..(g.team_count - 1) loop
      insert into public.sb_teams (game_id, position, name)
      values (g.id, v_i, 'Team ' || (v_i + 1));
    end loop;
    -- gen_random_uuid() is a CSPRNG: cryptographically strong shuffle, then
    -- round-robin keeps team sizes within one player of each other.
    update public.sb_players p
       set team_id = tm.id, team_order = s.rn
      from (
        select id, row_number() over (order by gen_random_uuid()) - 1 as rn
        from public.sb_players
        where game_id = g.id and not is_host and not removed
      ) s
      join public.sb_teams tm
        on tm.game_id = g.id and tm.position = (s.rn % g.team_count)
     where p.id = s.id;
    update public.sb_games set status = 'teams' where id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'move_player' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status <> 'teams' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    update public.sb_players
       set team_id = nullif(p_payload->>'teamId', '')::uuid
     where id = nullif(p_payload->>'playerId', '')::uuid
       and game_id = g.id and not is_host;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'lock_teams' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status <> 'teams' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select count(*) into v_cnt from public.sb_teams tm
     where tm.game_id = g.id
       and not exists (select 1 from public.sb_players p
                       where p.team_id = tm.id and not p.removed);
    if v_cnt > 0 then
      return jsonb_build_object('ok', false, 'error', 'empty_team',
        'message', 'Every team needs at least one player.');
    end if;
    update public.sb_players p set team_order = s.rn
      from (
        select id, row_number() over (partition by team_id order by gen_random_uuid()) - 1 as rn
        from public.sb_players
        where game_id = g.id and team_id is not null and not removed
      ) s
     where p.id = s.id;
    update public.sb_games set round = 1, current_team_pos = 0, status = 'round_intro'
     where id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'begin_round' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status <> 'round_intro' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    insert into public.sb_round_cards (game_id, round, response_id)
    select g.id, g.round, r.id from public.sb_responses r
     where r.game_id = g.id and r.status = 'accepted'
    on conflict do nothing;
    update public.sb_games
       set current_team_pos = (g.round - 1) % g.team_count,
           status = 'turn_ready'
     where id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'start_turn' then
    if g.status <> 'turn_ready' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select o_team, o_player into v_id, v_id2 from sb_private.up_next(g.id);
    if v_id2 is null then
      return jsonb_build_object('ok', false, 'error', 'no_player',
        'message', 'The up-next team has no available players.');
    end if;
    if not me.is_host and me.id <> v_id2 then
      return jsonb_build_object('ok', false, 'error', 'not_your_turn');
    end if;
    insert into public.sb_turns (game_id, round, team_id, player_id, ends_at)
    values (g.id, g.round, v_id, v_id2, now() + make_interval(secs => g.turn_seconds))
    returning * into t;
    v_turn_id := t.id;
    -- Draw the first card.
    select response_id into v_id from public.sb_round_cards
     where game_id = g.id and round = g.round and state = 'bowl'
     order by gen_random_uuid() limit 1;
    update public.sb_round_cards set state = 'hand'
     where game_id = g.id and round = g.round and response_id = v_id;
    update public.sb_turns set current_card_id = v_id where id = t.id;
    update public.sb_games set status = 'turn_active' where id = g.id;
    select text into v_text from public.sb_responses where id = v_id;
    v_result := jsonb_build_object('ok', true, 'turnId', t.id,
      'endsAt', to_char(t.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'card', v_text);

  elsif p_type in ('mark_correct', 'pass_card') then
    if g.status <> 'turn_active' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select * into t from public.sb_turns
     where game_id = g.id and status = 'active'
     order by started_at desc limit 1;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'no_turn');
    end if;
    if not me.is_host and me.id <> t.player_id then
      return jsonb_build_object('ok', false, 'error', 'not_your_turn');
    end if;
    if now() > t.ends_at + interval '2 seconds' then
      return jsonb_build_object('ok', false, 'error', 'time_up');
    end if;
    if t.current_card_id is null then
      return jsonb_build_object('ok', false, 'error', 'no_card');
    end if;
    v_turn_id := t.id;

    if p_type = 'mark_correct' then
      update public.sb_round_cards
         set state = 'guessed', guessed_by_team = t.team_id
       where game_id = g.id and round = g.round and response_id = t.current_card_id;
      update public.sb_turns set points = points + 1, current_card_id = null where id = t.id;
    else
      if t.pass_used then
        return jsonb_build_object('ok', false, 'error', 'pass_used',
          'message', 'Only one pass per turn.');
      end if;
      update public.sb_round_cards set state = 'bowl'
       where game_id = g.id and round = g.round and response_id = t.current_card_id;
      update public.sb_turns set pass_used = true, current_card_id = null where id = t.id;
    end if;

    -- Draw the next card; an empty bowl ends the round on the spot.
    select response_id into v_id from public.sb_round_cards
     where game_id = g.id and round = g.round and state = 'bowl'
     order by gen_random_uuid() limit 1;
    if v_id is null then
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

  elsif p_type = 'end_turn' then
    if g.status <> 'turn_active' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select * into t from public.sb_turns
     where game_id = g.id and status = 'active'
     order by started_at desc limit 1;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'no_turn');
    end if;
    if not me.is_host then
      if me.id <> t.player_id then
        return jsonb_build_object('ok', false, 'error', 'not_your_turn');
      end if;
      if now() < t.ends_at - interval '1 second' then
        return jsonb_build_object('ok', false, 'error', 'too_early',
          'message', 'The clock is still running.');
      end if;
    end if;
    v_turn_id := t.id;
    if t.current_card_id is not null then
      update public.sb_round_cards set state = 'bowl'
       where game_id = g.id and round = g.round and response_id = t.current_card_id;
    end if;
    update public.sb_turns set status = 'ended', current_card_id = null where id = t.id;
    update public.sb_teams set next_slot = next_slot + 1 where id = t.team_id;
    update public.sb_games
       set current_team_pos = (current_team_pos + 1) % team_count,
           status = 'turn_ready'
     where id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'undo_last' then
    -- Teacher fix for a mis-tap during the current turn only.
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status <> 'turn_active' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    select * into t from public.sb_turns
     where game_id = g.id and status = 'active'
     order by started_at desc limit 1;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'no_turn');
    end if;
    v_turn_id := t.id;
    select * into v_row from public.sb_actions
     where game_id = g.id and turn_id = t.id and not undone
       and type in ('mark_correct', 'pass_card')
     order by id desc limit 1;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'nothing_to_undo');
    end if;
    if v_row.type = 'mark_correct' then
      -- The action payload records exactly which card was scored: bring it
      -- back to the hand, and return the card that replaced it to the bowl.
      v_id := nullif(v_row.payload->>'cardId', '')::uuid;
      if v_id is null then
        return jsonb_build_object('ok', false, 'error', 'nothing_to_undo');
      end if;
      if t.current_card_id is not null then
        update public.sb_round_cards set state = 'bowl'
         where game_id = g.id and round = g.round and response_id = t.current_card_id;
      end if;
      update public.sb_round_cards set state = 'hand', guessed_by_team = null
       where game_id = g.id and round = g.round and response_id = v_id;
      update public.sb_turns set points = greatest(points - 1, 0), current_card_id = v_id
       where id = t.id;
    else -- pass_card
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
      update public.sb_turns set pass_used = false, current_card_id = v_id
       where id = t.id;
    end if;
    update public.sb_actions set undone = true where id = v_row.id;
    select text into v_text from public.sb_responses where id = v_id;
    v_result := jsonb_build_object('ok', true, 'card', v_text);

  elsif p_type = 'pause' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.is_paused then return jsonb_build_object('ok', true); end if;
    update public.sb_games set is_paused = true where id = g.id;
    if g.status = 'turn_active' then
      update public.sb_turns
         set remaining_ms = greatest(0, (extract(epoch from (ends_at - now())) * 1000)::integer)
       where game_id = g.id and status = 'active';
    end if;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'resume' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if not g.is_paused then return jsonb_build_object('ok', true); end if;
    update public.sb_games set is_paused = false where id = g.id;
    if g.status = 'turn_active' then
      update public.sb_turns
         set ends_at = now() + make_interval(secs => coalesce(remaining_ms, 0) / 1000.0),
             remaining_ms = null
       where game_id = g.id and status = 'active';
    end if;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'skip_player' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status <> 'turn_ready' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    update public.sb_teams set next_slot = next_slot + 1
     where game_id = g.id and position = g.current_team_pos;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'next_round' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status <> 'round_end' then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    if g.round >= 3 then
      update public.sb_games set status = 'finished' where id = g.id;
    else
      update public.sb_games set round = round + 1, status = 'round_intro' where id = g.id;
    end if;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'reset_round' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    if g.status not in ('turn_ready', 'turn_active', 'round_end') then
      return jsonb_build_object('ok', false, 'error', 'bad_state');
    end if;
    delete from public.sb_turns where game_id = g.id and round = g.round;
    delete from public.sb_round_cards where game_id = g.id and round = g.round;
    update public.sb_games set status = 'round_intro', is_paused = false where id = g.id;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'remove_player' then
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    v_id := nullif(p_payload->>'playerId', '')::uuid;
    select * into v_row from public.sb_players
     where id = v_id and game_id = g.id and not is_host;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    if g.status in ('lobby', 'collecting', 'reviewing') then
      delete from public.sb_players where id = v_id;
    else
      update public.sb_players set removed = true where id = v_id;
      -- If they were mid-turn, close it out like a host end_turn.
      select * into t from public.sb_turns
       where game_id = g.id and status = 'active' and player_id = v_id;
      if found then
        if t.current_card_id is not null then
          update public.sb_round_cards set state = 'bowl'
           where game_id = g.id and round = g.round and response_id = t.current_card_id;
        end if;
        update public.sb_turns set status = 'ended', current_card_id = null where id = t.id;
        update public.sb_teams set next_slot = next_slot + 1 where id = t.team_id;
        update public.sb_games
           set current_team_pos = (current_team_pos + 1) % team_count,
               status = 'turn_ready'
         where id = g.id;
      end if;
    end if;
    v_result := jsonb_build_object('ok', true);

  elsif p_type = 'clear_game' then
    -- Teacher "clear the bowl": wipe all content and scores, keep the joined
    -- players, drop back to the lobby for a fresh game.
    if not me.is_host then return jsonb_build_object('ok', false, 'error', 'not_host'); end if;
    delete from public.sb_turns where game_id = g.id;
    delete from public.sb_responses where game_id = g.id;
    delete from public.sb_teams where game_id = g.id;
    update public.sb_players
       set team_id = null, team_order = null, cards_in = 0, removed = false
     where game_id = g.id;
    update public.sb_games
       set status = 'lobby', round = 0, current_team_pos = 0, is_paused = false
     where id = g.id;
    v_result := jsonb_build_object('ok', true);

  else
    return jsonb_build_object('ok', false, 'error', 'unknown_command');
  end if;

  -- --------------------------------------------------------------- commit
  insert into public.sb_actions (game_id, turn_id, actor_user_id, type, payload, result, idem_key)
  values (g.id, v_turn_id, p_user, p_type,
          (p_payload - 'gameId')
            || case when p_type in ('mark_correct', 'pass_card')
                    then jsonb_build_object('cardId', t.current_card_id) else '{}'::jsonb end,
          v_result, p_idem_key)
  on conflict (idem_key) do nothing;
  perform sb_private.touch(g.id);
  return v_result;
end;
$fn$;

revoke all on function public.sb_command(uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.sb_command(uuid, text, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- State read function — one round trip for clients. SECURITY INVOKER, so
-- RLS decides row visibility (e.g. cardText resolves only for the active
-- player and the host).
-- ---------------------------------------------------------------------------

create or replace function public.sb_state(p_game uuid)
returns jsonb
language sql stable
set search_path = ''
as $fn$
  select jsonb_build_object(
    'game', (
      select jsonb_build_object(
        'id', g.id, 'code', g.code, 'status', g.status, 'mode', g.mode,
        'responsesPerPlayer', g.responses_per_player,
        'turnSeconds', g.turn_seconds, 'teamCount', g.team_count,
        'round', g.round, 'currentTeamPos', g.current_team_pos,
        'isPaused', g.is_paused, 'version', g.version,
        'hostUserId', g.host_user_id)
      from public.sb_games g where g.id = p_game),
    'me', (
      select jsonb_build_object('playerId', p.id, 'isHost', p.is_host, 'teamId', p.team_id)
      from public.sb_players p
      where p.game_id = p_game and p.user_id = (select auth.uid())),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'userId', p.user_id, 'displayName', p.display_name,
        'isHost', p.is_host, 'teamId', p.team_id, 'teamOrder', p.team_order,
        'cardsIn', p.cards_in, 'removed', p.removed)
        order by p.created_at), '[]'::jsonb)
      from public.sb_players p where p.game_id = p_game),
    'teams', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', tm.id, 'position', tm.position, 'name', tm.name,
        'nextSlot', tm.next_slot) order by tm.position), '[]'::jsonb)
      from public.sb_teams tm where tm.game_id = p_game),
    'scores', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round', s.round, 'teamId', s.guessed_by_team, 'points', s.points)), '[]'::jsonb)
      from (
        select rc.round, rc.guessed_by_team, count(*)::int as points
        from public.sb_round_cards rc
        where rc.game_id = p_game and rc.state = 'guessed' and rc.guessed_by_team is not null
        group by rc.round, rc.guessed_by_team) s),
    'bowl', (
      select jsonb_build_object(
        'inBowl', count(*) filter (where rc.state = 'bowl'),
        'inHand', count(*) filter (where rc.state = 'hand'),
        'guessed', count(*) filter (where rc.state = 'guessed'))
      from public.sb_round_cards rc
      join public.sb_games g on g.id = rc.game_id and rc.round = g.round
      where rc.game_id = p_game),
    'turn', (
      select jsonb_build_object(
        'id', t.id, 'round', t.round, 'teamId', t.team_id, 'playerId', t.player_id,
        'status', t.status,
        'endsAt', to_char(t.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'remainingMs', t.remaining_ms, 'passUsed', t.pass_used, 'points', t.points,
        'hasCard', t.current_card_id is not null,
        'cardText', (select r.text from public.sb_responses r where r.id = t.current_card_id))
      from public.sb_turns t
      where t.game_id = p_game
      order by t.started_at desc limit 1),
    'upNext', (
      select jsonb_build_object('teamId', u.o_team, 'playerId', u.o_player)
      from sb_private.up_next(p_game) u),
    'serverTime', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
$fn$;

revoke all on function public.sb_state(uuid) from public, anon;
grant execute on function public.sb_state(uuid) to authenticated, service_role;

-- Host review feed: response rows RLS already limits text visibility, this
-- is just a typed convenience for the moderation panel and the student's own
-- card list.
-- (Clients select from sb_responses directly; no extra function needed.)

-- ---------------------------------------------------------------------------
-- Row Level Security + grants
-- ---------------------------------------------------------------------------

alter table public.sb_games enable row level security;
alter table public.sb_players enable row level security;
alter table public.sb_teams enable row level security;
alter table public.sb_responses enable row level security;
alter table public.sb_round_cards enable row level security;
alter table public.sb_turns enable row level security;
alter table public.sb_actions enable row level security;
alter table public.sb_banned_terms enable row level security;
alter table public.sb_join_attempts enable row level security;

-- Column-level SELECT grant keeps recovery/PIN columns and the banned list
-- unreadable even for members (select * via the Data API fails by design;
-- clients read through sb_state and targeted column selects).
grant select (id, code, status, mode, responses_per_player, turn_seconds,
              team_count, round, current_team_pos, is_paused, version,
              host_user_id, created_at, expires_at)
  on public.sb_games to authenticated;
grant select on public.sb_players to authenticated;
grant select on public.sb_teams to authenticated;
grant select on public.sb_responses to authenticated;
grant select on public.sb_round_cards to authenticated;
grant select on public.sb_turns to authenticated;
grant select on public.sb_actions to authenticated;
-- No client grants at all for sb_banned_terms / sb_join_attempts.

grant all on public.sb_games, public.sb_players, public.sb_teams,
             public.sb_responses, public.sb_round_cards, public.sb_turns,
             public.sb_actions, public.sb_banned_terms, public.sb_join_attempts
  to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy "sb_games member read" on public.sb_games
  for select to authenticated
  using (sb_private.is_member(id));

create policy "sb_players member read" on public.sb_players
  for select to authenticated
  using (sb_private.is_member(game_id));

create policy "sb_teams member read" on public.sb_teams
  for select to authenticated
  using (sb_private.is_member(game_id));

create policy "sb_round_cards member read" on public.sb_round_cards
  for select to authenticated
  using (sb_private.is_member(game_id));

create policy "sb_turns member read" on public.sb_turns
  for select to authenticated
  using (sb_private.is_member(game_id));

-- Response text is the secret. Three narrow read paths:
--   1. the submitter sees their own cards while collecting,
--   2. the host sees everything in their game,
--   3. the active player sees exactly the card in their hand.
create policy "sb_responses own read" on public.sb_responses
  for select to authenticated
  using (
    submitted_by in (
      select p.id from public.sb_players p
      where p.game_id = sb_responses.game_id and p.user_id = (select auth.uid())));

create policy "sb_responses host read" on public.sb_responses
  for select to authenticated
  using (sb_private.is_host(game_id));

create policy "sb_responses active card read" on public.sb_responses
  for select to authenticated
  using (
    exists (
      select 1
      from public.sb_turns t
      join public.sb_players p on p.id = t.player_id
      where t.game_id = sb_responses.game_id
        and t.status = 'active'
        and t.current_card_id = sb_responses.id
        and p.user_id = (select auth.uid())));

create policy "sb_actions host read" on public.sb_actions
  for select to authenticated
  using (sb_private.is_host(game_id));

-- ---------------------------------------------------------------------------
-- Realtime authorization — private topic per game, members only.
-- ---------------------------------------------------------------------------

create policy "sb members receive game topic" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and sb_private.topic_game(realtime.topic()) is not null
    and sb_private.is_member(sb_private.topic_game(realtime.topic())));

create policy "sb members presence on game topic" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and sb_private.topic_game(realtime.topic()) is not null
    and sb_private.is_member(sb_private.topic_game(realtime.topic())));

-- ---------------------------------------------------------------------------
-- Banned terms (list_version 1). Stored pre-normalised: lowercase a-z0-9,
-- leetspeak already folded by sb_private.norm on the input side. Deliberately
-- conservative — the teacher review step is the real gate; this list catches
-- the obvious attempts (including spacing/punctuation variants, which the
-- normaliser collapses before matching).
-- ---------------------------------------------------------------------------

insert into public.sb_banned_terms (term_key) values
  ('fuck'), ('shit'), ('bitch'), ('asshole'), ('bastard'), ('dick'),
  ('cock'), ('pussy'), ('cunt'), ('slut'), ('whore'), ('nigga'), ('nigger'),
  ('faggot'), ('retard'), ('rape'), ('porn'), ('sex'), ('penis'), ('vagina'),
  ('boob'), ('tits'), ('cum'), ('jizz'), ('blowjob'), ('handjob'), ('dildo'),
  ('hoe'), ('thot'), ('bombaclaat'), ('bomboclaat'), ('bumbaclot'),
  ('kys'), ('killyourself'), ('suicide'), ('heil'), ('hitler'), ('kkk'),
  ('meth'), ('cocaine'), ('heroin'), ('fentanyl')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Cleanup: expired games cascade away; join-attempt rows and stale anonymous
-- auth users age out on longer windows.
-- ---------------------------------------------------------------------------

create or replace function sb_private.cleanup()
returns void
language plpgsql
set search_path = ''
as $fn$
begin
  delete from public.sb_games where expires_at < now();
  delete from public.sb_join_attempts where attempted_at < now() - interval '1 day';
  begin
    delete from auth.users
     where is_anonymous is true and created_at < now() - interval '7 days';
  exception when others then
    null; -- insufficient privilege locally is fine; hosted cron runs as postgres
  end;
end;
$fn$;

revoke all on function sb_private.cleanup() from public;
grant execute on function sb_private.cleanup() to service_role;

do $cron$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('salad-bowl-cleanup', '23 * * * *', 'select sb_private.cleanup()');
exception when others then
  raise notice 'pg_cron unavailable, schedule salad-bowl-cleanup manually: %', sqlerrm;
end;
$cron$;
