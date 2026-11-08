import type { Difficulty, GameState, WordChallenge } from "./game-state";
import {
  calculateInterval,
  isValidNoteLetter,
  type NoteLetter,
} from "./intervals";

export interface IntervalStep {
  from: NoteLetter;
  to: NoteLetter;
  interval: number;
}

export interface WordValidationResult {
  valid: boolean;
  /** Index of the first wrong bearing, or null when every bearing is right. */
  wrongIndex: number | null;
  notes: NoteLetter[];
  steps: IntervalStep[];
  total: number;
}

export function getBlanks(
  challenge: WordChallenge,
  difficulty: Difficulty,
): readonly number[] {
  return challenge.blanks[difficulty];
}

/** The notes hidden behind a record's blanks on the given difficulty. */
export function getBlankNotes(
  challenge: WordChallenge,
  difficulty: Difficulty,
): NoteLetter[] {
  return getBlanks(challenge, difficulty).map((pos) => {
    const letter = challenge.answer[pos]?.toUpperCase() ?? "";
    if (!isValidNoteLetter(letter)) {
      throw new Error(
        `Challenge ${challenge.id} has a non-note blank at ${pos}: ${letter}`,
      );
    }
    return letter;
  });
}

/** Ascending interval for each consecutive pair of notes. */
export function getIntervalSteps(notes: readonly NoteLetter[]): IntervalStep[] {
  const steps: IntervalStep[] = [];
  for (let i = 0; i < notes.length - 1; i += 1) {
    steps.push({
      from: notes[i],
      to: notes[i + 1],
      interval: calculateInterval(notes[i], notes[i + 1]),
    });
  }
  return steps;
}

/** Sum of ascending intervals across consecutive notes (A D E -> 4 + 2 = 6). */
export function getCumulativeInterval(notes: readonly NoteLetter[]): number {
  return getIntervalSteps(notes).reduce((sum, step) => sum + step.interval, 0);
}

/** Calibration a record pays on the given difficulty. */
export function getChallengeReward(
  challenge: WordChallenge,
  difficulty: Difficulty,
): number {
  return getCumulativeInterval(getBlankNotes(challenge, difficulty));
}

/**
 * Validate the player's bearings, left to right, against the record's blanks.
 */
export function validateWordChallenge(
  challenge: WordChallenge,
  difficulty: Difficulty,
  guesses: readonly NoteLetter[],
): WordValidationResult {
  const notes = getBlankNotes(challenge, difficulty);
  const wrongIndex = notes.findIndex((note, i) => guesses[i] !== note);

  if (wrongIndex !== -1) {
    return { valid: false, wrongIndex, notes: [], steps: [], total: 0 };
  }

  const steps = getIntervalSteps(notes);
  return {
    valid: true,
    wrongIndex: null,
    notes,
    steps,
    total: steps.reduce((sum, step) => sum + step.interval, 0),
  };
}

/**
 * Complete a challenge and award its Calibration once.
 */
export function completeChallenge(
  state: GameState,
  challengeId: string,
  reward: number,
): GameState {
  if (state.completedChallengeIds.includes(challengeId)) {
    return state;
  }

  return {
    ...state,
    calibrationPoints: state.calibrationPoints + reward,
    completedChallengeIds: [...state.completedChallengeIds, challengeId],
  };
}
