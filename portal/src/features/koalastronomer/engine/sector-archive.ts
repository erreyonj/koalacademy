import { isDestinationUnlocked } from "./atlas-engine";
import type {
  Difficulty,
  GameState,
  RecordSet,
  TelescopeDestination,
  WordChallenge,
} from "./game-state";
import { isCalibrationShort } from "./telescope-engine";

export const RECORD_SETS_BY_DIFFICULTY: Readonly<
  Record<Difficulty, readonly RecordSet[]>
> = {
  easy: ["primary", "backup-1", "backup-2"],
  medium: ["primary", "backup-1", "backup-2"],
  hard: ["primary", "backup-1"],
};

/**
 * The sector whose records the Archive serves: the sector under observation if
 * it is still uncharted, otherwise the first unlocked uncharted sector. Once
 * every sector is charted, the final sector stays selected for review.
 */
export function getArchiveSector(
  state: GameState,
  destinations: readonly TelescopeDestination[],
): TelescopeDestination {
  const isOpen = (dest: TelescopeDestination) =>
    !state.completedDestinationIds.includes(dest.id) &&
    isDestinationUnlocked(dest, state.completedDestinationIds);

  const current = destinations.find(
    (d) => d.id === state.currentDestinationId,
  );
  if (current && isOpen(current)) return current;

  return destinations.find(isOpen) ?? destinations[destinations.length - 1];
}

/** Records that exist on this difficulty (Hard adds its bonus records). */
export function getDifficultyChallenges(
  challenges: readonly WordChallenge[],
  difficulty: Difficulty,
): WordChallenge[] {
  return challenges.filter((c) => !c.hardOnly || difficulty === "hard");
}

/**
 * Records playable right now for the Archive sector. The primary set is always
 * shown. A backup set the difficulty allows only opens once the previous set is
 * fully recovered and Calibration still can't fund the next ring; once any of
 * its records is recovered it stays open.
 */
export function getAvailableChallenges(
  state: GameState,
  challenges: readonly WordChallenge[],
  destinations: readonly TelescopeDestination[],
): WordChallenge[] {
  const sector = getArchiveSector(state, destinations);
  const sectorChallenges = getDifficultyChallenges(
    challenges,
    state.difficulty,
  ).filter((c) => c.destinationId === sector.id);
  const isDone = (c: WordChallenge) =>
    state.completedChallengeIds.includes(c.id);
  const short = isCalibrationShort(state, destinations);

  const visible: WordChallenge[] = [];
  let previousComplete = true;
  for (const set of RECORD_SETS_BY_DIFFICULTY[state.difficulty]) {
    const setChallenges = sectorChallenges.filter((c) => c.set === set);
    const opened =
      set === "primary" ||
      setChallenges.some(isDone) ||
      (previousComplete && short);
    if (!opened) break;
    visible.push(...setChallenges);
    previousComplete = setChallenges.every(isDone);
  }
  return visible;
}

/**
 * Records counted toward progress: every primary record plus any backup record
 * that is open or already recovered.
 */
export function getRecordTotal(
  state: GameState,
  challenges: readonly WordChallenge[],
  available: readonly WordChallenge[],
): number {
  const availableIds = new Set(available.map((c) => c.id));
  return getDifficultyChallenges(challenges, state.difficulty).filter(
    (c) =>
      c.set === "primary" ||
      availableIds.has(c.id) ||
      state.completedChallengeIds.includes(c.id),
  ).length;
}

/**
 * Hard-mode soft lock: the sector's primary and backup records are all
 * recovered, a sector is still uncharted, and Calibration can't fund the
 * cheapest unsolved ring left in any unlocked sector. Easy and Medium can't
 * soft lock (failed traces are free, and two backup sets cover shortfalls).
 */
export function isGameOver(
  state: GameState,
  destinations: readonly TelescopeDestination[],
  challenges: readonly WordChallenge[],
): boolean {
  if (state.difficulty !== "hard") return false;
  if (state.currentScreen === "intro") return false;
  const archiveExhausted = getAvailableChallenges(
    state,
    challenges,
    destinations,
  ).every((c) => state.completedChallengeIds.includes(c.id));
  return archiveExhausted && isCalibrationShort(state, destinations);
}
