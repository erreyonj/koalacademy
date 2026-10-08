import { COHORTS, isCohort, type Cohort } from "./types";

const COHORT_KEY = "ka-behavior-cohort";

/** Last class opened on this device; the dashboard launcher writes it too. */
export function loadCohort(): Cohort {
  if (typeof window === "undefined") return COHORTS[0];
  try {
    const stored = window.localStorage.getItem(COHORT_KEY);
    if (stored && isCohort(stored)) return stored;
  } catch {
    // Private-mode storage: fall back to the first cohort.
  }
  return COHORTS[0];
}

export function saveCohort(cohort: Cohort): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COHORT_KEY, cohort);
  } catch {
    // Private-mode storage: the choice just will not stick.
  }
}
