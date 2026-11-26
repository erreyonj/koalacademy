/**
 * Saving and loading. The app is a static export (no API routes), so a level
 * leaves the editor as a downloaded `.level.json` file, and comes back by
 * import. Commit finished files to `portal/src/features/notehead/levels/`. A copy also sits
 * in `localStorage` as an autosave so a refresh never loses work.
 */
import {
  levelFileName,
  parseLevel,
  serializeLevel,
  type ParseResult,
} from "./model";
import type { LevelFile } from "./types";

export const STORAGE_KEY = "koalacademy.notehead.level-editor.v1";

/** The editor is a dev tool. In a production build the route renders a notice. */
export function editorEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveDraft(level: LevelFile): void {
  try {
    storage()?.setItem(STORAGE_KEY, serializeLevel(level));
  } catch {
    // Quota or private mode: autosave is best effort.
  }
}

export function loadDraft(): LevelFile | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseLevel(raw);
    return parsed.ok ? parsed.level : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Browser download of the level as `<id>.level.json`. */
export function downloadLevel(level: LevelFile): void {
  const blob = new Blob([serializeLevel(level)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = levelFileName(level);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readLevelFile(file: File): Promise<ParseResult> {
  return parseLevel(await file.text());
}
