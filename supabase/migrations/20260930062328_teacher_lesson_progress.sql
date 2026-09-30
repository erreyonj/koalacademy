-- Teacher mode: classroom lesson progress for 6–8 Gold/Blue sections.
-- Clients never SELECT this table. Reads and writes go through passphrase-
-- gated RPCs (the hash is not the classroom code).

create schema if not exists teacher_private;
revoke all on schema teacher_private from public;

create table teacher_private.settings (
  id int primary key default 1 check (id = 1),
  code_hash text not null
);

revoke all on table teacher_private.settings from public;

insert into teacher_private.settings (id, code_hash)
values (
  1,
  '$2a$08$o1fL1YfadBF2umnLAl3uMuLffJca9rXbirbKayuXhwiEbQzZNyQPq'
);

create table public.class_lesson_progress (
  band text not null check (band = '6-8'),
  section text not null check (section in ('6g', '6b', '7g', '7b', '8g', '8b')),
  lesson_slug text not null check (lesson_slug ~ '^[a-z0-9-]{1,80}$'),
  lesson_at timestamptz,
  review_at timestamptz,
  lab_at timestamptz,
  primary key (band, section, lesson_slug),
  check (
    lesson_at is not null
    or review_at is not null
    or lab_at is not null
  )
);

alter table public.class_lesson_progress enable row level security;

revoke all on table public.class_lesson_progress from public, anon, authenticated;

create or replace function teacher_private.check_code(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_hash text;
begin
  select s.code_hash into v_hash
  from teacher_private.settings s
  where s.id = 1;

  if v_hash is null
     or v_hash <> extensions.crypt(coalesce(p_code, ''), v_hash) then
    raise exception 'invalid_code' using errcode = '42501';
  end if;
end;
$fn$;

revoke all on function teacher_private.check_code(text) from public;

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
  from public.class_lesson_progress p
  where p.band = '6-8';
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
    insert into public.class_lesson_progress as p (
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
        else p.lesson_at
      end,
      review_at = case
        when p_phase = 'review' then pg_catalog.now()
        else p.review_at
      end,
      lab_at = case
        when p_phase = 'lab' then pg_catalog.now()
        else p.lab_at
      end;
  else
    update public.class_lesson_progress
    set
      lesson_at = case when p_phase = 'lesson' then null else lesson_at end,
      review_at = case when p_phase = 'review' then null else review_at end,
      lab_at = case when p_phase = 'lab' then null else lab_at end
    where p.band = p_band
      and p.section = p_section
      and p.lesson_slug = p_lesson;
  end if;

  select p.lesson_at, p.review_at, p.lab_at
    into v_lesson, v_review, v_lab
  from public.class_lesson_progress p
  where p.band = p_band
    and p.section = p_section
    and p.lesson_slug = p_lesson;

  if v_lesson is null and v_review is null and v_lab is null then
    delete from public.class_lesson_progress p
    where p.band = p_band
      and p.section = p_section
      and p.lesson_slug = p_lesson;
  end if;

  band := p_band;
  section := p_section;
  lesson_slug := p_lesson;
  lesson := v_lesson is not null;
  review := v_review is not null;
  lab := v_lab is not null;
  return next;
end;
$fn$;

revoke all on function public.teacher_progress(text) from public;
revoke all on function public.teacher_set_progress(text, text, text, text, text, boolean) from public;

grant execute on function public.teacher_progress(text) to anon, authenticated;
grant execute on function public.teacher_set_progress(text, text, text, text, text, boolean) to anon, authenticated;
