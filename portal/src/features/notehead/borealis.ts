/**
 * Borealis: magnetic mid-air energy that marks visit targets.
 * Collectable only in spawn order; collecting counts as a visit.
 * The last gem plants an exit Frequency Band on its home platform.
 */
import type { BeatId } from "./progress";
import {
  SHIP_R,
  STAIR_TREADS,
  NOTCH_BLOCK,
  NOTCH_POCKET,
  ZIG_LEFT,
  ZIG_LEDGES,
  ZIG_PEAK,
  ZIG_RIGHT,
  ledgeById,
  ledgeYAt,
  openTreadSpan,
  type Body,
  type Ledge,
  type PitchName,
} from "./sim";

export const EXIT_BAND_ID = "exit-band";
/** Half-width of the exit Frequency Band planted after the last Borealis. */
export const EXIT_BAND_HALF = 72;

export interface Borealis {
  /** Visit id shared with ledges (`pocket`, `block`, `s1`…). */
  id: string;
  x: number;
  y: number;
  pitch: PitchName;
  collected: boolean;
  /** Logical x of the home platform under this gem (stable while gem drifts). */
  homeX: number;
}

/** Logical range where the active Borealis drifts toward the ship. */
export const MAGNET_RANGE = SHIP_R * 6;
/** Gather distance. */
export const COLLECT_RADIUS = SHIP_R * 2.4;
/** How fast Borealis closes on the ship once magnetized (logical / s). */
export const MAGNET_SPEED = 720;

function hoverAbove(ledge: Ledge, lift: number, x = (ledge.x0 + ledge.x1) / 2): Borealis {
  return {
    id: ledge.id,
    x,
    y: ledgeYAt(ledge, x) + lift,
    pitch: ledge.pitch,
    collected: false,
    homeX: x,
  };
}

/** Over the visible open face of a tread — the climb path, not under higher rock. */
function hoverAboveOpenTread(tread: Ledge): Borealis {
  const span = openTreadSpan(tread);
  const x = span.x0 + (span.x1 - span.x0) * 0.38;
  return hoverAbove(tread, SHIP_R * 3.2, x);
}

function homeLedgeFor(gem: Borealis): Ledge | null {
  if (gem.id === NOTCH_POCKET.id) return NOTCH_POCKET;
  if (gem.id === NOTCH_BLOCK.id) return NOTCH_BLOCK;
  const zig = ledgeById(ZIG_LEDGES, gem.id);
  if (zig) return zig;
  return ledgeById(STAIR_TREADS, gem.id);
}

/**
 * Frequency Band on the platform under the last Borealis — the slingshot out.
 * Sits slightly above the home ledge so the soft band catches instead of the
 * hard block/tread underneath (which would cost hull).
 */
export function exitBandFor(gem: Borealis): Ledge | null {
  const home = homeLedgeFor(gem);
  if (!home) return null;
  const x = gem.homeX;
  return {
    id: EXIT_BAND_ID,
    x0: x - EXIT_BAND_HALF,
    x1: x + EXIT_BAND_HALF,
    y: ledgeYAt(home, x) + SHIP_R * 0.35,
    pitch: gem.pitch,
    kind: "band",
  };
}

/** Spawn Borealis for a beat's visit chain. Empty when the beat has none. */
export function spawnBorealis(beatId: BeatId): Borealis[] {
  if (beatId === "notch-calibrate") {
    // Two goal tones: pocket E4, then block A4 (region goal).
    return [
      { ...hoverAbove(NOTCH_POCKET, SHIP_R * 2.2), pitch: "E4" },
      { ...hoverAbove(NOTCH_BLOCK, SHIP_R * 2.8), pitch: "A4" },
    ];
  }
  if (beatId === "stairs-anach") {
    // One goal tone per tread: C4, E4, G4.
    return STAIR_TREADS.map((tread) => hoverAboveOpenTread(tread));
  }
  if (beatId === "zig-1") {
    // Zig-zag: peak C4 → left E4 → right A4 (region goal).
    return [
      { ...hoverAbove(ZIG_PEAK, SHIP_R * 2.4), pitch: "C4" },
      { ...hoverAbove(ZIG_LEFT, SHIP_R * 2.4), pitch: "E4" },
      { ...hoverAbove(ZIG_RIGHT, SHIP_R * 2.6), pitch: "A4" },
    ];
  }
  return [];
}

/** Floor / peak already under the ship at those enters. */
export function seedVisited(beatId: BeatId): string[] {
  if (beatId === "notch-calibrate") return ["floor"];
  if (beatId === "zig-1") return [ZIG_PEAK.id];
  return [];
}

export function activeBorealis(list: readonly Borealis[]): Borealis[] {
  return list.filter((entry) => !entry.collected);
}

/** Index of the next gem that may magnetize / collect, or -1 if done. */
export function nextBorealisIndex(list: readonly Borealis[]): number {
  return list.findIndex((entry) => !entry.collected);
}

/**
 * Only the next uncollected Borealis (goal order) drifts and gathers.
 * Pure: returns next list and ids collected this step.
 */
export function stepBorealis(
  list: readonly Borealis[],
  body: Body,
  dt: number,
): { list: Borealis[]; collected: readonly Borealis[] } {
  if (dt <= 0 || list.length === 0) {
    return { list: [...list], collected: [] };
  }
  const active = nextBorealisIndex(list);
  if (active < 0) return { list: [...list], collected: [] };

  const collected: Borealis[] = [];
  const next = list.map((entry, index) => {
    if (entry.collected || index !== active) return entry;
    const dx = body.x - entry.x;
    const dy = body.y - entry.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= COLLECT_RADIUS) {
      const taken = { ...entry, collected: true, x: body.x, y: body.y };
      collected.push(taken);
      return taken;
    }
    if (dist >= MAGNET_RANGE || dist < 1e-6) return entry;
    const step = Math.min(dist, MAGNET_SPEED * dt);
    const ux = dx / dist;
    const uy = dy / dist;
    return {
      ...entry,
      x: entry.x + ux * step,
      y: entry.y + uy * step,
    };
  });
  return { list: next, collected };
}
