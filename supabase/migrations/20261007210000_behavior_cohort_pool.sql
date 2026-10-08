-- Class-level marbles that live in a cohort's bucket on top of the sum of its
-- students' marbles. Same lock as behavior_students: no client grants, only
-- teacher-code-gated RPCs.

create table public.behavior_cohort_pool (
  cohort text primary key check (cohort in (
    'scholars',
    'kb', 'kg',
    '1b', '1g',
    '2b', '2g',
    '3b', '3g',
    '4b', '4g',
    '5b', '5g'
  )),
  marbles int not null default 0 check (marbles between -9999 and 99999),
  updated_at timestamptz not null default now()
);

alter table public.behavior_cohort_pool enable row level security;

revoke all on table public.behavior_cohort_pool from public, anon, authenticated;

create or replace function public.behavior_pools(p_code text)
returns table (cohort text, marbles int)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  perform teacher_private.check_code(p_code);

  return query
  select p.cohort, p.marbles
  from public.behavior_cohort_pool p;
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
    '3b', '3g', '4b', '4g', '5b', '5g'
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

-- Empty = the whole class starts over: class pool and every active student's
-- counter in the cohort go back to 0.
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
    '3b', '3g', '4b', '4g', '5b', '5g'
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

revoke all on function public.behavior_pools(text) from public;
revoke all on function public.behavior_pool_adjust(text, text, int) from public;
revoke all on function public.behavior_empty(text, text) from public;

grant execute on function public.behavior_pools(text) to anon, authenticated;
grant execute on function public.behavior_pool_adjust(text, text, int) to anon, authenticated;
grant execute on function public.behavior_empty(text, text) to anon, authenticated;
