/**
 * Borealis: magnetic mid-air energy orbs.
 * Physical collect is any-order and never locks; Tonation awards come only
 * from interval order (see modules/tonation.ts). Orbs regen on region re-entry.
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
  fromSvgPoint,
  ledgeById,
  ledgeYAt,
  openTreadSpan,
  type Body,
  type Ledge,
  type PitchName,
} from "./sim";

export const EXIT_BAND_ID = "exit-band";
/** Half-width of the exit Frequency Band planted after a successful interval. */
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

/** Logical range where an active Borealis drifts toward the ship. */
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
 * Soft Frequency Band under a gem's home platform (successful interval only).
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

/** Spawn Borealis for a beat. Empty when the beat has none. */
export function spawnBorealis(beatId: BeatId): Borealis[] {
  if (beatId === "notch-calibrate") {
    // Lower shelf A4, higher block E4 — Ascending 4th still E4 → A4.
    return [
      { ...hoverAbove(NOTCH_POCKET, SHIP_R * 2.2) },
      { ...hoverAbove(NOTCH_BLOCK, SHIP_R * 2.8) },
    ];
  }
  if (beatId === "stairs-anach") {
    return STAIR_TREADS.map((tread) => hoverAboveOpenTread(tread));
  }
  if (beatId === "zig-1") {
    const float = fromSvgPoint(214, 88, "zig");
    const rightX =
      ZIG_RIGHT.x0 + (ZIG_RIGHT.x1 - ZIG_RIGHT.x0) * 0.28;
    return [
      {
        id: ZIG_PEAK.id,
        x: float.x,
        y: float.y,
        pitch: "C4",
        collected: false,
        homeX: float.x,
      },
      { ...hoverAbove(ZIG_LEFT, SHIP_R * 2.4), pitch: "E4" },
      { ...hoverAbove(ZIG_RIGHT, SHIP_R * 2.2, rightX), pitch: "A4" },
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

export function allBorealisCollected(list: readonly Borealis[]): boolean {
  return list.length > 0 && list.every((entry) => entry.collected);
}

/** Any uncollected Borealis may magnetize / gather, in any order. */
export function stepBorealis(
  list: readonly Borealis[],
  body: Body,
  dt: number,
): { list: Borealis[]; collected: readonly Borealis[] } {
  if (dt <= 0 || list.length === 0) {
    return { list: [...list], collected: [] };
  }

  const collected: Borealis[] = [];
  const next = list.map((entry) => {
    if (entry.collected) return entry;
    const dx = body.x - entry.x;
    const dy = body.y - entry.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= COLLECT_RADIUS) {
      // Only one gem per step — first in list order that reaches radius.
      if (collected.length > 0) return entry;
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
