-- Staff DeCode leaderboard. Anyone can read. Inserts go through a validated RPC
-- (no teacher code — students log their own alias + cohort after a win).

create table public.staff_decode_scores (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  cohort text not null,
  difficulty text not null,
  elapsed_sec integer not null,
  created_at timestamptz not null default now(),
  check (alias ~ '^[A-Z]{3}$'),
  check (cohort in (
    'scholars',
    'kb', 'kg',
    '1b', '1g',
    '2b', '2g',
    '3b', '3g',
    '4b', '4g',
    '5b', '5g',
    '6b', '6g',
    '7b', '7g',
    '8b', '8g',
    'staff'
  )),
  check (difficulty in ('easy', 'medium', 'hard')),
  check (elapsed_sec > 0)
);

create index staff_decode_scores_difficulty_elapsed_idx
  on public.staff_decode_scores (difficulty, elapsed_sec);

create index staff_decode_scores_cohort_elapsed_idx
  on public.staff_decode_scores (cohort, elapsed_sec);

alter table public.staff_decode_scores enable row level security;

revoke all on table public.staff_decode_scores from public, anon, authenticated;
grant select on table public.staff_decode_scores to anon, authenticated;

create policy "staff decode scores are readable"
  on public.staff_decode_scores
  for select
  to anon, authenticated
  using (true);

create or replace function public.staff_decode_placement(
  p_difficulty text,
  p_elapsed_sec integer
)
returns table (
  beaten integer,
  total integer
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_difficulty text;
begin
  v_difficulty := pg_catalog.lower(pg_catalog.btrim(coalesce(p_difficulty, '')));
  if v_difficulty not in ('easy', 'medium', 'hard') then
    raise exception 'invalid_difficulty' using errcode = '22023';
  end if;
  if p_elapsed_sec is null or p_elapsed_sec <= 0 then
    raise exception 'invalid_elapsed' using errcode = '22023';
  end if;

  return query
  select
    (
      select pg_catalog.count(*)::integer
      from public.staff_decode_scores as s
      where s.difficulty = v_difficulty
        and s.elapsed_sec > p_elapsed_sec
    ) as beaten,
    (
      select pg_catalog.count(*)::integer
      from public.staff_decode_scores as s
      where s.difficulty = v_difficulty
    ) as total;
end;
$fn$;

create or replace function public.staff_decode_log_score(
  p_alias text,
  p_cohort text,
  p_difficulty text,
  p_elapsed_sec integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_alias text;
  v_cohort text;
  v_difficulty text;
  v_id uuid;
begin
  v_alias := pg_catalog.upper(pg_catalog.btrim(coalesce(p_alias, '')));
  v_cohort := pg_catalog.lower(pg_catalog.btrim(coalesce(p_cohort, '')));
  v_difficulty := pg_catalog.lower(pg_catalog.btrim(coalesce(p_difficulty, '')));

  if v_alias !~ '^[A-Z]{3}$' then
    raise exception 'invalid_alias' using errcode = '22023';
  end if;

  if v_cohort not in (
    'scholars',
    'kb', 'kg',
    '1b', '1g',
    '2b', '2g',
    '3b', '3g',
    '4b', '4g',
    '5b', '5g',
    '6b', '6g',
    '7b', '7g',
    '8b', '8g',
    'staff'
  ) then
    raise exception 'invalid_cohort' using errcode = '22023';
  end if;

  if v_difficulty not in ('easy', 'medium', 'hard') then
    raise exception 'invalid_difficulty' using errcode = '22023';
  end if;

  if p_elapsed_sec is null or p_elapsed_sec <= 0 then
    raise exception 'invalid_elapsed' using errcode = '22023';
  end if;

  insert into public.staff_decode_scores as s (alias, cohort, difficulty, elapsed_sec)
  values (v_alias, v_cohort, v_difficulty, p_elapsed_sec)
  returning s.id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.staff_decode_placement(text, integer) from public;
grant execute on function public.staff_decode_placement(text, integer) to anon, authenticated;

revoke all on function public.staff_decode_log_score(text, text, text, integer) from public;
grant execute on function public.staff_decode_log_score(text, text, text, integer) to anon, authenticated;
