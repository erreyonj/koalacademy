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
  /**
   * K-2 and 3-5 run without student 1:1 devices ("unplugged"); 6-8 runs the
   * Koalacademy production course on 1:1 iPads ("production"). 3-5 stays
   * "unplugged" even though it ports Koalacademy lessons, because its Koala
   * work is teacher-led rather than a device in every hand.
   */
  track: "unplugged" | "production";
  blurb: string;
}

export const BANDS: readonly Band[] = [
  {
    id: "k-2",
    label: "Grades K–2",
    short: "K–2",
    track: "unplugged",
    blurb: "Strands and the Quaver framework. Games, movement, and voice, teacher-projected.",
  },
  {
    id: "3-5",
    label: "Grades 3–5",
    short: "3–5",
    track: "unplugged",
    blurb: "Koalacademy lessons, ported down. Teacher-led lab and a keyboard station, no 1:1 devices.",
  },
  {
    id: "6-8",
    label: "Grades 6–8",
    short: "6–8",
    track: "production",
    blurb: "Koalacademy production on 1:1 iPads. Theory in service of making.",
  },
];

/** Extra watching that sits beside a lesson. Skills search reads this; Investigate owns the product later. */
export interface InvestigateLink {
  title: string;
  url: string;
}

/**
 * Frontmatter as authored in content/lessons/*.mdx.
 *
 * `bands` is a list so a lesson can appear under more than one WI DPI band
 * without being copied. Most lessons belong to exactly one of K–2, 3–5, or 6–8.
 *
 * `skills` are stable lowercase ids (spaces allowed). Treat the string as the
 * key — a later progress table will use the same values.
 */
export interface LessonFrontmatter {
  code: string;
  title: string;
  focus: string;
  bands: BandId[];
  /**
   * When this slide was authored (`YYYY-MM-DD`). Band lists sort by this
   * (oldest first, newest last). Intros (`sequence: 0`) stay first regardless.
   */
  created: string;
  /**
   * Same-day order inside a band after `created`. 0 is the intro. A new lesson
   * takes max(sequence)+1 — never the KOALACADEMY lesson number (BMT.2 is not 2).
   */
  sequence: number;
  /** 6-8 only: Koalacademy unit number and component name. */
  unit?: number;
  component?: string;
  /** K-5 only: the strand this session belongs to. */
  strand?: Strand;
  /** Topic tags. Empty when the lesson has not been tagged yet. */
  skills: string[];
  investigate: InvestigateLink[];
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
