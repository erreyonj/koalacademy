-- Expand class progress to K–2 / 3–5 / 6–8, and allow phase = all.

alter table public.class_lesson_progress
  drop constraint if exists class_lesson_progress_band_check,
  drop constraint if exists class_lesson_progress_section_check;

alter table public.class_lesson_progress
  add constraint class_lesson_progress_band_check
    check (band in ('k-2', '3-5', '6-8')),
  add constraint class_lesson_progress_section_check
    check (section in (
      'kg', 'kb', '1g', '1b', '2g', '2b',
      '3g', '3b', '4g', '4b', '5g', '5b',
      '6g', '6b', '7g', '7b', '8g', '8b'
    ));

create or replace function public.teacher_progress(p_code text)
returns table (
  band text,
  section text,
  lesson_slug text,
  lesson boolean,
  review boolean,
  lab boolean
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
    p.band,
    p.section,
    p.lesson_slug,
    (p.lesson_at is not null) as lesson,
    (p.review_at is not null) as review,
    (p.lab_at is not null) as lab
  from public.class_lesson_progress p;
end;
$fn$;

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
  v_now timestamptz := pg_catalog.now();
begin
  perform teacher_private.check_code(p_code);

  if p_band not in ('k-2', '3-5', '6-8') then
    raise exception 'invalid_band' using errcode = '22023';
  end if;
  if (p_band = 'k-2' and p_section not in ('kg', 'kb', '1g', '1b', '2g', '2b'))
    or (p_band = '3-5' and p_section not in ('3g', '3b', '4g', '4b', '5g', '5b'))
    or (p_band = '6-8' and p_section not in ('6g', '6b', '7g', '7b', '8g', '8b'))
  then
    raise exception 'invalid_section' using errcode = '22023';
  end if;
  if p_phase not in ('lesson', 'review', 'lab', 'all') then
    raise exception 'invalid_phase' using errcode = '22023';
  end if;
  if p_lesson is null or p_lesson !~ '^[a-z0-9-]{1,80}$' then
    raise exception 'invalid_lesson' using errcode = '22023';
  end if;

  select clp.lesson_at, clp.review_at, clp.lab_at
    into v_lesson, v_review, v_lab
  from public.class_lesson_progress as clp
  where clp.band = p_band
    and clp.section = p_section
    and clp.lesson_slug = p_lesson;

  if p_phase = 'all' then
    if p_done then
      v_lesson := coalesce(v_lesson, v_now);
      v_review := coalesce(v_review, v_now);
      v_lab := coalesce(v_lab, v_now);
    else
      v_lesson := null;
      v_review := null;
      v_lab := null;
    end if;
  elsif p_phase = 'lesson' then
    v_lesson := case when p_done then v_now else null end;
  elsif p_phase = 'review' then
    v_review := case when p_done then v_now else null end;
  else
    v_lab := case when p_done then v_now else null end;
  end if;

  if v_lesson is null and v_review is null and v_lab is null then
    delete from public.class_lesson_progress as clp
    where clp.band = p_band
      and clp.section = p_section
      and clp.lesson_slug = p_lesson;
  else
    insert into public.class_lesson_progress as clp (
      band, section, lesson_slug, lesson_at, review_at, lab_at
    )
    values (p_band, p_section, p_lesson, v_lesson, v_review, v_lab)
    on conflict (band, section, lesson_slug) do update set
      lesson_at = excluded.lesson_at,
      review_at = excluded.review_at,
      lab_at = excluded.lab_at;
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

revoke all on function public.teacher_progress(text) from public;
revoke all on function public.teacher_set_progress(text, text, text, text, text, boolean) from public;
grant execute on function public.teacher_progress(text) to anon, authenticated;
grant execute on function public.teacher_set_progress(text, text, text, text, text, boolean) to anon, authenticated;
