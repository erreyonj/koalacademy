import { isDestinationUnlocked } from "./atlas-engine";
import type {
  Difficulty,
  GameState,
  RecordSet,
  TelescopeDestination,
  WordChallenge,
} from "./game-state";

export const RECORD_SETS_BY_DIFFICULTY: Readonly<
  Record<Difficulty, readonly RecordSet[]>
> = {
  easy: ["primary", "backup-1", "backup-2"],
  medium: ["primary", "backup-1"],
  hard: ["primary"],
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

/**
 * Records playable right now for the Archive sector. The primary set is always
 * shown; each backup set the difficulty allows appears once the previous set
 * is fully recovered.
 */
export function getAvailableChallenges(
  state: GameState,
  challenges: readonly WordChallenge[],
  destinations: readonly TelescopeDestination[],
): WordChallenge[] {
  const sector = getArchiveSector(state, destinations);
  const sectorChallenges = challenges.filter(
    (c) => c.destinationId === sector.id,
  );
  const isDone = (c: WordChallenge) =>
    state.completedChallengeIds.includes(c.id);

  const visible: WordChallenge[] = [];
  for (const set of RECORD_SETS_BY_DIFFICULTY[state.difficulty]) {
    const setChallenges = sectorChallenges.filter((c) => c.set === set);
    visible.push(...setChallenges);
    if (!setChallenges.every(isDone)) break;
  }
  return visible;
}

/** Every record the difficulty can ever reach across all sectors. */
export function getRecordTotalForDifficulty(
  challenges: readonly WordChallenge[],
  difficulty: Difficulty,
): number {
  const sets = RECORD_SETS_BY_DIFFICULTY[difficulty];
  return challenges.filter((c) => sets.includes(c.set)).length;
}
