import type { WordChallenge } from "../engine/game-state";
import {
  calculateInterval,
  isValidNoteLetter,
  type NoteLetter,
} from "../engine/intervals";

/**
 * 16 curated A–G word challenges (all characters strictly A–G),
 * including all nine Staff DeCode reference words.
 */
export const WORD_CHALLENGES: readonly WordChallenge[] = [
  {
    id: "beef-1",
    title: "Record 01 · Taurus Supply",
    answer: "BEEF",
    missingPositions: [0, 3], // B -> F = 5th
    difficulty: "easy",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "Four-letter provision logged under the Bull constellation.",
  },
  {
    id: "bed-1",
    title: "Record 02 · Base Cradle",
    answer: "BED",
    missingPositions: [0, 2], // B -> D = 3rd
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Three-letter resting mount where the brass tube settles.",
  },
  {
    id: "bead-1",
    title: "Record 03 · Baily's Drop",
    answer: "BEAD",
    missingPositions: [0, 3], // B -> D = 3rd
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "A tiny pearl of sunlight glimpsed at the lunar limb.",
  },
  {
    id: "cafe-1",
    title: "Record 04 · Night Watch",
    answer: "CAFE",
    missingPositions: [0, 3], // C -> E = 3rd
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Warm canteen stop for late-shift astronomers.",
  },
  {
    id: "feed-1",
    title: "Record 05 · Signal Relay",
    answer: "FEED",
    missingPositions: [0, 3], // F -> D = 6th
    difficulty: "easy",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "Continuous stream of telemetry from the dome receiver.",
  },
  {
    id: "badge-1",
    title: "Record 06 · Guild Crest",
    answer: "BADGE",
    missingPositions: [1, 4], // A -> E = 5th
    difficulty: "easy",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "Five-letter emblem worn on the observatory cloak.",
  },
  {
    id: "added-1",
    title: "Record 07 · Star Tally",
    answer: "ADDED",
    missingPositions: [0, 4], // A -> D = 4th
    difficulty: "easy",
    intervalValue: 4,
    category: "Celestial Designation",
    hint: "Summed into the ledger when a new body is cataloged.",
  },
  {
    id: "edged-1",
    title: "Record 08 · Bevel Lens",
    answer: "EDGED",
    missingPositions: [0, 2], // E -> G = 3rd
    difficulty: "medium",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Ground with a sharp rim around the glass mirror.",
  },
  {
    id: "caged-1",
    title: "Record 09 · Lantern Frame",
    answer: "CAGED",
    missingPositions: [0, 4], // C -> D = 2nd
    difficulty: "medium",
    intervalValue: 2,
    category: "Celestial Designation",
    hint: "Enclosed in brass ribs to protect the warm desk flame.",
  },
  {
    id: "faded-1",
    title: "Record 10 · Dim Nebula",
    answer: "FADED",
    missingPositions: [0, 4], // F -> D = 6th
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "Grew faint on the parchment after centuries in the vault.",
  },
  {
    id: "facade-1",
    title: "Record 11 · Dome Front",
    answer: "FACADE",
    missingPositions: [1, 3], // A -> A = 1st (unison)
    difficulty: "medium",
    intervalValue: 1,
    category: "Celestial Designation",
    hint: "The outer stone face of the observatory building.",
  },
  {
    id: "decade-1",
    title: "Record 12 · Ten-Orbit Span",
    answer: "DECADE",
    missingPositions: [0, 2], // D -> C = 7th
    difficulty: "medium",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "Ten full Earth years of nightly sky logs.",
  },
  {
    id: "cabbage-1",
    title: "Record 13 · Rosette Leaf",
    answer: "CABBAGE",
    missingPositions: [1, 5], // A -> G = 7th
    difficulty: "medium",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "Seven-letter leafy garden staple stored in the cellar.",
  },
  {
    id: "begged-1",
    title: "Record 14 · Clear-Sky Plea",
    answer: "BEGGED",
    missingPositions: [0, 5], // B -> D = 3rd
    difficulty: "hard",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Asked earnestly for the clouds to part before midnight.",
  },
  {
    id: "defaced-1",
    title: "Record 15 · Scratched Plate",
    answer: "DEFACED",
    missingPositions: [0, 5], // D -> E = 2nd
    difficulty: "hard",
    intervalValue: 2,
    category: "Celestial Designation",
    hint: "Marred on the surface so the original inscription blurred.",
  },
  {
    id: "accede-1",
    title: "Record 16 · Council Accord",
    answer: "ACCEDE",
    missingPositions: [0, 5], // A -> E = 5th
    difficulty: "hard",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "Formally agree to open the upper shutter at dusk.",
  },
];

export function validateChallengeDefinition(challenge: WordChallenge): boolean {
  const [pos1, pos2] = challenge.missingPositions;
  if (
    pos1 < 0 ||
    pos2 < 0 ||
    pos1 >= challenge.answer.length ||
    pos2 >= challenge.answer.length ||
    pos1 >= pos2
  ) {
    return false;
  }

  for (const ch of challenge.answer.toUpperCase()) {
    if (!isValidNoteLetter(ch)) {
      return false;
    }
  }

  const letter1 = challenge.answer[pos1].toUpperCase() as NoteLetter;
  const letter2 = challenge.answer[pos2].toUpperCase() as NoteLetter;
  const calculatedInterval = calculateInterval(letter1, letter2);

  return calculatedInterval === challenge.intervalValue;
}
