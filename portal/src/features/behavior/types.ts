/**
 * Behavior marble tracker — Scholars + K–5 cohorts.
 *
 * Cohort codes match the teacher-progress section codes (`kb`, `1g`, …) so
 * one vocabulary covers both features; `scholars` is the only extra.
 */

export const COHORTS = [
  "scholars",
  "kb",
  "kg",
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
] as const;

export type Cohort = (typeof COHORTS)[number];

/** Short label on the top cohort bar. */
export const COHORT_LABEL: Record<Cohort, string> = {
  scholars: "Scholars",
  kb: "KB",
  kg: "KG",
  "1g": "1G",
  "1b": "1B",
  "2g": "2G",
  "2b": "2B",
  "3g": "3G",
  "3b": "3B",
  "4g": "4G",
  "4b": "4B",
  "5g": "5G",
  "5b": "5B",
};

/** Long label for modals and screen readers. */
export const COHORT_NAME: Record<Cohort, string> = {
  scholars: "Scholars",
  kb: "Kindergarten Blue",
  kg: "Kindergarten Gold",
  "1g": "1st Gold",
  "1b": "1st Blue",
  "2g": "2nd Gold",
  "2b": "2nd Blue",
  "3g": "3rd Gold",
  "3b": "3rd Blue",
  "4g": "4th Gold",
  "4b": "4th Blue",
  "5g": "5th Gold",
  "5b": "5th Blue",
};

export function isCohort(value: string): value is Cohort {
  return (COHORTS as readonly string[]).includes(value);
}

export interface BehaviorStudent {
  id: string;
  cohort: Cohort;
  first_name: string;
  last_initial: string;
  marbles: number;
  prize: boolean;
  avatar_seed: string;
}

/** Counter turns green at this many marbles. */
export const GREEN_AT = 7;
/** Counter turns to the warning tone once marbles drop below this. */
export const WARN_BELOW = -2;

export type MarbleTone = "green" | "neutral" | "warn";

export function marbleTone(marbles: number): MarbleTone {
  if (marbles >= GREEN_AT) return "green";
  if (marbles < WARN_BELOW) return "warn";
  return "neutral";
}

export function displayName(student: Pick<BehaviorStudent, "first_name" | "last_initial">) {
  return student.last_initial
    ? `${student.first_name} ${student.last_initial}.`
    : student.first_name;
}

export function initials(student: Pick<BehaviorStudent, "first_name" | "last_initial">) {
  const first = student.first_name.trim()[0] ?? "?";
  return `${first}${student.last_initial[0] ?? ""}`.toUpperCase();
}

/**
 * Deterministic hue from the avatar seed so a student keeps the same colour
 * across devices without storing a photo. Falls back to the name.
 */
export function avatarHue(seed: string, fallback: string): number {
  const input = seed || fallback;
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

export function classTotal(students: readonly BehaviorStudent[]): number {
  return students.reduce((sum, student) => sum + student.marbles, 0);
}
