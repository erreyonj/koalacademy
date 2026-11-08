import type { Difficulty, GameState, WordChallenge } from "./game-state";
import {
  calculateInterval,
  isValidNoteLetter,
  type NoteLetter,
} from "./intervals";

export type WordValidationError =
  | "first-letter-wrong"
  | "second-letter-wrong"
  | null;

export interface WordValidationResult {
  valid: boolean;
  firstNote: NoteLetter | null;
  secondNote: NoteLetter | null;
  intervalValue: number | null;
  error: WordValidationError;
}

/**
 * Return the Calibration reward for a word challenge on the given difficulty:
 * - Easy & Medium: 1x intervalValue (65 total across 16 records)
 * - Hard: 2x intervalValue (130 total across 16 records to fund 8-11 line Hard figures)
 */
export function getChallengeReward(
  intervalValue: number,
  difficulty: Difficulty = "easy",
): number {
  return difficulty === "hard" ? intervalValue * 2 : intervalValue;
}

/**
 * Validate user's letter selections against the answer word.
 */
export function validateWordChallenge(
  challenge: WordChallenge,
  firstGuess: NoteLetter,
  secondGuess: NoteLetter,
): WordValidationResult {
  const [pos1, pos2] = challenge.missingPositions;
  const correctFirst = challenge.answer[pos1]?.toUpperCase() ?? "";
  const correctSecond = challenge.answer[pos2]?.toUpperCase() ?? "";

  if (!isValidNoteLetter(correctFirst) || !isValidNoteLetter(correctSecond)) {
    throw new Error(
      `Challenge ${challenge.id} has non-note missing positions: ${correctFirst}, ${correctSecond}`,
    );
  }

  if (firstGuess !== correctFirst) {
    return {
      valid: false,
      firstNote: null,
      secondNote: null,
      intervalValue: null,
      error: "first-letter-wrong",
    };
  }

  if (secondGuess !== correctSecond) {
    return {
      valid: false,
      firstNote: null,
      secondNote: null,
      intervalValue: null,
      error: "second-letter-wrong",
    };
  }

  const intervalValue = calculateInterval(firstGuess, secondGuess);

  return {
    valid: true,
    firstNote: firstGuess,
    secondNote: secondGuess,
    intervalValue,
    error: null,
  };
}

/**
 * Complete a challenge and award calibration points once (scaled by difficulty).
 */
export function completeChallenge(
  state: GameState,
  challengeId: string,
  intervalValue: number,
): GameState {
  if (state.completedChallengeIds.includes(challengeId)) {
    return state;
  }

  const reward = getChallengeReward(intervalValue, state.difficulty);

  return {
    ...state,
    calibrationPoints: state.calibrationPoints + reward,
    completedChallengeIds: [...state.completedChallengeIds, challengeId],
  };
}
