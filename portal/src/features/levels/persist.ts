/**
 * Saving and loading. The app is a static export (no API routes), so a level
 * leaves the editor as a downloaded `.level.json` file (or a whole route as one
 * array file), and comes back by import. Commit finished files to
 * `portal/src/features/notehead/levels/`. The route also sits in
 * `localStorage` as an autosave so a refresh never loses work.
 */
import {
  levelFileName,
  parseLevel,
  parseLevelSet,
  routeFileName,
  serializeLevel,
  serializeRoute,
  validateRoute,
  type ParseSetResult,
} from "./model";
import type { LevelFile } from "./types";

/** The route autosave: every level plus which one is open. */
export const STORAGE_KEY = "koalacademy.notehead.level-editor.v2";
/** The old single-level autosave. Still read once so no work is lost. */
export const LEGACY_STORAGE_KEY = "koalacademy.notehead.level-editor.v1";

export interface Draft {
  levels: LevelFile[];
  activeIndex: number;
  /** Id of the level Play begins on, when one was set. */
  origin?: string;
}

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

export function saveDraft(
  levels: readonly LevelFile[],
  activeIndex: number,
  origin: string | null = null,
): void {
  try {
    storage()?.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeIndex, origin, route: serializeRoute(levels) }),
    );
  } catch {
    // Quota or private mode: autosave is best effort.
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as {
        activeIndex?: unknown;
        origin?: unknown;
        route?: unknown;
      };
      if (typeof saved.route !== "string") return null;
      const parsed = parseLevelSet(saved.route);
      if (!parsed.ok || validateRoute(parsed.levels).errors.length > 0) return null;
      const index = Number(saved.activeIndex);
      const activeIndex =
        Number.isInteger(index) && index >= 0 && index < parsed.levels.length ? index : 0;
      const origin =
        typeof saved.origin === "string" && parsed.levels.some((l) => l.id === saved.origin)
          ? saved.origin
          : undefined;
      return { levels: parsed.levels, activeIndex, ...(origin ? { origin } : {}) };
    }
    const legacy = storage()?.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return null;
    const parsed = parseLevel(legacy);
    return parsed.ok ? { levels: [parsed.level], activeIndex: 0 } : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
    storage()?.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function download(name: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Browser download of one level as `<id>.level.json`. */
export function downloadLevel(level: LevelFile): void {
  download(levelFileName(level), serializeLevel(level));
}

/** Browser download of the whole route as one array file. */
export function downloadRoute(levels: readonly LevelFile[]): void {
  download(routeFileName(levels), serializeRoute(levels));
}

/**
 * Merge the text of several files into one route. Each file may hold a level
 * or an array of levels; they join in the order given. Any bad file, or a
 * repeated level id, rejects the whole import so a route never half loads.
 */
export function parseLevelTexts(
  entries: readonly { name: string; text: string }[],
): ParseSetResult {
  if (entries.length === 0) return { ok: false, errors: ["no files selected"] };
  const levels: LevelFile[] = [];
  const errors: string[] = [];
  for (const { name, text } of entries) {
    const parsed = parseLevelSet(text);
    if (parsed.ok) levels.push(...parsed.levels);
    else errors.push(...parsed.errors.map((message) => `${name}: ${message}`));
  }
  if (errors.length > 0) return { ok: false, errors };
  const route = validateRoute(levels);
  if (route.errors.length > 0) return { ok: false, errors: route.errors };
  return { ok: true, levels };
}

export async function readLevelFiles(files: readonly File[]): Promise<ParseSetResult> {
  const entries = await Promise.all(
    files.map(async (file) => ({ name: file.name, text: await file.text() })),
  );
  return parseLevelTexts(entries);
}
