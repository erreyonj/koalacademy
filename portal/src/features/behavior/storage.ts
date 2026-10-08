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

const RETURN_KEY = "ka-buckets-return";

/** Same-origin paths only, so a stored value can never leave the portal. */
function isLocalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** Where Exit should go: the lesson whose Options menu opened Buckets. */
export function saveReturnPath(path: string): void {
  if (typeof window === "undefined" || !isLocalPath(path)) return;
  try {
    window.sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    // Private-mode storage: Exit falls back to the dashboard.
  }
}

export function clearReturnPath(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // Nothing stored.
  }
}

/** Reads and clears the return path. */
export function takeReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
    return stored && isLocalPath(stored) ? stored : null;
  } catch {
    return null;
  }
}
