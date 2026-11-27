/**
 * Borealis: magnetic mid-air energy orbs.
 * Physical collect is any-order and never locks; Tonation awards come only
 * from interval order (see modules/tonation.ts). Orbs regen on level re-entry.
 */
import { surfaceBelow, type LogicalMass } from "./collide";
import {
  SHIP_R,
  ledgeYAt,
  type Body,
  type Ledge,
  type PitchName,
} from "./sim";

export const EXIT_BAND_ID = "exit-band";
/** Half-width of the exit Frequency Band planted after a successful interval. */
export const EXIT_BAND_HALF = 72;

export interface Borealis {
  /** The level's Borealis id (`gem-1`…). */
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

/** A level's authored Borealis spot as a live, uncollected orb. */
export function borealisFromSpot(spot: {
  id: string;
  x: number;
  y: number;
  pitch: PitchName;
}): Borealis {
  return {
    id: spot.id,
    x: spot.x,
    y: spot.y,
    pitch: spot.pitch,
    collected: false,
    homeX: spot.x,
  };
}

/** Spawn the orbs for a level. Empty when the level has none. */
export function spawnBorealis(
  spots: readonly { id: string; x: number; y: number; pitch: PitchName }[],
): Borealis[] {
  return spots.map(borealisFromSpot);
}

/**
 * Soft Frequency Band under a gem (successful interval only), sitting on the
 * highest rock or ledge directly below it. Null over open sky.
 */
export function exitBandFor(
  gem: Borealis,
  masses: readonly LogicalMass[],
  ledges: readonly Ledge[] = [],
): Ledge | null {
  const x = gem.homeX;
  let surface = surfaceBelow(masses, x, gem.y);
  for (const ledge of ledges) {
    if (x < ledge.x0 || x > ledge.x1) continue;
    const y = ledgeYAt(ledge, x);
    if (y > gem.y) continue;
    if (surface === null || y > surface) surface = y;
  }
  if (surface === null) return null;
  return {
    id: EXIT_BAND_ID,
    x0: x - EXIT_BAND_HALF,
    x1: x + EXIT_BAND_HALF,
    y: surface + SHIP_R * 0.35,
    pitch: gem.pitch,
    kind: "band",
  };
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
