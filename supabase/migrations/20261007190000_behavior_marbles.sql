-- Behavior marbles: per-student marble counts for Scholars + K–5 cohorts.
--
-- The roster is deliberately minimal (first name, last initial, cohort). No
-- DOB, contact, or guardian data is ever stored here — the import script drops
-- those columns before anything reaches the database.
--
-- Clients never SELECT this table. Reads and writes go through the same
-- passphrase-gated RPC pattern as class_lesson_progress
-- (teacher_private.check_code), so the public static portal only ever holds
-- the publishable anon key.

create table public.behavior_students (
  id uuid primary key default gen_random_uuid(),
  cohort text not null check (cohort in (
    'scholars',
    'kb', 'kg',
    '1b', '1g',
    '2b', '2g',
    '3b', '3g',
    '4b', '4g',
    '5b', '5g'
  )),
  first_name text not null check (length(first_name) between 1 and 60),
  last_initial text not null default '' check (length(last_initial) <= 2),
  marbles int not null default 0 check (marbles between -999 and 9999),
  prize boolean not null default false,
  active boolean not null default true,
  avatar_seed text not null default '' check (length(avatar_seed) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index behavior_students_cohort_active_idx
  on public.behavior_students (cohort)
  where active;

alter table public.behavior_students enable row level security;

revoke all on table public.behavior_students from public, anon, authenticated;

-- Shared row shape every RPC returns so the client has one type to parse.
create or replace function public.behavior_roster(p_code text)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  marbles int,
  prize boolean,
  avatar_seed text
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  perform teacher_private.check_code(p_code);

  return query
  select
    s.id,
    s.cohort,
    s.first_name,
    s.last_initial,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.active
  order by s.cohort, s.first_name, s.last_initial;
end;
$fn$;

create or replace function public.behavior_adjust(
  p_code text,
  p_student uuid,
  p_delta int
)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  marbles int,
  prize boolean,
  avatar_seed text
)
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform teacher_private.check_code(p_code);

  if p_delta is null or p_delta not between -10 and 10 or p_delta = 0 then
    raise exception 'invalid_delta' using errcode = '22023';
  end if;

  update public.behavior_students s
  set
    marbles = greatest(-999, least(9999, s.marbles + p_delta)),
    updated_at = pg_catalog.now()
  where s.id = p_student
    and s.active;

  if not found then
    raise exception 'unknown_student' using errcode = '22023';
  end if;

  return query
  select
    s.id,
    s.cohort,
    s.first_name,
    s.last_initial,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.id = p_student;
end;
$fn$;

create or replace function public.behavior_move(
  p_code text,
  p_student uuid,
  p_cohort text
)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  marbles int,
  prize boolean,
  avatar_seed text
)
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform teacher_private.check_code(p_code);

  if p_cohort not in (
    'scholars',
    'kb', 'kg', '1b', '1g', '2b', '2g',
    '3b', '3g', '4b', '4g', '5b', '5g'
  ) then
    raise exception 'invalid_cohort' using errcode = '22023';
  end if;

  update public.behavior_students s
  set
    cohort = p_cohort,
    updated_at = pg_catalog.now()
  where s.id = p_student
    and s.active;

  if not found then
    raise exception 'unknown_student' using errcode = '22023';
  end if;

  return query
  select
    s.id,
    s.cohort,
    s.first_name,
    s.last_initial,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.id = p_student;
end;
$fn$;

-- "Remove" is a soft delete: the student leaves every roster but the row stays
-- so an accidental tap can be undone from the database if needed.
create or replace function public.behavior_remove(
  p_code text,
  p_student uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform teacher_private.check_code(p_code);

  update public.behavior_students s
  set
    active = false,
    updated_at = pg_catalog.now()
  where s.id = p_student
    and s.active;

  if not found then
    raise exception 'unknown_student' using errcode = '22023';
  end if;
end;
$fn$;

create or replace function public.behavior_prize(
  p_code text,
  p_student uuid,
  p_on boolean
)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  marbles int,
  prize boolean,
  avatar_seed text
)
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform teacher_private.check_code(p_code);

  update public.behavior_students s
  set
    prize = coalesce(p_on, false),
    updated_at = pg_catalog.now()
  where s.id = p_student
    and s.active;

  if not found then
    raise exception 'unknown_student' using errcode = '22023';
  end if;

  return query
  select
    s.id,
    s.cohort,
    s.first_name,
    s.last_initial,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.id = p_student;
end;
$fn$;

revoke all on function public.behavior_roster(text) from public;
revoke all on function public.behavior_adjust(text, uuid, int) from public;
revoke all on function public.behavior_move(text, uuid, text) from public;
revoke all on function public.behavior_remove(text, uuid) from public;
revoke all on function public.behavior_prize(text, uuid, boolean) from public;

grant execute on function public.behavior_roster(text) to anon, authenticated;
grant execute on function public.behavior_adjust(text, uuid, int) to anon, authenticated;
grant execute on function public.behavior_move(text, uuid, text) to anon, authenticated;
grant execute on function public.behavior_remove(text, uuid) to anon, authenticated;
grant execute on function public.behavior_prize(text, uuid, boolean) to anon, authenticated;
