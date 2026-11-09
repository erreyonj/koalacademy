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
 * Atlas label: charted sectors show the identified body. The New Body stays
 * unnamed because it is still an unknown world.
 */
export function getAtlasLabel(
  destination: TelescopeDestination,
  isCompleted: boolean,
): string {
  if (!isCompleted || destination.id === "the-new-body") {
    return destination.name;
  }
  return destination.revealName;
}

/** True once every Atlas sector has been charted. */
export function isCampaignWon(
  completedDestinationIds: readonly string[],
  destinations: readonly TelescopeDestination[],
): boolean {
  return (
    destinations.length > 0 &&
    destinations.every((dest) => completedDestinationIds.includes(dest.id))
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
