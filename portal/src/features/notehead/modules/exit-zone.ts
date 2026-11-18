/**
 * Level exit gates: after Borealis is gathered (or always on launch-bridge),
 * the ship must leave the frame through the exit opening to advance.
 * Sealed frame edges block every other escape so gathering cannot be lost to OOB.
 */
import type { Borealis } from "./borealis";
import { allBorealisCollected } from "./health";
import type { BeatId } from "./progress";
import {
  fromSvgPoint,
  SHIP_R,
  WORLD_H,
  WORLD_W,
  type Body,
  type RegionId,
} from "./sim";

export type ExitFacing = "up" | "right";

/** Barrier + arrow in the region's SVG view space (+y down). */
export interface ExitZone {
  regionId: RegionId;
  facing: ExitFacing;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Chevron / arrow anchor (center). */
  ax: number;
  ay: number;
}

/** Match NoteheadApp / sim out-of-bounds margins. */
const OOB_Y = 240;
const OOB_X = 120;
/** Extra lateral slack so a near-edge exit path still counts. */
const LATERAL_SLACK = 40;

const ZONES: Partial<Record<BeatId, ExitZone>> = {
  // Notch — top of the open shaft.
  "notch-calibrate": {
    regionId: "notch",
    facing: "up",
    x1: 58,
    y1: 20,
    x2: 186,
    y2: 20,
    ax: 122,
    ay: 36,
  },
  // Launch bridge — top of the launch corridor.
  "launch-bridge": {
    regionId: "launch",
    facing: "up",
    x1: 36,
    y1: 26,
    x2: 164,
    y2: 26,
    ax: 100,
    ay: 42,
  },
  // Stairs — right edge above the stack.
  "stairs-anach": {
    regionId: "stairs",
    facing: "right",
    x1: 192,
    y1: 16,
    x2: 192,
    y2: 132,
    ax: 174,
    ay: 64,
  },
  // Zig — top opening of the corridor (content frame).
  "zig-1": {
    regionId: "zig",
    facing: "up",
    x1: 128,
    y1: 12,
    x2: 232,
    y2: 12,
    ax: 180,
    ay: 28,
  },
};

export function exitZoneFor(beatId: BeatId): ExitZone | null {
  return ZONES[beatId] ?? null;
}

/** Show the exit once Borealis is done (launch-bridge has none — always lit). */
export function exitZoneReady(
  beatId: BeatId,
  borealis: readonly Borealis[],
): boolean {
  const zone = exitZoneFor(beatId);
  if (!zone) return false;
  if (beatId === "launch-bridge") return true;
  if (borealis.length === 0) return false;
  return allBorealisCollected(borealis);
}

function exitGap(zone: ExitZone): { x0: number; x1: number; y0: number; y1: number } {
  const a = fromSvgPoint(zone.x1, zone.y1, zone.regionId);
  const b = fromSvgPoint(zone.x2, zone.y2, zone.regionId);
  return {
    x0: Math.min(a.x, b.x) - LATERAL_SLACK,
    x1: Math.max(a.x, b.x) + LATERAL_SLACK,
    y0: Math.min(a.y, b.y) - LATERAL_SLACK,
    y1: Math.max(a.y, b.y) + LATERAL_SLACK,
  };
}

/** True when the ship has left the frame through the exit opening. */
export function leftFrameThroughExit(
  zone: ExitZone,
  body: { x: number; y: number },
): boolean {
  const gap = exitGap(zone);
  if (zone.facing === "up") {
    return body.y > WORLD_H + OOB_Y && body.x >= gap.x0 && body.x <= gap.x1;
  }
  return body.x > WORLD_W + OOB_X && body.y >= gap.y0 && body.y <= gap.y1;
}

/**
 * Soft frame walls once the exit is live: every edge seals except the exit gap.
 * Keeps the ship from OOB-restarting after Borealis is gathered.
 */
export function containAgainstExitFrame(
  body: Body,
  zone: ExitZone,
): { body: Body; hit: boolean } {
  const gap = exitGap(zone);
  let { x, y, vx, vy, restingOn } = body;
  let hit = false;

  if (x < SHIP_R) {
    x = SHIP_R;
    if (vx < 0) vx = 0;
    hit = true;
  }

  const inRightGap =
    zone.facing === "right" && y >= gap.y0 && y <= gap.y1;
  if (!inRightGap && x > WORLD_W - SHIP_R) {
    x = WORLD_W - SHIP_R;
    if (vx > 0) vx = 0;
    hit = true;
  }

  if (y < SHIP_R) {
    y = SHIP_R;
    if (vy < 0) vy = 0;
    hit = true;
  }

  const inTopGap = zone.facing === "up" && x >= gap.x0 && x <= gap.x1;
  if (!inTopGap && y > WORLD_H - SHIP_R) {
    y = WORLD_H - SHIP_R;
    if (vy > 0) vy = 0;
    hit = true;
  }

  return { body: { x, y, vx, vy, restingOn }, hit };
}
