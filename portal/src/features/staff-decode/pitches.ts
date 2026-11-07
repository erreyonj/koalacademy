export type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type PitchId =
  | "A3"
  | "B3"
  | "C4"
  | "D4"
  | "E4"
  | "F4"
  | "G4"
  | "A4"
  | "B4"
  | "C5"
  | "D5"
  | "E5"
  | "F5"
  | "G5"
  | "A5"
  | "B5"
  | "C6";

export type NoteDuration = "16" | "8" | "q" | "h" | "w";

export type Difficulty = "easy" | "medium" | "hard";

export interface PitchStop {
  id: PitchId;
  letter: NoteLetter;
  octave: 3 | 4 | 5 | 6;
  /**
   * Diatonic staff steps from bottom treble line E4 (E4 = 0, F4 = 1, ... F5 = 8).
   * Even steps sit on a line (or ledger line); odd steps sit in a space.
   */
  staffStep: number;
  /** Letter with Unicode octave subscript, e.g. "E₄". */
  subscriptLabel: string;
}

const SUBSCRIPT_DIGITS: Record<3 | 4 | 5 | 6, string> = {
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
};

function makeStop(
  id: PitchId,
  letter: NoteLetter,
  octave: 3 | 4 | 5 | 6,
  staffStep: number,
): PitchStop {
  return {
    id,
    letter,
    octave,
    staffStep,
    subscriptLabel: `${letter}${SUBSCRIPT_DIGITS[octave]}`,
  };
}

/**
 * Full treble range used on Hard: A3 (two ledger lines below) through C6
 * (two ledger lines above), ordered low to high.
 */
export const HARD_PITCH_STOPS: readonly PitchStop[] = [
  makeStop("A3", "A", 3, -4),
  makeStop("B3", "B", 3, -3),
  makeStop("C4", "C", 4, -2),
  makeStop("D4", "D", 4, -1),
  makeStop("E4", "E", 4, 0),
  makeStop("F4", "F", 4, 1),
  makeStop("G4", "G", 4, 2),
  makeStop("A4", "A", 4, 3),
  makeStop("B4", "B", 4, 4),
  makeStop("C5", "C", 5, 5),
  makeStop("D5", "D", 5, 6),
  makeStop("E5", "E", 5, 7),
  makeStop("F5", "F", 5, 8),
  makeStop("G5", "G", 5, 9),
  makeStop("A5", "A", 5, 10),
  makeStop("B5", "B", 5, 11),
  makeStop("C6", "C", 6, 12),
];

/**
 * Staff-only treble range used on Easy and Medium: E4 (bottom line) through
 * F5 (top line), 9 stops total.
 */
export const STANDARD_PITCH_STOPS: readonly PitchStop[] = HARD_PITCH_STOPS.filter(
  (stop) => stop.staffStep >= 0 && stop.staffStep <= 8,
);

export const PITCH_STOP_BY_ID: Readonly<Record<PitchId, PitchStop>> =
  HARD_PITCH_STOPS.reduce(
    (acc, stop) => {
      acc[stop.id] = stop;
      return acc;
    },
    {} as Record<PitchId, PitchStop>,
  );

export const EASY_MEDIUM_DURATIONS: readonly NoteDuration[] = ["8", "q"];

export const HARD_DURATIONS: readonly NoteDuration[] = ["16", "q", "h", "w"];

export const DURATION_LABELS: Readonly<Record<NoteDuration, string>> = {
  "16": "Sixteenth note",
  "8": "Eighth note",
  q: "Quarter note",
  h: "Half note",
  w: "Whole note",
};

export const DURATION_SHORT_LABELS: Readonly<Record<NoteDuration, string>> = {
  "16": "16th",
  "8": "8th",
  q: "Quarter",
  h: "Half",
  w: "Whole",
};

export function pitchesForDifficulty(
  difficulty: Difficulty,
): readonly PitchStop[] {
  return difficulty === "hard" ? HARD_PITCH_STOPS : STANDARD_PITCH_STOPS;
}

export function durationsForDifficulty(
  difficulty: Difficulty,
): readonly NoteDuration[] {
  return difficulty === "hard" ? HARD_DURATIONS : EASY_MEDIUM_DURATIONS;
}

/**
 * Returns the staff steps where horizontal ledger lines must be drawn for a
 * given note step (E4 = 0, F5 = 8).
 */
export function ledgerStepsFor(staffStep: number): number[] {
  const steps: number[] = [];
  if (staffStep <= -2) {
    for (let s = -2; s >= staffStep; s -= 2) {
      steps.push(s);
    }
  } else if (staffStep >= 10) {
    for (let s = 10; s <= staffStep; s += 2) {
      steps.push(s);
    }
  }
  return steps;
}

/**
 * Standard stem rule: notes below the middle line B4 (staffStep 4) have stems
 * pointing up; notes on or above B4 have stems pointing down.
 */
export function stemDirectionFor(staffStep: number): "up" | "down" {
  return staffStep < 4 ? "up" : "down";
}
