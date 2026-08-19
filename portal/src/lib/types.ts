/** Grade bands a lesson can appear under. One index page is generated per band. */
export const BAND_IDS = ["k-1", "2-3", "4-5", "6", "7", "8"] as const;

export type BandId = (typeof BAND_IDS)[number];

/** K-5 strand codes. See curriculum/k-8-pilot/scope-and-sequence.md. */
export const STRANDS = [
  "BEAT",
  "PITCH",
  "TIMBRE",
  "FORM",
  "NOTATE",
  "LISTEN",
  "CREATE",
] as const;

export type Strand = (typeof STRANDS)[number];

export interface Band {
  id: BandId;
  /** Display label, e.g. "Grades 2-3". */
  label: string;
  /** Short label for the header pad. */
  short: string;
  /** K-5 is unplugged-first; 6-8 runs the Koalacademy production course. */
  track: "unplugged" | "production";
  blurb: string;
}

export const BANDS: readonly Band[] = [
  {
    id: "k-1",
    label: "Kindergarten + Grade 1",
    short: "K–1",
    track: "unplugged",
    blurb: "Games, movement, and voice. Teacher-projected.",
  },
  {
    id: "2-3",
    label: "Grades 2 + 3",
    short: "2–3",
    track: "unplugged",
    blurb: "Strand work with the first written correctives.",
  },
  {
    id: "4-5",
    label: "Grades 4 + 5",
    short: "4–5",
    track: "unplugged",
    blurb: "Notation, form, and the run-up to Koalacademy.",
  },
  {
    id: "6",
    label: "Grade 6",
    short: "6",
    track: "production",
    blurb: "Koalacademy, first pass. Theory in service of making.",
  },
  {
    id: "7",
    label: "Grade 7",
    short: "7",
    track: "production",
    blurb: "Koalacademy with deeper sampling and drum design.",
  },
  {
    id: "8",
    label: "Grade 8",
    short: "8",
    track: "production",
    blurb: "Koalacademy at full depth, ending in a live performance.",
  },
];

/**
 * Frontmatter as authored in content/lessons/*.mdx.
 *
 * `bands` is a list because grades 6-8 share one Koalacademy spine — the same
 * lesson appears on three index pages rather than being copied three times.
 */
export interface LessonFrontmatter {
  code: string;
  title: string;
  focus: string;
  bands: BandId[];
  /** Position within a band's running order. Drives prev/next. */
  sequence: number;
  /** 6-8 only: Koalacademy unit number and component name. */
  unit?: number;
  component?: string;
  /** K-5 only: the strand this session belongs to. */
  strand?: Strand;
}

export interface Lesson extends LessonFrontmatter {
  /** Filename without extension; also the URL segment. */
  slug: string;
}

/** A lesson plus its neighbours within one band's running order. */
export interface LessonWithNeighbours {
  lesson: Lesson;
  band: Band;
  prev: Lesson | null;
  next: Lesson | null;
}
