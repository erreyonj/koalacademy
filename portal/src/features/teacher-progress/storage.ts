const STORAGE_KEY = "ka-teacher-code";

export function loadTeacherCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveTeacherCode(code: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (code) window.localStorage.setItem(STORAGE_KEY, code);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private-mode storage: the session just will not stay unlocked.
  }
}
