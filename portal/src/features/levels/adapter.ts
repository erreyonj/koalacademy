/**
 * Level file → the game's own shapes (`Mass`, `Ledge`, `Borealis`, `ExitZone`,
 * `FrameOpening`, `Body`). The editor preview draws these with the game's
 * markup, so what you draw is what the game will show. When the game later
 * reads authored levels, this is the conversion it needs.
 */
import { asLedge } from "./model";
import { regionOf, terrainOutline, viewSizeOf, toView } from "./geometry";
import { seeded } from "../notehead/modules/rand";
import { scoreMarks, type Mass, type Point } from "../notehead/modules/terrain";
import type { Borealis } from "../notehead/modules/borealis";
import type { ExitZone, FrameOpening } from "../notehead/modules/exit-zone";
import type { Body, Ledge, RegionId, SvgViewSize } from "../notehead/modules/sim";
import type {
  BorealisSpot,
  ExitOpening,
  LevelFile,
  LevelView,
  TerrainShape,
} from "./types";

export function borealisFromSpot(spot: BorealisSpot): Borealis {
  return {
    id: spot.id,
    x: spot.x,
    y: spot.y,
    pitch: spot.pitch,
    collected: false,
    homeX: spot.x,
  };
}

export interface PreviewLevel {
  regionId: RegionId;
  view: SvgViewSize;
  masses: Mass[];
  ledges: Ledge[];
  borealis: Borealis[];
  openings: FrameOpening[];
  /** Chevron + barrier for up / right exits. Down exits have no zone art. */
  exitZones: { id: string; zone: ExitZone | null }[];
  enter: Body | null;
}

const TICK_CACHE_LIMIT = 64;
const tickCache = new Map<string, readonly (readonly Point[])[]>();

function ticksFor(
  view: LevelView,
  shape: TerrainShape,
  ring: readonly Point[],
): readonly (readonly Point[])[] {
  const key = `${view}|${shape.closed}|${shape.tickSeed}|${ring
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(";")}`;
  const hit = tickCache.get(key);
  if (hit) return hit;
  const marks = scoreMarks(ring, seeded(shape.tickSeed), viewSizeOf(view));
  tickCache.set(key, marks);
  if (tickCache.size > TICK_CACHE_LIMIT) {
    const oldest = tickCache.keys().next().value;
    if (oldest !== undefined) tickCache.delete(oldest);
  }
  return marks;
}

export function massFromShape(
  view: LevelView,
  shape: TerrainShape,
  withTicks = true,
): Mass {
  const outline: Point[] = terrainOutline(view, shape);
  return {
    id: shape.id,
    outline,
    ticks: withTicks && outline.length >= 3 ? ticksFor(view, shape, outline) : [],
  };
}

/** Chevron + barrier for an opening, in view space. Mirrors `exit-zone.ts` placement. */
export function zoneFromExit(
  view: LevelView,
  exit: ExitOpening,
): ExitZone | null {
  if (exit.facing === "down") return null;
  const regionId = regionOf(view);
  const size = viewSizeOf(view);
  if (exit.facing === "up") {
    const a = toView(view, { x: exit.x0, y: exit.y0 });
    const b = toView(view, { x: exit.x1, y: exit.y1 });
    const inset = view === "landscape" ? 12 : 20;
    return {
      regionId,
      facing: "up",
      x1: a.x,
      y1: inset,
      x2: b.x,
      y2: inset,
      ax: (a.x + b.x) / 2,
      ay: inset + 16,
    };
  }
  const a = toView(view, { x: exit.x0, y: exit.y0 });
  const b = toView(view, { x: exit.x1, y: exit.y1 });
  const edge = size.w - 8;
  return {
    regionId,
    facing: "right",
    x1: edge,
    y1: Math.min(a.y, b.y),
    x2: edge,
    y2: Math.max(a.y, b.y),
    ax: size.w - 26,
    ay: (a.y + b.y) / 2,
  };
}

/**
 * `ticks: false` skips the score marks (used while a drag is in flight, since
 * every pointer move would otherwise regenerate them).
 */
export function previewLevel(
  level: LevelFile,
  opts: { ticks?: boolean } = {},
): PreviewLevel {
  const ticks = opts.ticks !== false;
  return {
    regionId: regionOf(level.view),
    view: viewSizeOf(level.view),
    masses: level.terrain.map((shape) => massFromShape(level.view, shape, ticks)),
    ledges: level.bands.map(asLedge),
    borealis: level.borealis.map(borealisFromSpot),
    openings: level.exits.map((exit) => ({
      facing: exit.facing,
      x0: exit.x0,
      x1: exit.x1,
      y0: exit.y0,
      y1: exit.y1,
    })),
    exitZones: level.exits.map((exit) => ({
      id: exit.id,
      zone: zoneFromExit(level.view, exit),
    })),
    enter: level.enter
      ? {
          x: level.enter.x,
          y: level.enter.y,
          vx: level.enter.vx,
          vy: level.enter.vy,
          restingOn: null,
        }
      : null,
  };
}
