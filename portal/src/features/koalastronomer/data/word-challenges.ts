import type { WordChallenge } from "../engine/game-state";
import {
  calculateInterval,
  isValidNoteLetter,
  type NoteLetter,
} from "../engine/intervals";

/**
 * Sector word banks: each sector has a primary set sized to cover its Easy
 * calibration (Hard pays 2x), plus two backup sets that unlock in order once
 * the previous set is finished without charting the sector. Easy may use both
 * backups, Medium one, Hard none.
 *
 * Primary interval totals: Mercury 15, Outer Belt 16, Distant Region 17,
 * The New Body 18.
 */
export const WORD_CHALLENGES: readonly WordChallenge[] = [
  {
    id: "beef-1",
    destinationId: "mercury-sector",
    set: "primary",
    title: "Record 01 · Taurus Supply",
    answer: "BEEF",
    missingPositions: [0, 3], // B -> F = 5
    difficulty: "easy",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "Four-letter provision logged under the Bull constellation.",
  },
  {
    id: "bed-1",
    destinationId: "mercury-sector",
    set: "primary",
    title: "Record 02 · Base Cradle",
    answer: "BED",
    missingPositions: [0, 2], // B -> D = 3
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Three-letter resting mount where the brass tube settles.",
  },
  {
    id: "cafe-1",
    destinationId: "mercury-sector",
    set: "primary",
    title: "Record 03 · Night Watch",
    answer: "CAFE",
    missingPositions: [0, 3], // C -> E = 3
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Warm canteen stop for late-shift astronomers.",
  },
  {
    id: "added-1",
    destinationId: "mercury-sector",
    set: "primary",
    title: "Record 04 · Star Tally",
    answer: "ADDED",
    missingPositions: [0, 4], // A -> D = 4
    difficulty: "easy",
    intervalValue: 4,
    category: "Celestial Designation",
    hint: "Summed into the ledger when a new body is cataloged.",
  },
  {
    id: "ace-1",
    destinationId: "mercury-sector",
    set: "backup-1",
    title: "Record 05 · Lead Observer",
    answer: "ACE",
    missingPositions: [0, 2], // A -> E = 5
    difficulty: "medium",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "The sharpest eye on the night crew.",
  },
  {
    id: "bag-1",
    destinationId: "mercury-sector",
    set: "backup-1",
    title: "Record 06 · Field Kit",
    answer: "BAG",
    missingPositions: [0, 2], // B -> G = 6
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "Carries star charts and a red-light torch.",
  },
  {
    id: "fed-1",
    destinationId: "mercury-sector",
    set: "backup-1",
    title: "Record 07 · Lens Polish",
    answer: "FED",
    missingPositions: [0, 2], // F -> D = 6
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "How the eager apprentice kept the logbook: well-___ with notes.",
  },
  {
    id: "egg-1",
    destinationId: "mercury-sector",
    set: "backup-2",
    title: "Record 08 · Oval Orbit",
    answer: "EGG",
    missingPositions: [0, 2], // E -> G = 3
    difficulty: "medium",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Shape some say a stretched orbit looks like.",
  },
  {
    id: "dab-1",
    destinationId: "mercury-sector",
    set: "backup-2",
    title: "Record 09 · Ink Blot",
    answer: "DAB",
    missingPositions: [0, 2], // D -> B = 6
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "A tiny touch of ink to mark a star.",
  },
  {
    id: "fee-1",
    destinationId: "mercury-sector",
    set: "backup-2",
    title: "Record 10 · Dome Pass",
    answer: "FEE",
    missingPositions: [0, 2], // F -> E = 7
    difficulty: "medium",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "What the public pays for a telescope night.",
  },
  {
    id: "badge-1",
    destinationId: "outer-belt",
    set: "primary",
    title: "Record 11 · Guild Crest",
    answer: "BADGE",
    missingPositions: [1, 4], // A -> E = 5
    difficulty: "easy",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "Five-letter emblem worn on the observatory cloak.",
  },
  {
    id: "feed-1",
    destinationId: "outer-belt",
    set: "primary",
    title: "Record 12 · Signal Relay",
    answer: "FEED",
    missingPositions: [0, 3], // F -> D = 6
    difficulty: "easy",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "Continuous stream of telemetry from the dome receiver.",
  },
  {
    id: "bead-1",
    destinationId: "outer-belt",
    set: "primary",
    title: "Record 13 · Baily's Drop",
    answer: "BEAD",
    missingPositions: [0, 3], // B -> D = 3
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "A tiny pearl of sunlight glimpsed at the lunar limb.",
  },
  {
    id: "caged-1",
    destinationId: "outer-belt",
    set: "primary",
    title: "Record 14 · Lantern Frame",
    answer: "CAGED",
    missingPositions: [0, 4], // C -> D = 2
    difficulty: "easy",
    intervalValue: 2,
    category: "Celestial Designation",
    hint: "Enclosed in brass ribs to protect the warm desk flame.",
  },
  {
    id: "cage-1",
    destinationId: "outer-belt",
    set: "backup-1",
    title: "Record 15 · Rock Trap",
    answer: "CAGE",
    missingPositions: [0, 2], // C -> G = 5
    difficulty: "medium",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "What a planet's gravity can feel like to a passing asteroid.",
  },
  {
    id: "face-1",
    destinationId: "outer-belt",
    set: "backup-1",
    title: "Record 16 · Crater Side",
    answer: "FACE",
    missingPositions: [0, 3], // F -> E = 7
    difficulty: "medium",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "The Moon always shows Earth the same one.",
  },
  {
    id: "deaf-1",
    destinationId: "outer-belt",
    set: "backup-1",
    title: "Record 17 · Silent Space",
    answer: "DEAF",
    missingPositions: [0, 3], // D -> F = 3
    difficulty: "medium",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Space is silent, so even loud explosions leave you this.",
  },
  {
    id: "gab-1",
    destinationId: "outer-belt",
    set: "backup-2",
    title: "Record 18 · Radio Chatter",
    answer: "GAB",
    missingPositions: [0, 2], // G -> B = 3
    difficulty: "medium",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Idle talk over the observatory radio.",
  },
  {
    id: "fad-1",
    destinationId: "outer-belt",
    set: "backup-2",
    title: "Record 19 · Passing Trend",
    answer: "FAD",
    missingPositions: [0, 2], // F -> D = 6
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "A craze that fades faster than a meteor.",
  },
  {
    id: "ebb-1",
    destinationId: "outer-belt",
    set: "backup-2",
    title: "Record 20 · Low Tide",
    answer: "EBB",
    missingPositions: [0, 1], // E -> B = 5
    difficulty: "medium",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "The Moon's pull makes ocean tides flow and ___.",
  },
  {
    id: "faded-1",
    destinationId: "distant-region",
    set: "primary",
    title: "Record 21 · Dim Nebula",
    answer: "FADED",
    missingPositions: [0, 4], // F -> D = 6
    difficulty: "easy",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "Grew faint on the parchment after centuries in the vault.",
  },
  {
    id: "decade-1",
    destinationId: "distant-region",
    set: "primary",
    title: "Record 22 · Ten-Orbit Span",
    answer: "DECADE",
    missingPositions: [0, 2], // D -> C = 7
    difficulty: "easy",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "Ten full Earth years of nightly sky logs.",
  },
  {
    id: "edged-1",
    destinationId: "distant-region",
    set: "primary",
    title: "Record 23 · Bevel Lens",
    answer: "EDGED",
    missingPositions: [0, 2], // E -> G = 3
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Ground with a sharp rim around the glass mirror.",
  },
  {
    id: "facade-1",
    destinationId: "distant-region",
    set: "primary",
    title: "Record 24 · Dome Front",
    answer: "FACADE",
    missingPositions: [1, 3], // A -> A = 1
    difficulty: "easy",
    intervalValue: 1,
    category: "Celestial Designation",
    hint: "The outer stone face of the observatory building.",
  },
  {
    id: "fade-1",
    destinationId: "distant-region",
    set: "backup-1",
    title: "Record 25 · Dusk Sky",
    answer: "FADE",
    missingPositions: [0, 3], // F -> E = 7
    difficulty: "medium",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "What daylight does as the first stars appear.",
  },
  {
    id: "deed-1",
    destinationId: "distant-region",
    set: "backup-1",
    title: "Record 26 · Charter Scroll",
    answer: "DEED",
    missingPositions: [0, 1], // D -> E = 2
    difficulty: "medium",
    intervalValue: 2,
    category: "Celestial Designation",
    hint: "The document granting the observatory its hilltop.",
  },
  {
    id: "bade-1",
    destinationId: "distant-region",
    set: "backup-1",
    title: "Record 27 · Last Order",
    answer: "BADE",
    missingPositions: [0, 3], // B -> E = 4
    difficulty: "medium",
    intervalValue: 4,
    category: "Celestial Designation",
    hint: "The director ___ the crew to open the shutter.",
  },
  {
    id: "adage-1",
    destinationId: "distant-region",
    set: "backup-2",
    title: "Record 28 · Old Saying",
    answer: "ADAGE",
    missingPositions: [0, 4], // A -> E = 5
    difficulty: "medium",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "“Clear skies, steady hands” is an observatory ___.",
  },
  {
    id: "cede-1",
    destinationId: "distant-region",
    set: "backup-2",
    title: "Record 29 · Yield Orbit",
    answer: "CEDE",
    missingPositions: [0, 2], // C -> D = 2
    difficulty: "medium",
    intervalValue: 2,
    category: "Celestial Designation",
    hint: "To give up ground, as Pluto did its planet title.",
  },
  {
    id: "gaffe-1",
    destinationId: "distant-region",
    set: "backup-2",
    title: "Record 30 · Slip-Up",
    answer: "GAFFE",
    missingPositions: [0, 4], // G -> E = 6
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "An awkward mistake, like pointing the scope at the Sun.",
  },
  {
    id: "cabbage-1",
    destinationId: "the-new-body",
    set: "primary",
    title: "Record 31 · Rosette Leaf",
    answer: "CABBAGE",
    missingPositions: [1, 5], // A -> G = 7
    difficulty: "easy",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "Seven-letter leafy garden staple stored in the cellar.",
  },
  {
    id: "begged-1",
    destinationId: "the-new-body",
    set: "primary",
    title: "Record 32 · Clear-Sky Plea",
    answer: "BEGGED",
    missingPositions: [0, 5], // B -> D = 3
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Asked earnestly for the clouds to part before midnight.",
  },
  {
    id: "accede-1",
    destinationId: "the-new-body",
    set: "primary",
    title: "Record 33 · Council Accord",
    answer: "ACCEDE",
    missingPositions: [0, 5], // A -> E = 5
    difficulty: "easy",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "Formally agree to open the upper shutter at dusk.",
  },
  {
    id: "defaced-1",
    destinationId: "the-new-body",
    set: "primary",
    title: "Record 34 · Scratched Plate",
    answer: "DEFACED",
    missingPositions: [0, 2], // D -> F = 3
    difficulty: "easy",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "Marred on the surface so the original inscription blurred.",
  },
  {
    id: "beaded-1",
    destinationId: "the-new-body",
    set: "backup-1",
    title: "Record 35 · Dew Drops",
    answer: "BEADED",
    missingPositions: [0, 5], // B -> D = 3
    difficulty: "medium",
    intervalValue: 3,
    category: "Celestial Designation",
    hint: "How the cold lens looked, covered in tiny water drops.",
  },
  {
    id: "ebbed-1",
    destinationId: "the-new-body",
    set: "backup-1",
    title: "Record 36 · Waning Light",
    answer: "EBBED",
    missingPositions: [0, 4], // E -> D = 7
    difficulty: "medium",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "The comet's glow slowly ___ away.",
  },
  {
    id: "bagged-1",
    destinationId: "the-new-body",
    set: "backup-1",
    title: "Record 37 · Sample Kit",
    answer: "BAGGED",
    missingPositions: [0, 2], // B -> G = 6
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "Meteorite fragments, labeled and ___ for the lab.",
  },
  {
    id: "deface-1",
    destinationId: "the-new-body",
    set: "backup-2",
    title: "Record 38 · Graffiti Ban",
    answer: "DEFACE",
    missingPositions: [0, 5], // D -> E = 2
    difficulty: "medium",
    intervalValue: 2,
    category: "Celestial Designation",
    hint: "Never ___ the observatory's star maps.",
  },
  {
    id: "baggage-1",
    destinationId: "the-new-body",
    set: "backup-2",
    title: "Record 39 · Cargo Hold",
    answer: "BAGGAGE",
    missingPositions: [0, 2], // B -> G = 6
    difficulty: "medium",
    intervalValue: 6,
    category: "Celestial Designation",
    hint: "Everything packed for the long trip to the far dome.",
  },
  {
    id: "effaced-1",
    destinationId: "the-new-body",
    set: "backup-2",
    title: "Record 40 · Worn Away",
    answer: "EFFACED",
    missingPositions: [0, 6], // E -> D = 7
    difficulty: "medium",
    intervalValue: 7,
    category: "Celestial Designation",
    hint: "Erased by time, like old craters smoothed by lava.",
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
