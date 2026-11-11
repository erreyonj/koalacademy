-- Allow a hidden "staff" cohort for teacher backdoor scores (alias MRE).

alter table public.staff_decode_scores
  drop constraint if exists staff_decode_scores_cohort_check;

alter table public.staff_decode_scores
  add constraint staff_decode_scores_cohort_check check (cohort in (
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
  ));

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
