-- Course glossary. Anyone can read. Inserts go through the teacher passphrase.

create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  lesson_code text not null,
  term text not null,
  definition text not null,
  position integer not null,
  check (char_length(btrim(lesson_code)) between 1 and 40),
  check (char_length(btrim(term)) between 1 and 80),
  check (char_length(btrim(definition)) between 1 and 400),
  check (position > 0)
);

create unique index glossary_terms_lesson_term_key
  on public.glossary_terms (lesson_code, lower(term));

create index glossary_terms_lesson_position_idx
  on public.glossary_terms (lesson_code, position);

alter table public.glossary_terms enable row level security;

revoke all on table public.glossary_terms from public, anon, authenticated;
grant select on table public.glossary_terms to anon, authenticated;

create policy "glossary terms are readable"
  on public.glossary_terms
  for select
  to anon, authenticated
  using (true);

create or replace function public.glossary_add_term(
  p_code text,
  p_lesson_code text,
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
  v_position integer;
  v_id uuid;
begin
  perform teacher_private.check_code(p_code);

  v_code := pg_catalog.btrim(coalesce(p_lesson_code, ''));
  v_term := pg_catalog.btrim(coalesce(p_term, ''));
  v_definition := pg_catalog.btrim(coalesce(p_definition, ''));

  if v_term = '' or v_definition = ''
     or pg_catalog.char_length(v_term) > 80
     or pg_catalog.char_length(v_definition) > 400 then
    raise exception 'invalid_term' using errcode = '22023';
  end if;

  if v_code = ''
     or v_code ~* '(^|[-.])k2($|[-.])'
     or v_code !~ '^[A-Za-z0-9][A-Za-z0-9./-]{0,39}$' then
    raise exception 'invalid_lesson' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.glossary_terms as g
    where g.lesson_code = v_code
      and pg_catalog.lower(g.term) = pg_catalog.lower(v_term)
  ) then
    raise exception 'duplicate_term' using errcode = '23505';
  end if;

  select pg_catalog.coalesce(pg_catalog.max(g."position"), 0) + 1
    into v_position
  from public.glossary_terms as g
  where g.lesson_code = v_code;

  insert into public.glossary_terms as g (lesson_code, term, definition, "position")
  values (v_code, v_term, v_definition, v_position)
  returning g.id into v_id;

  return query
  select g.id, g.lesson_code, g.term, g.definition, g."position"
  from public.glossary_terms as g
  where g.id = v_id;
end;
$fn$;

revoke all on function public.glossary_add_term(text, text, text, text) from public;
grant execute on function public.glossary_add_term(text, text, text, text) to anon, authenticated;

insert into public.glossary_terms (lesson_code, term, definition, "position")
values
  ('KSN.1', 'Waveform', 'Visual representation of sound.', 1),
  ('KSN.1', 'Sampler', 'Lets you play a sound like an instrument.', 2),
  ('KSN.1', 'Koala Sampler', 'Mobile sampler DAW.', 3),
  ('KSN.1', 'DAW', 'Digital Audio Workstation.', 4),
  ('KSN.1', 'Sample Tab', 'Holds samples and sample banks.', 5),
  ('KSN.1', 'Sequence Tab', 'Holds Sequences and arrangements.', 6),
  ('KSN.1', 'Perform Tab', 'Holds FX (effects) and other Functions.', 7),
  ('KSN.1', 'Volume Knob', 'Controls volume of a sample.', 8),
  ('KSN.1', 'Pitch Knob', 'Controls pitch of a sample.', 9),
  ('KSN.1', 'Pan', 'Controls left and right placement of sample.', 10),
  ('KSN.1', 'Amplitude', 'Volume range of a sound.', 11),
  ('KSN.2', 'Tempo', 'Controls the speed of music.', 1),
  ('KSN.2', 'Undo', 'Undoes last action.', 2),
  ('KSN.2', 'Solo', 'Isolates a sample or sound.', 3),
  ('KSN.2', 'Mute', 'Turns off a sample.', 4),
  ('KSN.2', 'Bar/Measure', 'A single unit of music.', 5),
  ('KSN.2', 'Transport', 'Play, record, tempo, quantize functions and more.', 6),
  ('INTRO-68', 'CREW', 'Class in a circle, where everyone can be seen.', 1),
  ('INTRO-68', 'Community commitments', 'The code for improving yourself, your relationships, and your community.', 2),
  ('INTRO-68', 'Vanguard Song', 'An anchor recording the class returns to all year.', 3),
  ('INTRO-68', 'Primary', 'The Vanguard Song a grade goes deepest on.', 4),
  ('INTRO-68', 'Companion', 'The younger-grade version of a Primary song.', 5),
  ('INTRO-68', 'Popular music', 'The songs most people hear, and the choices behind what gets played.', 6),
  ('BMT.1', 'Natural notes', 'The seven letter names, A B C D E F G.', 1),
  ('BMT.1', 'Scale', 'Notes in a pattern of whole steps and half steps.', 2),
  ('BMT.1', 'Whole step', 'The wider step between two notes.', 3),
  ('BMT.1', 'Half step', 'The closest step between two notes.', 4),
  ('BMT.1', 'Major', 'The bright pattern. C major is the white keys from C.', 5),
  ('BMT.1', 'Minor', 'The heavier pattern. A minor uses the same notes as C major, starting on A.', 6),
  ('BMT.1', 'Octave', 'The same note name, once higher or lower.', 7),
  ('BMT.2', 'Pentatonic', 'A five-note scale.', 1),
  ('BMT.2', 'Blues scale', 'Minor pentatonic plus the flat five. Six notes.', 2),
  ('BMT.2', 'Blue note', 'The flat five, the note that makes a line sound like blues.', 3),
  ('BMT.2', 'Mode', 'A scale that starts on a different step of the same notes.', 4),
  ('BMT.2', 'Dorian', 'Natural minor with a raised sixth. Still minor, less heavy.', 5),
  ('BMT.2', 'Phrygian', 'Natural minor with a lowered second. The half step sits right above the home note.', 6),
  ('BMT.3', 'Key', 'The set of notes a song treats as home.', 1),
  ('BMT.3', 'Relative keys', 'Same notes, different home. C major and A minor.', 2),
  ('BMT.3', 'Parallel keys', 'Same home, different mood. C major and C minor.', 3),
  ('BMT.4', 'Staff', 'The five lines music is written on.', 1),
  ('BMT.4', 'Clef', 'The symbol that names the lines.', 2),
  ('BMT.4', 'Time signature', 'How many beats are in a bar, and which note gets one beat.', 3),
  ('BMT.4', 'Key signature', 'The sharps or flats for the whole piece. C major leaves it blank.', 4),
  ('BMT.4', 'Quarter note', 'One beat in 4/4.', 5),
  ('BMT.4', 'Rest', 'A measured silence.', 6),
  ('BMT.4', 'Pulse', 'The steady count under the feel.', 7),
  ('BMT.5', '3/4', 'Three beats in a bar, a lilt.', 1),
  ('BMT.5', '6/8', 'Six pulses in a bar, grouped in threes.', 2),
  ('BMT.5', 'Kick', 'The low drum that marks the strong beat.', 3),
  ('BMT.5', 'Snare', 'The snap, often on 2 and 4 in 4/4.', 4),
  ('BMT.5', 'Hi-hat', 'The steady ticks that keep time.', 5),
  ('BMT.5', 'Tom', 'The drum for fills and transitions.', 6),
  ('KSN.4', 'Step sequencer', 'A grid of pads across time.', 1),
  ('KSN.4', 'Drum machine view', 'Rows are pads, for hits.', 2),
  ('KSN.4', 'Piano roll', 'Rows are pitches, for a melody.', 3),
  ('KSN.4', 'Pencil', 'Draws one hit.', 4),
  ('KSN.4', 'Snap', 'Pulls a note onto the grid. SNAP FREE leaves it off.', 5),
  ('KSN.4', 'Velocity', 'How hard a hit is played.', 6),
  ('KSN.4', 'Probability', 'The chance a hit plays. 100% always, 0% never.', 7),
  ('KSN.4', 'Bar length', 'How many bars the pattern is.', 8),
  ('KSN.5', 'Hamburger menu', 'Koala''s file and settings menu.', 1),
  ('KSN.5', 'Save', 'Keeps the project inside Koala.', 2),
  ('KSN.5', 'Export', 'Makes a file the class folder can see.', 3),
  ('KSN.5', 'Import', 'Brings audio or video onto a pad.', 4),
  ('KSN.5', 'Settings', 'The EXTRAS switches for what the pads show.', 5),
  ('US.1', 'Sampling', 'Using a piece of an existing recording in something new.', 1),
  ('US.1', 'Interpolation', 'Replaying the idea yourself instead of using the recording.', 2),
  ('US.1', 'Break', 'The drum-heavy section DJs looped.', 3),
  ('US.1', 'Dub', 'Treating the studio as an instrument — echo, space, stripping a mix down.', 4),
  ('US.1', 'MPC', 'The pad sampler (MIDI Production Center) Koala comes from.', 5),
  ('US.1', 'Source', 'The original recording a sample comes from.', 6),
  ('US.2', 'Chop', 'Cutting a sample into pieces and reordering them.', 1),
  ('US.2', 'Foundation sample', 'One sample the whole track is built on.', 2),
  ('US.2', 'Loop', 'Repeating a short piece so it becomes the groove.', 3),
  ('US.3', 'Vocal sample', 'A piece of a sung or spoken recording used as an instrument.', 1),
  ('US.3', 'Pitch shift', 'Moving a sample up or down so the voice sounds different.', 2),
  ('US.3', 'Signature sound', 'A production choice listeners start to recognize as one artist''s.', 3),
  ('US.4', 'Composition', 'The song as written.', 1),
  ('US.4', 'Performance', 'Someone''s recording of it.', 2),
  ('US.4', 'Cover', 'A new performance of someone else''s song.', 3),
  ('US.4', 'Chain of ownership', 'Who wrote it, who performed it, who sampled it, and who gets named.', 4),
  ('US.4', 'Credit', 'Naming the people whose work you used.', 5),
  ('US.4', 'Unlicensed', 'Used without permission.', 6),
  ('US.5', 'Derivative sampling', 'Sampling material you made yourself.', 1),
  ('US.5', 'Origin', 'Who made a sound first.', 2),
  ('US.5', 'Reach', 'How far a sound travels once it leaves the song.', 3),
  ('US.5', 'Attribution', 'Saying where a sound came from.', 4),
  ('US.5', 'Stinger', 'A short piece of audio that marks a moment, as in a podcast.', 5);
