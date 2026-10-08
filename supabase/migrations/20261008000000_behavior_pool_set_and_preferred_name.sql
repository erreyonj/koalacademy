-- Preferred names ("Gao Yeng Soua goes by Madison") and setting a bucket to an
-- exact total. Same lock as before: no client grants, only teacher-code-gated
-- RPCs.

alter table public.behavior_students
  add column preferred_name text
  check (preferred_name is null or char_length(preferred_name) between 1 and 60);

-- The shared row shape gains preferred_name; a changed return table needs a
-- drop before the re-create.
drop function if exists public.behavior_roster(text);
drop function if exists public.behavior_adjust(text, uuid, int);
drop function if exists public.behavior_move(text, uuid, text);
drop function if exists public.behavior_prize(text, uuid, boolean);

create function public.behavior_roster(p_code text)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  preferred_name text,
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
    s.preferred_name,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.active
  order by s.cohort, coalesce(s.preferred_name, s.first_name), s.last_initial;
end;
$fn$;

create function public.behavior_adjust(
  p_code text,
  p_student uuid,
  p_delta int
)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  preferred_name text,
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
    s.preferred_name,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.id = p_student;
end;
$fn$;

create function public.behavior_move(
  p_code text,
  p_student uuid,
  p_cohort text
)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  preferred_name text,
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
    s.preferred_name,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.id = p_student;
end;
$fn$;

create function public.behavior_prize(
  p_code text,
  p_student uuid,
  p_on boolean
)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  preferred_name text,
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
    s.preferred_name,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.id = p_student;
end;
$fn$;

-- Blank clears the preferred name.
create function public.behavior_set_preferred_name(
  p_code text,
  p_student uuid,
  p_name text
)
returns table (
  id uuid,
  cohort text,
  first_name text,
  last_initial text,
  preferred_name text,
  marbles int,
  prize boolean,
  avatar_seed text
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_name text := nullif(pg_catalog.btrim(coalesce(p_name, '')), '');
begin
  perform teacher_private.check_code(p_code);

  if v_name is not null and pg_catalog.char_length(v_name) > 60 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  update public.behavior_students s
  set
    preferred_name = v_name,
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
    s.preferred_name,
    s.marbles,
    s.prize,
    s.avatar_seed
  from public.behavior_students s
  where s.id = p_student;
end;
$fn$;

-- Sets the bucket's displayed total (students + pool) by solving for the pool.
-- Student counters are untouched. Returns the new pool value.
create function public.behavior_pool_set(
  p_code text,
  p_cohort text,
  p_total int
)
returns int
language plpgsql
security definer
set search_path = ''
as $fn$
#variable_conflict use_column
declare
  v_students int;
  v_pool int;
begin
  perform teacher_private.check_code(p_code);

  if p_cohort not in (
    'scholars',
    'kb', 'kg', '1b', '1g', '2b', '2g',
    '3b', '3g', '4b', '4g', '5b', '5g'
  ) then
    raise exception 'invalid_cohort' using errcode = '22023';
  end if;
  if p_total is null or p_total not between 0 and 99999 then
    raise exception 'invalid_total' using errcode = '22023';
  end if;

  select coalesce(sum(s.marbles), 0)::int into v_students
  from public.behavior_students s
  where s.cohort = p_cohort
    and s.active;

  v_pool := p_total - v_students;
  if v_pool not between -9999 and 99999 then
    raise exception 'invalid_total' using errcode = '22023';
  end if;

  insert into public.behavior_cohort_pool as p (cohort, marbles)
  values (p_cohort, v_pool)
  on conflict (cohort) do update set
    marbles = v_pool,
    updated_at = pg_catalog.now();

  return v_pool;
end;
$fn$;

revoke all on function public.behavior_roster(text) from public;
revoke all on function public.behavior_adjust(text, uuid, int) from public;
revoke all on function public.behavior_move(text, uuid, text) from public;
revoke all on function public.behavior_prize(text, uuid, boolean) from public;
revoke all on function public.behavior_set_preferred_name(text, uuid, text) from public;
revoke all on function public.behavior_pool_set(text, text, int) from public;

grant execute on function public.behavior_roster(text) to anon, authenticated;
grant execute on function public.behavior_adjust(text, uuid, int) to anon, authenticated;
grant execute on function public.behavior_move(text, uuid, text) to anon, authenticated;
grant execute on function public.behavior_prize(text, uuid, boolean) to anon, authenticated;
grant execute on function public.behavior_set_preferred_name(text, uuid, text) to anon, authenticated;
grant execute on function public.behavior_pool_set(text, text, int) to anon, authenticated;
