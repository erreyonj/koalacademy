import {
  COHORTS,
  COHORT_LABEL,
  type Cohort,
  isCohort,
} from "@/features/behavior/types";
import type { Difficulty } from "./pitches";

/** Student cohorts plus a hidden teacher bucket (not shown in the picker). */
export type ScoreCohort = Cohort | "staff";

export const STAFF_BACKDOOR_ALIAS = "!@!";
export const STAFF_SCORE_ALIAS = "MRE";
export const STAFF_SCORE_COHORT = "staff" as const;

export type StaffDecodeScore = {
  id: string;
  alias: string;
  cohort: ScoreCohort;
  difficulty: Difficulty;
  elapsedSec: number;
  createdAt: string;
};

export type Placement = {
  beaten: number;
  total: number;
};

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  hard: 0,
  medium: 1,
  easy: 2,
};

const DIFFICULTY_TITLE: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function difficultyTitle(difficulty: Difficulty): string {
  return DIFFICULTY_TITLE[difficulty];
}

export function isScoreCohort(value: string): value is ScoreCohort {
  return value === "staff" || isCohort(value);
}

export function cohortLabel(cohort: ScoreCohort): string {
  if (cohort === "staff") return "Staff";
  return COHORT_LABEL[cohort];
}

/** Accepts normal A–Z initials or the progressive staff backdoor `!@!`. */
export function normalizeAliasInput(raw: string): string {
  if (raw === "!" || raw === "!@" || raw === STAFF_BACKDOOR_ALIAS) return raw;
  return normalizeAlias(raw);
}

export function isStaffBackdoor(alias: string): boolean {
  return alias === STAFF_BACKDOOR_ALIAS;
}

export function resolveLogIdentity(aliasInput: string, cohort: Cohort | null): {
  alias: string;
  cohort: ScoreCohort;
} | null {
  if (isStaffBackdoor(aliasInput)) {
    return { alias: STAFF_SCORE_ALIAS, cohort: STAFF_SCORE_COHORT };
  }
  const cleaned = normalizeAlias(aliasInput);
  if (!isValidAlias(cleaned) || !cohort) return null;
  return { alias: cleaned, cohort };
}

/** Flat ranking: faster first; equal times put Hard ahead of Medium ahead of Easy. */
export function sortScoresByTimeThenDifficulty(
  scores: readonly StaffDecodeScore[],
): StaffDecodeScore[] {
  return [...scores].sort((a, b) => {
    if (a.elapsedSec !== b.elapsedSec) return a.elapsedSec - b.elapsedSec;
    return DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
  });
}

export type CohortScoreGroup = {
  cohort: ScoreCohort;
  label: string;
  scores: StaffDecodeScore[];
};

const GROUP_ORDER: readonly ScoreCohort[] = [...COHORTS, "staff"];

/** Cohorts that have at least one entry, in curriculum order; each list time-sorted. */
export function groupScoresByCohort(
  scores: readonly StaffDecodeScore[],
): CohortScoreGroup[] {
  const buckets = new Map<ScoreCohort, StaffDecodeScore[]>();
  for (const score of scores) {
    if (!isScoreCohort(score.cohort)) continue;
    const list = buckets.get(score.cohort) ?? [];
    list.push(score);
    buckets.set(score.cohort, list);
  }

  const groups: CohortScoreGroup[] = [];
  for (const cohort of GROUP_ORDER) {
    const list = buckets.get(cohort);
    if (!list || list.length === 0) continue;
    groups.push({
      cohort,
      label: cohortLabel(cohort),
      scores: sortScoresByTimeThenDifficulty(list),
    });
  }
  return groups;
}

export function normalizeAlias(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

export function isValidAlias(alias: string): boolean {
  return /^[A-Z]{3}$/.test(alias);
}

export function placementCopy(
  placement: Placement,
  difficulty: Difficulty,
): string {
  const title = difficultyTitle(difficulty);
  if (placement.total === 0) {
    return `First on the board for ${title}!`;
  }
  return `You beat ${placement.beaten} of ${placement.total} players on ${title}`;
}
