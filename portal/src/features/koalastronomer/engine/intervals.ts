export type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export const NOTE_SEQUENCE: readonly NoteLetter[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
];

/**
 * Calculate ascending diatonic interval number (1-7)
 * from starting note to ending note, wrapping from G to A.
 *
 * Examples:
 *   A -> A = 1 (unison)
 *   A -> B = 2 (second)
 *   A -> E = 5 (fifth)
 *   E -> C = 6 (sixth, wrapping E->F->G->A->B->C)
 *   G -> D = 5 (fifth, wrapping G->A->B->C->D)
 */
export function calculateInterval(
  startNote: NoteLetter,
  endNote: NoteLetter,
): number {
  const startIdx = NOTE_SEQUENCE.indexOf(startNote);
  const endIdx = NOTE_SEQUENCE.indexOf(endNote);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Invalid note letter: ${startNote} or ${endNote}`);
  }

  let distance = endIdx - startIdx;
  if (distance < 0) {
    distance += NOTE_SEQUENCE.length;
  }

  return distance + 1;
}

export function isValidNoteLetter(char: string): char is NoteLetter {
  return NOTE_SEQUENCE.includes(char as NoteLetter);
}

/**
 * Step a note letter along the A-G bearing ring (modulo 7).
 */
export function stepNoteLetter(letter: NoteLetter, delta: number): NoteLetter {
  const idx = NOTE_SEQUENCE.indexOf(letter);
  const nextIdx =
    (((idx + delta) % NOTE_SEQUENCE.length) + NOTE_SEQUENCE.length) %
    NOTE_SEQUENCE.length;
  return NOTE_SEQUENCE[nextIdx];
}

/**
 * Return the scientific pitch pair for an interval so the second note always
 * sounds ascending (or unison) relative to the first.
 *
 * The piano synth orders octaves from C to B (C4 < D4 < ... < B4 < C5),
 * whereas the musical alphabet in this game is A..G. We compute the
 * semitone height of each note in octave 4 and bump the second note to
 * octave 5 whenever its octave-4 pitch would sit below the first note.
 */
const SEMITONE_FROM_C: Record<NoteLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function ascendingIntervalPitches(
  firstNote: NoteLetter,
  secondNote: NoteLetter,
): [string, string] {
  const firstSemitone = SEMITONE_FROM_C[firstNote];
  const secondSemitone = SEMITONE_FROM_C[secondNote];
  const secondOctave = secondSemitone < firstSemitone ? 5 : 4;
  return [`${firstNote}4`, `${secondNote}${secondOctave}`];
}
