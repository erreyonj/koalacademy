import type { BandId } from "@/lib/types";
import { isCohort, type Cohort } from "@/features/behavior/types";
import {
  TEACHER_SECTIONS,
  sectionBand,
  type TeacherSection,
} from "@/features/teacher-progress/types";

/**
 * Classes — one homeroom launch page per cohort.
 *
 * A class id is the shared cohort / section code (`kg`, `3g`, `7b`) plus
 * `scholars`. Scholars has a marble bucket but no lesson-progress section;
 * 6–8 has lesson progress but no bucket yet (their "Class Points" land later).
 */
export interface ClassEntry {
  id: ClassId;
  /** Short pad label, e.g. "3G". */
  label: string;
  /** Long name for headings and screen readers, e.g. "3rd Gold". */
  name: string;
  band: BandId;
  /** Behavior cohort when this class has a marble bucket. */
  marbleCohort: Cohort | null;
  /** Teacher-progress section when this class tracks lessons. */
  section: TeacherSection | null;
  /** "marbles" for Scholars + K–5, "points" for 6–8. */
  unit: "marbles" | "points";
}

export const CLASS_IDS = ["scholars", ...TEACHER_SECTIONS] as const;

export type ClassId = (typeof CLASS_IDS)[number];

const GRADE_WORD: Record<string, string> = {
  k: "Kindergarten",
  "1": "1st",
  "2": "2nd",
  "3": "3rd",
  "4": "4th",
  "5": "5th",
  "6": "6th",
  "7": "7th",
  "8": "8th",
};

function sectionEntry(section: TeacherSection): ClassEntry {
  const grade = section[0];
  const house = section[1] === "g" ? "Gold" : "Blue";
  const band = sectionBand(section);
  return {
    id: section,
    label: section.toUpperCase(),
    name: `${GRADE_WORD[grade]} ${house}`,
    band,
    marbleCohort: isCohort(section) ? section : null,
    section,
    unit: band === "6-8" ? "points" : "marbles",
  };
}

export const CLASSES: readonly ClassEntry[] = [
  {
    id: "scholars",
    label: "Scholars",
    name: "Scholars",
    band: "k-2",
    marbleCohort: "scholars",
    section: null,
    unit: "marbles",
  },
  ...TEACHER_SECTIONS.map(sectionEntry),
];

export function isClassId(value: string): value is ClassId {
  return (CLASS_IDS as readonly string[]).includes(value);
}

export function getClass(id: string): ClassEntry | undefined {
  return CLASSES.find((entry) => entry.id === id);
}

/** Classes grouped by band, in grade order, for the index page. */
export function classesByBand(): { band: BandId; classes: ClassEntry[] }[] {
  const order: BandId[] = ["k-2", "3-5", "6-8"];
  return order.map((band) => ({
    band,
    classes: CLASSES.filter((entry) => entry.band === band),
  }));
}
