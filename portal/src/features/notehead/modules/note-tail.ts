/**
 * Recovered Note-Tails — mid-air pickups that restore ship parts.
 * Magnet / collect distances match Borealis so the gesture stays familiar.
 */
import {
  COLLECT_RADIUS,
  MAGNET_RANGE,
  MAGNET_SPEED,
} from "./borealis";
import type { Body } from "./sim";

/** First recovered tail — eighth-note silhouette. */
export const TAIL_EIGHTH_ID = "tail-eighth";

export interface NoteTail {
  id: typeof TAIL_EIGHTH_ID;
  /** Stable repair / inventory key. */
  kind: "eighth";
  x: number;
  y: number;
  collected: boolean;
}

/** The floating Note-Tail at a level's authored spot. */
export function spawnNoteTail(spot: { x: number; y: number }): NoteTail {
  return {
    id: TAIL_EIGHTH_ID,
    kind: "eighth",
    x: spot.x,
    y: spot.y,
    collected: false,
  };
}

/**
 * Magnetize and gather the Note-Tail. Pure: returns next state + whether
 * it was collected this step.
 */
export function stepNoteTail(
  tail: NoteTail | null,
  body: Body,
  dt: number,
): { tail: NoteTail | null; collected: NoteTail | null } {
  if (!tail || tail.collected || dt <= 0) {
    return { tail, collected: null };
  }
  const dx = body.x - tail.x;
  const dy = body.y - tail.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= COLLECT_RADIUS) {
    const taken = { ...tail, collected: true, x: body.x, y: body.y };
    return { tail: taken, collected: taken };
  }
  if (dist >= MAGNET_RANGE || dist < 1e-6) {
    return { tail, collected: null };
  }
  const step = Math.min(dist, MAGNET_SPEED * dt);
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    tail: {
      ...tail,
      x: tail.x + ux * step,
      y: tail.y + uy * step,
    },
    collected: null,
  };
}

