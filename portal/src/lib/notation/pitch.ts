import type { Clef } from "./types";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;

/** Top staff line (line 0) as a natural letter + octave. */
const CLEF_LINE0: Record<Clef, { letter: (typeof LETTERS)[number]; octave: number }> = {
  treble: { letter: "F", octave: 5 },
  bass: { letter: "A", octave: 3 },
};

const LINE_MIN = -3.5;
const LINE_MAX = 7.5;

export function snapStaffLine(line: number): number {
  const snapped = Math.round(line * 2) / 2;
  return Math.max(LINE_MIN, Math.min(LINE_MAX, snapped));
}

/** Map a VexFlow staff line (0 = top line) to a natural pitch like "B4". */
export function pitchFromStaffLine(clef: Clef, line: number): string {
  const snapped = snapStaffLine(line);
  const stepsDown = Math.round(snapped * 2);
  const start = CLEF_LINE0[clef];
  const startIdx = LETTERS.indexOf(start.letter);
  const idx = startIdx - stepsDown;
  const letterIdx = ((idx % 7) + 7) % 7;
  const octave = start.octave + Math.floor(idx / 7);
  return `${LETTERS[letterIdx]}${octave}`;
}
