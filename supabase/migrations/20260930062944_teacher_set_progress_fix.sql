-- RETURNS TABLE columns named band/section collided with INSERT/UPDATE
-- targets. Qualify table columns and return via RETURN QUERY.

create or replace function public.teacher_set_progress(
  p_code text,
  p_band text,
  p_section text,
  p_lesson text,
  p_phase text,
  p_done boolean
)
returns table (
  band text,
  section text,
  lesson_slug text,
  lesson boolean,
  review boolean,
  lab boolean
)
language plpgsql
security definer
set search_path = ''
as $fn$
#variable_conflict use_column
declare
  v_lesson timestamptz;
  v_review timestamptz;
  v_lab timestamptz;
begin
  perform teacher_private.check_code(p_code);

  if p_band is distinct from '6-8' then
    raise exception 'invalid_band' using errcode = '22023';
  end if;
  if p_section not in ('6g', '6b', '7g', '7b', '8g', '8b') then
    raise exception 'invalid_section' using errcode = '22023';
  end if;
  if p_phase not in ('lesson', 'review', 'lab') then
    raise exception 'invalid_phase' using errcode = '22023';
  end if;
  if p_lesson is null or p_lesson !~ '^[a-z0-9-]{1,80}$' then
    raise exception 'invalid_lesson' using errcode = '22023';
  end if;

  if p_done then
    insert into public.class_lesson_progress as clp (
      band, section, lesson_slug, lesson_at, review_at, lab_at
    )
    values (
      p_band,
      p_section,
      p_lesson,
      case when p_phase = 'lesson' then pg_catalog.now() else null end,
      case when p_phase = 'review' then pg_catalog.now() else null end,
      case when p_phase = 'lab' then pg_catalog.now() else null end
    )
    on conflict (band, section, lesson_slug) do update set
      lesson_at = case
        when p_phase = 'lesson' then pg_catalog.now()
        else clp.lesson_at
      end,
      review_at = case
        when p_phase = 'review' then pg_catalog.now()
        else clp.review_at
      end,
      lab_at = case
        when p_phase = 'lab' then pg_catalog.now()
        else clp.lab_at
      end;
  else
    update public.class_lesson_progress as clp
    set
      lesson_at = case when p_phase = 'lesson' then null else clp.lesson_at end,
      review_at = case when p_phase = 'review' then null else clp.review_at end,
      lab_at = case when p_phase = 'lab' then null else clp.lab_at end
    where clp.band = p_band
      and clp.section = p_section
      and clp.lesson_slug = p_lesson;
  end if;

  select clp.lesson_at, clp.review_at, clp.lab_at
    into v_lesson, v_review, v_lab
  from public.class_lesson_progress as clp
  where clp.band = p_band
    and clp.section = p_section
    and clp.lesson_slug = p_lesson;

  if v_lesson is null and v_review is null and v_lab is null then
    delete from public.class_lesson_progress as clp
    where clp.band = p_band
      and clp.section = p_section
      and clp.lesson_slug = p_lesson;
  end if;

  return query
  select
    p_band,
    p_section,
    p_lesson,
    (v_lesson is not null),
    (v_review is not null),
    (v_lab is not null);
end;
$fn$;

revoke all on function public.teacher_set_progress(text, text, text, text, text, boolean) from public;
grant execute on function public.teacher_set_progress(text, text, text, text, text, boolean) to anon, authenticated;
