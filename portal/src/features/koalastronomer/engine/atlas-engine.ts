import type { GameState, TelescopeDestination } from "./game-state";

/**
 * Check if a destination is unlocked based on completion requirements.
 */
export function isDestinationUnlocked(
  destination: TelescopeDestination,
  completedDestinationIds: readonly string[],
): boolean {
  if (destination.requiredCompletedDestinations.length === 0) {
    return true;
  }

  return destination.requiredCompletedDestinations.every((id) =>
    completedDestinationIds.includes(id),
  );
}

/**
 * Get all currently unlocked and incomplete destinations.
 */
export function getAvailableDestinations(
  destinations: readonly TelescopeDestination[],
  state: GameState,
): TelescopeDestination[] {
  return destinations.filter(
    (dest) =>
      !state.completedDestinationIds.includes(dest.id) &&
      isDestinationUnlocked(dest, state.completedDestinationIds),
  );
}

/**
 * Get map regions that have been revealed.
 */
export function getRevealedRegions(
  destinations: readonly TelescopeDestination[],
  completedDestinationIds: readonly string[],
): string[] {
  return destinations
    .filter((dest) => completedDestinationIds.includes(dest.id))
    .map((dest) => dest.mapRevealRegion);
}
