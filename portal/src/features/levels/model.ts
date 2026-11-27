/**
 * Pure level operations: create, edit helpers, validation, JSON round trip.
 * Nothing here touches React or the DOM.
 */
import type {
  BorealisSpot,
  EnterPoint,
  ExitFacing,
  ExitOpening,
  BandSpot,
  Ledge,
  LevelFile,
  LevelView,
  PitchName,
  Pt,
  Selection,
  TerrainShape,
} from "./types";

const VIEWS: readonly LevelView[] = ["portrait", "landscape"];
const FACINGS: readonly ExitFacing[] = ["up", "right", "down"];
const KINDS = ["band", "step", "block"] as const;
/** Pitches a Borealis can be assigned, low to high. Height means nothing. */
export const BOREALIS_PITCHES: readonly PitchName[] = [
  "A3",
  "B3",
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
];
/**
 * The game's `Ledge` requires a pitch and authored bands have none. Nothing in
 * the physics reads it, so every band carries this one fixed value.
 */
const BAND_PITCH: PitchName = "C4";

/** An authored band as the game's ledge. */
export function asLedge(band: BandSpot): Ledge {
  return { ...band, pitch: BAND_PITCH };
}

export const DEFAULT_BOREALIS_PITCH: PitchName = "C4";
/** Sanity bound; the logical world is 900×1600 with a little bleed. */
const LIMIT = 100_000;

export function createLevel(
  id = "level-1",
  view: LevelView = "portrait",
): LevelFile {
  return {
    version: 1,
    id,
    view,
    terrain: [],
    bands: [],
    borealis: [],
    enter: null,
    exits: [],
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundPt(p: Pt): Pt {
  return { x: round2(p.x), y: round2(p.y) };
}

/** Next `prefix-N` id that no item in `items` uses. */
export function nextId(
  prefix: string,
  items: readonly { id: string }[],
): string {
  let max = 0;
  const lead = `${prefix}-`;
  for (const item of items) {
    if (!item.id.startsWith(lead)) continue;
    const n = Number(item.id.slice(lead.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${lead}${max + 1}`;
}

/** Stable 32-bit seed from an id (FNV-1a). Same id, same rock marks. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mapById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  fn: (item: T) => T,
): T[] {
  return items.map((item) => (item.id === id ? fn(item) : item));
}

// Terrain

export function addTerrain(level: LevelFile, shape: TerrainShape): LevelFile {
  return { ...level, terrain: [...level.terrain, shape] };
}

export function patchTerrain(
  level: LevelFile,
  id: string,
  patch: Partial<Omit<TerrainShape, "id">>,
): LevelFile {
  return {
    ...level,
    terrain: mapById(level.terrain, id, (s) => ({ ...s, ...patch })),
  };
}

export function removeTerrain(level: LevelFile, id: string): LevelFile {
  return { ...level, terrain: level.terrain.filter((s) => s.id !== id) };
}

/** Reverse the drawing direction. Rock sits to the right of travel, so this swaps sides. */
export function flipTerrain(level: LevelFile, id: string): LevelFile {
  return patchTerrain(level, id, {
    points: [...(terrainById(level, id)?.points ?? [])].reverse(),
  });
}

export function terrainById(
  level: LevelFile,
  id: string,
): TerrainShape | undefined {
  return level.terrain.find((s) => s.id === id);
}

// Bands

export function addBand(level: LevelFile, band: BandSpot): LevelFile {
  return { ...level, bands: [...level.bands, band] };
}

export function patchBand(
  level: LevelFile,
  id: string,
  patch: Partial<Omit<BandSpot, "id">>,
): LevelFile {
  return {
    ...level,
    bands: mapById(level.bands, id, (b) => ({ ...b, ...patch })),
  };
}

export function removeBand(level: LevelFile, id: string): LevelFile {
  return { ...level, bands: level.bands.filter((b) => b.id !== id) };
}

export function bandById(level: LevelFile, id: string): BandSpot | undefined {
  return level.bands.find((b) => b.id === id);
}

// Borealis

export function addBorealis(level: LevelFile, spot: BorealisSpot): LevelFile {
  return { ...level, borealis: [...level.borealis, spot] };
}

export function patchBorealis(
  level: LevelFile,
  id: string,
  patch: Partial<Omit<BorealisSpot, "id">>,
): LevelFile {
  return {
    ...level,
    borealis: mapById(level.borealis, id, (g) => ({ ...g, ...patch })),
  };
}

export function removeBorealis(level: LevelFile, id: string): LevelFile {
  return { ...level, borealis: level.borealis.filter((g) => g.id !== id) };
}

export function borealisById(
  level: LevelFile,
  id: string,
): BorealisSpot | undefined {
  return level.borealis.find((g) => g.id === id);
}

/** Move a gem to `toIndex` in goal order. */
export function reorderBorealis(
  level: LevelFile,
  id: string,
  toIndex: number,
): LevelFile {
  const from = level.borealis.findIndex((g) => g.id === id);
  if (from < 0) return level;
  const to = Math.max(0, Math.min(level.borealis.length - 1, toIndex));
  if (to === from) return level;
  const next = [...level.borealis];
  const [gem] = next.splice(from, 1);
  next.splice(to, 0, gem!);
  return { ...level, borealis: next };
}

// Enter / exit

export function setEnter(level: LevelFile, enter: EnterPoint | null): LevelFile {
  return { ...level, enter };
}

export function addExit(level: LevelFile, exit: ExitOpening): LevelFile {
  return { ...level, exits: [...level.exits, exit] };
}

export function patchExit(
  level: LevelFile,
  id: string,
  patch: Partial<Omit<ExitOpening, "id">>,
): LevelFile {
  return {
    ...level,
    exits: mapById(level.exits, id, (e) => ({ ...e, ...patch })),
  };
}

export function removeExit(level: LevelFile, id: string): LevelFile {
  return { ...level, exits: level.exits.filter((e) => e.id !== id) };
}

export function exitById(
  level: LevelFile,
  id: string,
): ExitOpening | undefined {
  return level.exits.find((e) => e.id === id);
}

/** Fewest points a shape keeps. */
export function minPoints(shape: Pick<TerrainShape, "closed">): number {
  return shape.closed ? 3 : 2;
}

/**
 * Delete whatever the selection points at. A selected terrain vertex goes
 * alone while the shape stays valid; otherwise the whole item goes.
 */
export function removeSelection(
  level: LevelFile,
  selection: Selection,
): LevelFile {
  switch (selection.kind) {
    case "terrain": {
      const shape = terrainById(level, selection.id);
      if (!shape) return level;
      const { vertex } = selection;
      if (vertex !== undefined && shape.points.length > minPoints(shape)) {
        return patchTerrain(level, shape.id, {
          points: shape.points.filter((_, i) => i !== vertex),
        });
      }
      return removeTerrain(level, selection.id);
    }
    case "band":
      return removeBand(level, selection.id);
    case "borealis":
      return removeBorealis(level, selection.id);
    case "exit":
      return removeExit(level, selection.id);
    case "enter":
      return setEnter(level, null);
  }
}

// Validation + JSON

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= LIMIT;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkPt(v: unknown): v is Pt {
  return isObject(v) && finite(v.x) && finite(v.y);
}

function checkIds(
  label: string,
  items: readonly unknown[],
  errors: string[],
): void {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (!isObject(item)) return;
    if (typeof item.id !== "string" || item.id === "") {
      errors.push(`${label}[${i}]: id must be a non-empty string`);
      return;
    }
    if (seen.has(item.id)) errors.push(`${label}: duplicate id "${item.id}"`);
    seen.add(item.id);
  });
}

/** Human-readable problems with a candidate level. Empty means valid. */
export function validateLevel(input: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(input)) return ["level must be an object"];
  const lv = input;

  if (lv.version !== 1) errors.push("version must be 1");
  if (typeof lv.id !== "string" || lv.id.trim() === "") {
    errors.push("id must be a non-empty string");
  }
  if (!VIEWS.includes(lv.view as LevelView)) {
    errors.push('view must be "portrait" or "landscape"');
  }

  const arrays = ["terrain", "bands", "borealis", "exits"] as const;
  for (const key of arrays) {
    if (!Array.isArray(lv[key])) errors.push(`${key} must be an array`);
  }
  if (arrays.some((key) => !Array.isArray(lv[key]))) return errors;

  const terrain = lv.terrain as Record<string, unknown>[];
  checkIds("terrain", terrain, errors);
  terrain.forEach((s, i) => {
    if (!isObject(s)) return void errors.push(`terrain[${i}]: must be an object`);
    if (!Array.isArray(s.points) || !s.points.every(checkPt)) {
      errors.push(`terrain[${i}]: points must be {x,y} numbers`);
    } else {
      const need = s.closed === true ? 3 : 2;
      if (s.points.length < need) {
        errors.push(`terrain[${i}]: needs at least ${need} points`);
      }
    }
    if (typeof s.closed !== "boolean") {
      errors.push(`terrain[${i}]: closed must be a boolean`);
    }
    if (!Number.isInteger(s.tickSeed) || (s.tickSeed as number) < 0) {
      errors.push(`terrain[${i}]: tickSeed must be a non-negative integer`);
    }
  });

  const bands = lv.bands as Record<string, unknown>[];
  checkIds("bands", bands, errors);
  bands.forEach((b, i) => {
    if (!isObject(b)) return void errors.push(`bands[${i}]: must be an object`);
    if (!finite(b.x0) || !finite(b.x1) || !finite(b.y)) {
      errors.push(`bands[${i}]: x0, x1, y must be numbers`);
    } else if (b.x0 >= b.x1) {
      errors.push(`bands[${i}]: x0 must be less than x1`);
    }
    if (!KINDS.includes(b.kind as (typeof KINDS)[number])) {
      errors.push(`bands[${i}]: kind must be band, step, or block`);
    }
    if (b.slope !== undefined && !finite(b.slope)) {
      errors.push(`bands[${i}]: slope must be a number`);
    }
  });

  const gems = lv.borealis as Record<string, unknown>[];
  checkIds("borealis", gems, errors);
  gems.forEach((g, i) => {
    if (!isObject(g)) return void errors.push(`borealis[${i}]: must be an object`);
    if (!finite(g.x) || !finite(g.y)) {
      errors.push(`borealis[${i}]: x and y must be numbers`);
    }
    if (!BOREALIS_PITCHES.includes(g.pitch as PitchName)) {
      errors.push(
        `borealis[${i}]: pitch must be one of ${BOREALIS_PITCHES[0]} to ${BOREALIS_PITCHES[BOREALIS_PITCHES.length - 1]}`,
      );
    }
  });

  const exits = lv.exits as Record<string, unknown>[];
  checkIds("exits", exits, errors);
  exits.forEach((e, i) => {
    if (!isObject(e)) return void errors.push(`exits[${i}]: must be an object`);
    if (!FACINGS.includes(e.facing as ExitFacing)) {
      errors.push(`exits[${i}]: facing must be up, right, or down`);
    }
    if (![e.x0, e.x1, e.y0, e.y1].every(finite)) {
      errors.push(`exits[${i}]: x0, x1, y0, y1 must be numbers`);
    } else if ((e.x0 as number) > (e.x1 as number) || (e.y0 as number) > (e.y1 as number)) {
      errors.push(`exits[${i}]: x0/y0 must not exceed x1/y1`);
    }
    if (e.to !== undefined && (typeof e.to !== "string" || e.to.trim() === "")) {
      errors.push(`exits[${i}]: to must be a non-empty level id`);
    }
  });

  if (lv.enter !== null) {
    const en = lv.enter;
    if (!isObject(en) || ![en.x, en.y, en.vx, en.vy].every(finite)) {
      errors.push("enter must be null or {x,y,vx,vy} numbers");
    }
  }

  return errors;
}

/** Copy only the known fields, so stray keys never leak into saved files. */
function clean(lv: LevelFile): LevelFile {
  return {
    version: 1,
    id: lv.id,
    view: lv.view,
    terrain: lv.terrain.map((s) => ({
      id: s.id,
      points: s.points.map((p) => ({ x: p.x, y: p.y })),
      closed: s.closed,
      tickSeed: s.tickSeed,
    })),
    bands: lv.bands.map((b) => ({
      id: b.id,
      x0: b.x0,
      x1: b.x1,
      y: b.y,
      kind: b.kind,
      ...(b.slope !== undefined ? { slope: b.slope } : {}),
    })),
    borealis: lv.borealis.map((g) => ({
      id: g.id,
      x: g.x,
      y: g.y,
      pitch: g.pitch,
    })),
    enter: lv.enter
      ? { x: lv.enter.x, y: lv.enter.y, vx: lv.enter.vx, vy: lv.enter.vy }
      : null,
    exits: lv.exits.map((e) => ({
      id: e.id,
      facing: e.facing,
      x0: e.x0,
      x1: e.x1,
      y0: e.y0,
      y1: e.y1,
      ...(e.to !== undefined ? { to: e.to } : {}),
    })),
  };
}

export type ParseResult =
  | { ok: true; level: LevelFile }
  | { ok: false; errors: string[] };

export function parseLevel(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["file is not valid JSON"] };
  }
  const errors = validateLevel(raw);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, level: clean(raw as LevelFile) };
}

export type ParseSetResult =
  | {
      ok: true;
      levels: LevelFile[];
      /** Route id, when the file is a route file. */
      routeId?: string;
      /** The level the route begins on, when the file names one. */
      origin?: string;
    }
  | { ok: false; errors: string[] };

/**
 * One level file, an array of levels, or a route file
 * (`{version, id, origin, levels}`). Every level must be valid.
 */
export function parseLevelSet(text: string): ParseSetResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["file is not valid JSON"] };
  }
  let items: unknown = raw;
  let routeId: string | undefined;
  let origin: string | undefined;
  if (isObject(raw) && Array.isArray(raw.levels)) {
    items = raw.levels;
    if (raw.id !== undefined && (typeof raw.id !== "string" || raw.id.trim() === "")) {
      return { ok: false, errors: ["route id must be a non-empty string"] };
    }
    if (raw.origin !== undefined && (typeof raw.origin !== "string" || raw.origin.trim() === "")) {
      return { ok: false, errors: ["origin must be a non-empty level id"] };
    }
    routeId = raw.id as string | undefined;
    origin = raw.origin as string | undefined;
  }
  if (!Array.isArray(items)) {
    const errors = validateLevel(items);
    return errors.length > 0
      ? { ok: false, errors }
      : { ok: true, levels: [clean(items as LevelFile)] };
  }
  if (items.length === 0) return { ok: false, errors: ["the array has no levels"] };
  const errors = items.flatMap((item, i) =>
    validateLevel(item).map((message) => `levels[${i}]: ${message}`),
  );
  if (errors.length > 0) return { ok: false, errors };
  const levels = (items as LevelFile[]).map(clean);
  if (origin !== undefined && !levels.some((l) => l.id === origin)) {
    return { ok: false, errors: [`origin "${origin}" is not a level in the route`] };
  }
  return {
    ok: true,
    levels,
    ...(routeId !== undefined ? { routeId } : {}),
    ...(origin !== undefined ? { origin } : {}),
  };
}

export interface RouteCheck {
  /** Problems that make a route unusable (duplicate ids). */
  errors: string[];
  /** Exits whose target level is not in the route. */
  warnings: string[];
}

export function validateRoute(levels: readonly LevelFile[], origin?: string): RouteCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const level of levels) {
    if (seen.has(level.id)) errors.push(`duplicate level id "${level.id}"`);
    seen.add(level.id);
  }
  if (origin !== undefined && !seen.has(origin)) {
    errors.push(`origin "${origin}" is not a level in the route`);
  }
  for (const level of levels) {
    for (const exit of level.exits) {
      if (exit.to === undefined) continue;
      if (!seen.has(exit.to)) {
        warnings.push(`${level.id} ${exit.id}: goes to "${exit.to}", which is not in the route`);
      }
    }
  }
  return { errors, warnings };
}

export function serializeLevel(level: LevelFile): string {
  return `${JSON.stringify(clean(level), null, 2)}\n`;
}

function slugOf(id: string): string {
  return (
    id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "level"
  );
}

/** File name convention for `portal/src/features/notehead/levels/`. */
export function levelFileName(level: LevelFile): string {
  return `${slugOf(level.id)}.level.json`;
}

/** A route exports as one route file, named after its first level. */
export function routeFileName(levels: readonly LevelFile[]): string {
  return `${slugOf(levels[0]?.id ?? "route")}.route.json`;
}

/**
 * The text of a route file: `{version, id, origin, levels}` with the levels in
 * route order. The origin is the level the game starts the route on; it
 * defaults to the first level, and the id to that level's id.
 */
export function serializeRoute(
  levels: readonly LevelFile[],
  origin?: string | null,
  id?: string,
): string {
  const first = levels[0]?.id ?? "route";
  const start = origin && levels.some((l) => l.id === origin) ? origin : first;
  const file = { version: 1, id: id ?? first, origin: start, levels: levels.map(clean) };
  return `${JSON.stringify(file, null, 2)}\n`;
}
