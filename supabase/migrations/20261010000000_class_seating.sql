-- Homeroom seating charts, teacher-code gated like marble counts.
--
-- Seat assignments leave the public portal bundle. The room layout (tables
-- and slot counts) stays in portal code; this table only stores who sits
-- where. 6–8 join behavior_students so a homeroom roster exists for them
-- even before Class Points buckets do.

alter table public.behavior_students
  drop constraint if exists behavior_students_cohort_check;

alter table public.behavior_students
  add constraint behavior_students_cohort_check check (cohort in (
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

create table public.class_seating (
  class_id text primary key check (class_id in (
    'scholars',
    'kg', 'kb',
    '1g', '1b',
    '2g', '2b',
    '3g', '3b',
    '4g', '4b',
    '5g', '5b',
    '6g', '6b',
    '7g', '7b',
    '8g', '8b'
  )),
  -- Keys are "table:side:index" (e.g. left:left:1); values are student uuids.
  seats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.class_seating enable row level security;

revoke all on table public.class_seating from public, anon, authenticated;

create or replace function public.class_seating_get(p_code text, p_class text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_seats jsonb;
begin
  perform teacher_private.check_code(p_code);

  if p_class not in (
    'scholars',
    'kg', 'kb', '1g', '1b', '2g', '2b', '3g', '3b',
    '4g', '4b', '5g', '5b', '6g', '6b', '7g', '7b', '8g', '8b'
  ) then
    raise exception 'invalid_class' using errcode = '22023';
  end if;

  select s.seats into v_seats
  from public.class_seating s
  where s.class_id = p_class;

  return jsonb_build_object(
    'seats', coalesce(v_seats, '{}'::jsonb),
    'students', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'first_name', st.first_name,
          'preferred_name', st.preferred_name
        )
        order by coalesce(st.preferred_name, st.first_name)
      )
      from public.behavior_students st
      where st.active
        and st.cohort = p_class
    ), '[]'::jsonb)
  );
end;
$fn$;

create or replace function public.class_seating_set(
  p_code text,
  p_class text,
  p_seats jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_key text;
  v_id uuid;
  v_seen uuid[] := '{}';
begin
  perform teacher_private.check_code(p_code);

  if p_class not in (
    'scholars',
    'kg', 'kb', '1g', '1b', '2g', '2b', '3g', '3b',
    '4g', '4b', '5g', '5b', '6g', '6b', '7g', '7b', '8g', '8b'
  ) then
    raise exception 'invalid_class' using errcode = '22023';
  end if;

  if p_seats is null or jsonb_typeof(p_seats) is distinct from 'object' then
    raise exception 'invalid_seats' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_seats)
  loop
    if v_key !~ '^(left|middle|back|right):(top|right|bottom|left):[0-3]$' then
      raise exception 'invalid_seat' using errcode = '22023';
    end if;

    begin
      v_id := (p_seats ->> v_key)::uuid;
    exception
      when invalid_text_representation then
        raise exception 'invalid_student' using errcode = '22023';
    end;

    if v_id = any (v_seen) then
      raise exception 'duplicate_student' using errcode = '22023';
    end if;
    v_seen := v_seen || v_id;

    if not exists (
      select 1
      from public.behavior_students st
      where st.id = v_id
        and st.active
        and st.cohort = p_class
    ) then
      raise exception 'unknown_student' using errcode = '22023';
    end if;
  end loop;

  insert into public.class_seating (class_id, seats, updated_at)
  values (p_class, p_seats, pg_catalog.now())
  on conflict (class_id) do update
    set seats = excluded.seats,
        updated_at = pg_catalog.now();
end;
$fn$;

revoke all on function public.class_seating_get(text, text) from public;
revoke all on function public.class_seating_set(text, text, jsonb) from public;

grant execute on function public.class_seating_get(text, text) to anon, authenticated;
grant execute on function public.class_seating_set(text, text, jsonb) to anon, authenticated;

-- 3G chart from /rosters/3g-homeroom-seating. Chart nicknames map to roster
-- first names (Emmy → Emery, Ari → Augustus). No-ops when 3G is not imported.
insert into public.class_seating (class_id, seats)
select '3g', jsonb_object_agg(m.seat, s.id::text)
from (
  values
    ('left:top:0', 'Russell'),
    ('left:bottom:0', 'Yara'),
    ('left:left:1', 'Ameela'),
    ('left:left:2', 'Iveyah'),
    ('left:left:3', 'Emery'),
    ('middle:left:0', 'Majesty'),
    ('middle:right:0', 'Augustus'),
    ('middle:bottom:0', 'Naliyah'),
    ('middle:bottom:1', 'Leo'),
    ('back:left:0', 'Torrion'),
    ('back:bottom:0', 'Kalel'),
    ('right:right:0', 'Ella'),
    ('right:right:1', 'Jhenea'),
    ('right:right:2', 'Teagan'),
    ('right:right:3', 'Atalyah'),
    ('right:bottom:0', 'Dai'' Vion')
) as m(seat, first_name)
join public.behavior_students s
  on s.cohort = '3g'
 and s.active
 and s.first_name = m.first_name
having count(s.id) > 0
on conflict (class_id) do nothing;
