-- Teacher edit and delete for glossary terms. Reads stay open; writes stay passphrase-gated.

create or replace function public.glossary_update_term(
  p_code text,
  p_id uuid,
  p_term text,
  p_definition text
)
returns table (
  id uuid,
  lesson_code text,
  term text,
  definition text,
  "position" integer
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_code text;
  v_term text;
  v_definition text;
begin
  perform teacher_private.check_code(p_code);

  v_term := pg_catalog.btrim(coalesce(p_term, ''));
  v_definition := pg_catalog.btrim(coalesce(p_definition, ''));

  if v_term = '' or v_definition = ''
     or pg_catalog.char_length(v_term) > 80
     or pg_catalog.char_length(v_definition) > 400 then
    raise exception 'invalid_term' using errcode = '22023';
  end if;

  select g.lesson_code
    into v_code
  from public.glossary_terms as g
  where g.id = p_id;

  if v_code is null then
    raise exception 'missing_term' using errcode = '02000';
  end if;

  if exists (
    select 1
    from public.glossary_terms as g
    where g.lesson_code = v_code
      and g.id <> p_id
      and pg_catalog.lower(g.term) = pg_catalog.lower(v_term)
  ) then
    raise exception 'duplicate_term' using errcode = '23505';
  end if;

  update public.glossary_terms as g
  set term = v_term,
      definition = v_definition
  where g.id = p_id;

  return query
  select g.id, g.lesson_code, g.term, g.definition, g."position"
  from public.glossary_terms as g
  where g.id = p_id;
end;
$fn$;

revoke all on function public.glossary_update_term(text, uuid, text, text) from public;
grant execute on function public.glossary_update_term(text, uuid, text, text) to anon, authenticated;

create or replace function public.glossary_delete_term(
  p_code text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_deleted uuid;
begin
  perform teacher_private.check_code(p_code);

  delete from public.glossary_terms as g
  where g.id = p_id
  returning g.id into v_deleted;

  if v_deleted is null then
    raise exception 'missing_term' using errcode = '02000';
  end if;
end;
$fn$;

revoke all on function public.glossary_delete_term(text, uuid) from public;
grant execute on function public.glossary_delete_term(text, uuid) to anon, authenticated;
