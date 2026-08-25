import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  BANDS,
  BAND_IDS,
  type Band,
  type BandId,
  type InvestigateLink,
  type Lesson,
  type LessonWithNeighbours,
} from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "lessons");

function isBandId(value: unknown): value is BandId {
  return typeof value === "string" && (BAND_IDS as readonly string[]).includes(value);
}

function parseSkills(slug: string, value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${slug}.mdx: skills must be a list of strings.`);
  }
  return value
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function parseInvestigate(slug: string, value: unknown): InvestigateLink[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${slug}.mdx: investigate must be a list of { title, url }.`);
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`${slug}.mdx: investigate[${index}] must be an object.`);
    }
    const { title, url } = item as Record<string, unknown>;
    if (typeof title !== "string" || typeof url !== "string") {
      throw new Error(`${slug}.mdx: investigate[${index}] needs title and url strings.`);
    }
    return { title, url };
  });
}

function parseFrontmatter(slug: string, data: Record<string, unknown>): Lesson {
  const { code, title, focus, bands, sequence, unit, component, strand, skills, investigate } =
    data;

  if (typeof code !== "string" || typeof title !== "string" || typeof focus !== "string") {
    throw new Error(`${slug}.mdx: code, title, and focus are required strings.`);
  }
  if (!Array.isArray(bands) || bands.length === 0 || !bands.every(isBandId)) {
    throw new Error(
      `${slug}.mdx: bands must list at least one of ${BAND_IDS.join(", ")}.`
    );
  }
  if (typeof sequence !== "number") {
    throw new Error(`${slug}.mdx: sequence must be a number.`);
  }

  return {
    slug,
    code,
    title,
    focus,
    bands,
    sequence,
    unit: typeof unit === "number" ? unit : undefined,
    component: typeof component === "string" ? component : undefined,
    strand: strand as Lesson["strand"],
    skills: parseSkills(slug, skills),
    investigate: parseInvestigate(slug, investigate),
  };
}

/** Intro first (low sequence), newest last. Code is the tiebreaker inside a band. */
function compareLessons(a: Lesson, b: Lesson): number {
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Every lesson in content/lessons, sorted intro → newest.
 *
 * Reads the filesystem, so this only ever runs at build time — the site is
 * statically exported and ships no server.
 */
export function getAllLessons(): Lesson[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data } = matter(source);
      return parseFrontmatter(slug, data as Record<string, unknown>);
    })
    .sort(compareLessons);
}

export function getBand(id: string): Band | undefined {
  return BANDS.find((band) => band.id === id);
}

export function getLessonsForBand(bandId: BandId): Lesson[] {
  return getAllLessons()
    .filter((lesson) => lesson.bands.includes(bandId))
    .sort(compareLessons);
}

export function getLesson(slug: string): Lesson | undefined {
  return getAllLessons().find((lesson) => lesson.slug === slug);
}

/**
 * Prev/next follow the band list (sequence ascending). A new lesson takes the
 * next integer — do not renumber older ones to splice it in.
 */
export function getLessonWithNeighbours(slug: string): LessonWithNeighbours | undefined {
  const lesson = getLesson(slug);
  if (!lesson) return undefined;

  const band = getBand(lesson.bands[0]);
  if (!band) return undefined;

  const running = getLessonsForBand(band.id);
  const index = running.findIndex((item) => item.slug === slug);

  return {
    lesson,
    band,
    prev: index > 0 ? running[index - 1] : null,
    next: index >= 0 && index < running.length - 1 ? running[index + 1] : null,
  };
}

/** Human label for the bands a lesson belongs to, e.g. "Grades 6-8". */
export function bandsLabel(bands: BandId[]): string {
  const ordered = BANDS.filter((band) => bands.includes(band.id));
  if (ordered.length === 0) return "";
  if (ordered.length === 1) return ordered[0].label;
  return `Grades ${ordered[0].short}–${ordered[ordered.length - 1].short}`;
}

export { BANDS };
