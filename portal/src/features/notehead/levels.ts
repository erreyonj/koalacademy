import type { Ledge, TerrainBody } from "./terrain";
import { restOn } from "./terrain";

export const SHIP_R = 7;

/** Stairs rise to the right. The band sits in the open sky to their left. */
export const STAIR_TREADS: Ledge[] = [
  { id: "s1", x0: 86, x1: 200, y: 300, pitch: "C4", kind: "step" },
  { id: "s2", x0: 110, x1: 200, y: 254, pitch: "D4", kind: "step" },
  { id: "s3", x0: 132, x1: 200, y: 208, pitch: "E4", kind: "step" },
  { id: "s4", x0: 152, x1: 200, y: 162, pitch: "F4", kind: "step" },
  { id: "s5", x0: 170, x1: 200, y: 116, pitch: "G4", kind: "step" },
];

export const STAIR_BAND: Ledge = {
  id: "band",
  x0: 14,
  x1: 72,
  y: 300,
  pitch: "C4",
  kind: "band",
};

export const STAIR_LEDGES: Ledge[] = [STAIR_BAND, ...STAIR_TREADS];

export const NOTCH_POCKET: Ledge = {
  id: "pocket",
  x0: 72,
  x1: 106,
  y: 156,
  pitch: "E4",
  kind: "band",
};

export const NOTCH_BLOCK: Ledge = {
  id: "block",
  x0: 164,
  x1: 190,
  y: 78,
  pitch: "A4",
  kind: "block",
};

export const NOTCH_FLOOR: Ledge = {
  id: "floor",
  x0: 148,
  x1: 196,
  y: 292,
  pitch: "C4",
  kind: "band",
};

export const NOTCH_LEDGES: Ledge[] = [NOTCH_POCKET, NOTCH_BLOCK, NOTCH_FLOOR];

export function stairStart(): TerrainBody {
  return restOn(STAIR_BAND, SHIP_R);
}

export function notchStart(): TerrainBody {
  return restOn(NOTCH_FLOOR, SHIP_R);
}

/**
 * Pull 0..1. Stairs: harder pull reaches the top tread.
 * Notch floor: a short pull aims at the pocket, a hard pull at the block.
 * Pocket launches toward the block.
 */
export function launchVelocity(
  level: "stairs" | "notch",
  restingId: string,
  pull: number,
): { vx: number; vy: number } {
  const t = Math.max(0, Math.min(1, pull));
  if (level === "stairs") {
    // Full pull crests the top tread; +y is down.
    return { vx: 70 + t * 80, vy: -(380 + t * 150) };
  }
  if (restingId === "pocket") {
    return { vx: 90 + t * 70, vy: -(360 + t * 80) };
  }
  if (restingId === "block") {
    return { vx: -40, vy: -(200 + t * 80) };
  }
  // Floor: a short pull drifts left into the pocket; a hard pull stays
  // under the block and clears it.
  return { vx: -110 + t * 118, vy: -(440 + t * 180) };
}
