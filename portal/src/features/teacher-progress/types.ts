import type { BandId } from "@/lib/types";

export const TEACHER_SECTIONS = [
  "kg",
  "kb",
  "1g",
  "1b",
  "2g",
  "2b",
  "3g",
  "3b",
  "4g",
  "4b",
  "5g",
  "5b",
  "6g",
  "6b",
  "7g",
  "7b",
  "8g",
  "8b",
] as const;

export type TeacherSection = (typeof TEACHER_SECTIONS)[number];

export const SECTION_LABEL: Record<TeacherSection, string> = {
  kg: "K Gold",
  kb: "K Blue",
  "1g": "1 Gold",
  "1b": "1 Blue",
  "2g": "2 Gold",
  "2b": "2 Blue",
  "3g": "3 Gold",
  "3b": "3 Blue",
  "4g": "4 Gold",
  "4b": "4 Blue",
  "5g": "5 Gold",
  "5b": "5 Blue",
  "6g": "6 Gold",
  "6b": "6 Blue",
  "7g": "7 Gold",
  "7b": "7 Blue",
  "8g": "8 Gold",
  "8b": "8 Blue",
};

export const BAND_GRADES = {
  "k-2": ["k", "1", "2"],
  "3-5": ["3", "4", "5"],
  "6-8": ["6", "7", "8"],
} as const;

export type TeacherGrade = (typeof BAND_GRADES)[BandId][number];

export const BAND_SECTIONS: Record<BandId, readonly TeacherSection[]> = {
  "k-2": ["kg", "kb", "1g", "1b", "2g", "2b"],
  "3-5": ["3g", "3b", "4g", "4b", "5g", "5b"],
  "6-8": ["6g", "6b", "7g", "7b", "8g", "8b"],
};

export const BAND_DEFAULT_SECTION: Record<BandId, TeacherSection> = {
  "k-2": "kg",
  "3-5": "3g",
  "6-8": "6g",
};

export const BAND_GRADE_COLS: Record<
  BandId,
  readonly { label: string; gold: TeacherSection; blue: TeacherSection }[]
> = {
  "k-2": [
    { label: "K", gold: "kg", blue: "kb" },
    { label: "1st", gold: "1g", blue: "1b" },
    { label: "2nd", gold: "2g", blue: "2b" },
  ],
  "3-5": [
    { label: "3rd", gold: "3g", blue: "3b" },
    { label: "4th", gold: "4g", blue: "4b" },
    { label: "5th", gold: "5g", blue: "5b" },
  ],
  "6-8": [
    { label: "6th", gold: "6g", blue: "6b" },
    { label: "7th", gold: "7g", blue: "7b" },
    { label: "8th", gold: "8g", blue: "8b" },
  ],
};

export const TEACHER_PHASES = ["lesson", "review", "lab"] as const;

export type TeacherPhase = (typeof TEACHER_PHASES)[number];

export type TeacherWritePhase = TeacherPhase | "all";

export const PHASE_MARK: Record<TeacherPhase, string> = {
  lesson: "L",
  review: "R",
  lab: "Λ",
};

export const PHASE_LABEL: Record<TeacherPhase, string> = {
  lesson: "Lesson",
  review: "Review",
  lab: "Lab",
};

export function sectionBand(section: string): BandId {
  const grade = section[0];
  if (grade === "k" || grade === "1" || grade === "2") return "k-2";
  if (grade === "3" || grade === "4" || grade === "5") return "3-5";
  return "6-8";
}

export interface TeacherLessonRow {
  slug: string;
  code: string;
  title: string;
}

export interface TeacherBandScan {
  band: BandId;
  label: string;
  lessons: TeacherLessonRow[];
}

export interface TeacherProgressRow {
  band: string;
  section: string;
  lesson_slug: string;
  lesson: boolean;
  review: boolean;
  lab: boolean;
}

export type CellFlags = Record<TeacherPhase, boolean>;

export function emptyCell(): CellFlags {
  return { lesson: false, review: false, lab: false };
}

export function cellComplete(cell: CellFlags): boolean {
  return cell.lesson && cell.review && cell.lab;
}

export function progressKey(section: string, slug: string) {
  return `${section}:${slug}`;
}

export function rowsToCellMap(
  rows: TeacherProgressRow[],
): Map<string, CellFlags> {
  const map = new Map<string, CellFlags>();
  for (const row of rows) {
    map.set(progressKey(row.section, row.lesson_slug), {
      lesson: row.lesson,
      review: row.review,
      lab: row.lab,
    });
  }
  return map;
}

export function cellFromRows(
  rows: TeacherProgressRow[],
  section: string,
  slug: string,
): CellFlags {
  return rowsToCellMap(rows).get(progressKey(section, slug)) ?? emptyCell();
}

export function nextUnfinishedSlug(
  rows: TeacherProgressRow[],
  section: TeacherSection,
  sequence: readonly string[],
): string | undefined {
  const map = rowsToCellMap(rows);
  return sequence.find((slug) => {
    const cell = map.get(progressKey(section, slug)) ?? emptyCell();
    return !cellComplete(cell);
  });
}
