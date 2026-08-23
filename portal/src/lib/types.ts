/** Grade bands a lesson can appear under. One index page is generated per band. */
export const BAND_IDS = ["k-2", "3-5", "6-8"] as const;

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
  /** Display label, e.g. "Grades 3–5". */
  label: string;
  /** Short label for the header pad. */
  short: string;
  /** K-5 is unplugged-first; 6-8 runs the Koalacademy production course. */
  track: "unplugged" | "production";
  blurb: string;
}

export const BANDS: readonly Band[] = [
  {
    id: "k-2",
    label: "Grades K–2",
    short: "K–2",
    track: "unplugged",
    blurb: "Games, movement, and voice. Teacher-projected.",
  },
  {
    id: "3-5",
    label: "Grades 3–5",
    short: "3–5",
    track: "unplugged",
    blurb: "Strand work, notation, and the run-up to Koalacademy.",
  },
  {
    id: "6-8",
    label: "Grades 6–8",
    short: "6–8",
    track: "production",
    blurb: "Koalacademy production. Theory in service of making.",
  },
];

/**
 * Frontmatter as authored in content/lessons/*.mdx.
 *
 * `bands` is a list so a lesson can appear under more than one WI DPI band
 * without being copied. Most lessons belong to exactly one of K–2, 3–5, or 6–8.
 */
export interface LessonFrontmatter {
  code: string;
  title: string;
  focus: string;
  bands: BandId[];
  /** Band list order: 0 is the intro, each new lesson takes the next integer. Newest last. Also drives prev/next. */
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
