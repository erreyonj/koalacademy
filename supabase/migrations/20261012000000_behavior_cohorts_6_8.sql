-- 6–8 join the class marble buckets. behavior_students already accepts these
-- codes (class seating); the pool table and the RPCs that check a cohort list
-- still stop at 5th grade.

alter table public.behavior_cohort_pool
  drop constraint if exists behavior_cohort_pool_cohort_check;

alter table public.behavior_cohort_pool
  add constraint behavior_cohort_pool_cohort_check check (cohort in (
    'scholars',
    'kb', 'kg',
    '1b', '1g',
    '2b', '2g',
    '3b', '3g',
    '4b', '4g',
    '5b', '5g',
    '6b', '6g',
    '7b', '7g',
    '8b', '8g'
  ));

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
    '3b', '3g', '4b', '4g', '5b', '5g',
    '6b', '6g', '7b', '7g', '8b', '8g'
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

create or replace function public.behavior_pool_adjust(
  p_code text,
  p_cohort text,
  p_delta int
)
returns table (cohort text, marbles int)
language plpgsql
security definer
set search_path = ''
as $fn$
#variable_conflict use_column
begin
  perform teacher_private.check_code(p_code);

  if p_cohort not in (
    'scholars',
    'kb', 'kg', '1b', '1g', '2b', '2g',
    '3b', '3g', '4b', '4g', '5b', '5g',
    '6b', '6g', '7b', '7g', '8b', '8g'
  ) then
    raise exception 'invalid_cohort' using errcode = '22023';
  end if;
  if p_delta is null or p_delta not between -10 and 10 or p_delta = 0 then
    raise exception 'invalid_delta' using errcode = '22023';
  end if;

  insert into public.behavior_cohort_pool as p (cohort, marbles)
  values (p_cohort, greatest(-9999, least(99999, p_delta)))
  on conflict (cohort) do update set
    marbles = greatest(-9999, least(99999, p.marbles + p_delta)),
    updated_at = pg_catalog.now();

  return query
  select p.cohort, p.marbles
  from public.behavior_cohort_pool p
  where p.cohort = p_cohort;
end;
$fn$;

create or replace function public.behavior_empty(p_code text, p_cohort text)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform teacher_private.check_code(p_code);

  if p_cohort not in (
    'scholars',
    'kb', 'kg', '1b', '1g', '2b', '2g',
    '3b', '3g', '4b', '4g', '5b', '5g',
    '6b', '6g', '7b', '7g', '8b', '8g'
  ) then
    raise exception 'invalid_cohort' using errcode = '22023';
  end if;

  update public.behavior_cohort_pool p
  set marbles = 0, updated_at = pg_catalog.now()
  where p.cohort = p_cohort;

  update public.behavior_students s
  set marbles = 0, updated_at = pg_catalog.now()
  where s.cohort = p_cohort
    and s.active
    and s.marbles <> 0;
end;
$fn$;

create or replace function public.behavior_pool_set(
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
    '3b', '3g', '4b', '4g', '5b', '5g',
    '6b', '6g', '7b', '7g', '8b', '8g'
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
