/**
 * Curated school-safe English words spelled strictly with the musical
 * alphabet (A, B, C, D, E, F, G), grouped by character length (3–7).
 *
 * Includes all nine reference worksheet words:
 * beef, edged, bed, bead, feed, caged, faded, cafe, begged.
 */

export type WordLength = 3 | 4 | 5 | 6 | 7;

export const WORKSHEET_WORDS = [
  "beef",
  "edged",
  "bed",
  "bead",
  "feed",
  "caged",
  "faded",
  "cafe",
  "begged",
] as const;

export const WORDS_BY_LENGTH: Record<WordLength, readonly string[]> = {
  3: [
    "ace",
    "add",
    "age",
    "baa",
    "bad",
    "bag",
    "bed",
    "bee",
    "beg",
    "cab",
    "cad",
    "cee",
    "dab",
    "dad",
    "dee",
    "def",
    "ebb",
    "egg",
    "fab",
    "fad",
    "fed",
    "fee",
    "gab",
    "gad",
    "gag",
    "gee",
  ],
  4: [
    "abba",
    "abed",
    "aced",
    "aged",
    "baba",
    "babe",
    "bade",
    "bead",
    "beef",
    "cade",
    "cafe",
    "caff",
    "cage",
    "cede",
    "dace",
    "dada",
    "dead",
    "deaf",
    "deed",
    "edge",
    "egad",
    "face",
    "fade",
    "faff",
    "feed",
    "gaff",
    "gaga",
    "gage",
  ],
  5: [
    "adage",
    "added",
    "badge",
    "bedad",
    "begad",
    "cadge",
    "caged",
    "ceded",
    "decaf",
    "ebbed",
    "edged",
    "egged",
    "faced",
    "faded",
    "fadge",
    "gadge",
    "gaffe",
    "gaged",
  ],
  6: [
    "accede",
    "badged",
    "bagged",
    "beaded",
    "bedded",
    "beefed",
    "begged",
    "cabbed",
    "cadged",
    "dabbed",
    "decade",
    "deeded",
    "deface",
    "efface",
    "facade",
    "gabbed",
    "gadded",
    "gaffed",
  ],
  7: [
    "acceded",
    "baggage",
    "cabbage",
    "debadge",
    "defaced",
    "effaced",
    "feedbag",
  ],
};

export const ALL_WORDS: readonly string[] = [
  ...WORDS_BY_LENGTH[3],
  ...WORDS_BY_LENGTH[4],
  ...WORDS_BY_LENGTH[5],
  ...WORDS_BY_LENGTH[6],
  ...WORDS_BY_LENGTH[7],
];

const STAFF_WORD_RE = /^[a-g]{3,7}$/;

export function isValidStaffWord(word: string): boolean {
  return STAFF_WORD_RE.test(word.toLowerCase());
}
