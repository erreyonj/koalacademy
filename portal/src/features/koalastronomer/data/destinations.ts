import type { TelescopeDestination } from "../engine/game-state";

/**
 * Hand-authored telescope destinations aligned to the Atlas mockup:
 * Mercury Sector -> Outer Belt -> Distant Region -> The New Body.
 *
 * Verified shortest solutions:
 * - Mercury Sector: 7 moves (budget 10)
 * - Outer Belt: 4 moves (budget 12)
 * - Distant Region: 5 moves (budget 15)
 * - The New Body: 4 moves (budget 18)
 */
export const DESTINATIONS: readonly TelescopeDestination[] = [
  {
    id: "mercury-sector",
    name: "Mercury Sector",
    description:
      "The closest observable sector along the inner rim. A reliable baseline for calibrating the brass optics.",
    startingConfiguration: { range: 0, focus: 0, alignment: 0 },
    targetConfiguration: { range: 2, focus: 1, alignment: 3 },
    movementBudget: 10,
    requiredCompletedDestinations: [],
    mapRevealRegion: "mercury-sector",
  },
  {
    id: "outer-belt",
    name: "Outer Belt",
    description: "A band of smaller bodies beyond the inner planets.",
    startingConfiguration: { range: 1, focus: 2, alignment: 1 },
    targetConfiguration: { range: 4, focus: 5, alignment: 2 },
    movementBudget: 12,
    requiredCompletedDestinations: ["mercury-sector"],
    mapRevealRegion: "outer-belt",
  },
  {
    id: "distant-region",
    name: "Distant Region",
    description:
      "Faint outer constellations requiring careful focal alignment across the deep dome.",
    startingConfiguration: { range: 2, focus: 3, alignment: 4 },
    targetConfiguration: { range: 6, focus: 1, alignment: 0 },
    movementBudget: 15,
    requiredCompletedDestinations: ["mercury-sector", "outer-belt"],
    mapRevealRegion: "distant-region",
  },
  {
    id: "the-new-body",
    name: "The New Body",
    description:
      "An uncharted celestial body on the far horizon. The final piece of the observatory chart.",
    startingConfiguration: { range: 0, focus: 0, alignment: 0 },
    targetConfiguration: { range: 3, focus: 3, alignment: 3 },
    movementBudget: 18,
    requiredCompletedDestinations: [
      "mercury-sector",
      "outer-belt",
      "distant-region",
    ],
    mapRevealRegion: "the-new-body",
  },
];
