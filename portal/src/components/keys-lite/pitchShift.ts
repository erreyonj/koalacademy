import { Note } from "tonal";

/** Move a pitch by whole octaves (negative = down). */
export function shiftOctave(note: string, octaves: number): string {
  const midi = Note.midi(note);
  if (midi == null) return note;
  return Note.fromMidi(midi + 12 * octaves) ?? note;
}

export function shiftPitches(pitches: string[], octaves: number): string[] {
  return pitches.map((pitch) => shiftOctave(pitch, octaves));
}
