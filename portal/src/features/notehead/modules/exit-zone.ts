/**
 * Level exit gates: on Borealis / interval beats the exit is always available
 * (skip freely). Sealed frame edges block other escapes so the ship must leave
 * through an open gap (forward exit and/or reverse travel).
 */
import { MASS_HIT_SPEED } from "./collide";
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

/**
 * Soft frame openings the ship may leave through.
 * World space: origin bottom-left, +y up.
 */
export type OpeningFacing =
  | "up"
  | "right"
  | "left"
  | "left-bottom"
  | "right-bottom"
  | "down";

export interface FrameOpening {
  facing: OpeningFacing;
  /** Inclusive world-space gap. Up/down use x0..x1; left/right/left-bottom use y0..y1. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Match NoteheadApp / sim out-of-bounds margins. */
export const OOB_Y = 240;
export const OOB_X = 120;
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

/** Exit is ready whenever this beat has a forward zone (Borealis no longer gates). */
export function exitZoneReady(beatId: BeatId): boolean {
  return exitZoneFor(beatId) !== null;
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

/** Forward exit zone → frame opening. */
export function openingFromExitZone(zone: ExitZone): FrameOpening {
  const gap = exitGap(zone);
  return {
    facing: zone.facing,
    x0: gap.x0,
    x1: gap.x1,
    y0: gap.y0,
    y1: gap.y1,
  };
}

/** Lower-left corner gap: left edge while y is in [0, frac·H]. */
export function leftBottomOpening(yFrac = 0.08): FrameOpening {
  return {
    facing: "left-bottom",
    x0: 0,
    x1: 0,
    y0: 0,
    y1: WORLD_H * yFrac,
  };
}

/** Lower-right corner gap: right edge while y is in [0, frac·H]. */
export function rightBottomOpening(yFrac = 0.08): FrameOpening {
  return {
    facing: "right-bottom",
    x0: WORLD_W,
    x1: WORLD_W,
    y0: 0,
    y1: WORLD_H * yFrac,
  };
}

/** Full or partial left-edge opening. */
export function leftOpening(y0: number, y1: number): FrameOpening {
  return { facing: "left", x0: 0, x1: 0, y0, y1 };
}

/** Full or partial right-edge opening. */
export function rightOpening(y0: number, y1: number): FrameOpening {
  return { facing: "right", x0: WORLD_W, x1: WORLD_W, y0, y1 };
}

/** True when the ship has left the frame through the exit opening. */
export function leftFrameThroughExit(
  zone: ExitZone,
  body: { x: number; y: number },
): boolean {
  return leftFrameThroughOpening(openingFromExitZone(zone), body);
}

/** True when the ship has left the frame through a frame opening. */
export function leftFrameThroughOpening(
  opening: FrameOpening,
  body: { x: number; y: number },
): boolean {
  const { facing, x0, x1, y0, y1 } = opening;
  if (facing === "up") {
    return body.y > WORLD_H + OOB_Y && body.x >= x0 && body.x <= x1;
  }
  if (facing === "down") {
    return body.y < -OOB_Y && body.x >= x0 && body.x <= x1;
  }
  if (facing === "right" || facing === "right-bottom") {
    return body.x > WORLD_W + OOB_X && body.y >= y0 && body.y <= y1;
  }
  // left / left-bottom
  return body.x < -OOB_X && body.y >= y0 && body.y <= y1;
}

/**
 * Soft frame walls: every edge seals except the listed openings.
 * `hit` is true only on a hard impact into a sealed edge (speed gate).
 */
export function containAgainstOpenings(
  body: Body,
  openings: readonly FrameOpening[],
): { body: Body; hit: boolean } {
  let { x, y, vx, vy, restingOn } = body;
  let hit = false;

  const inLeftGap = openings.some(
    (o) =>
      (o.facing === "left" || o.facing === "left-bottom") &&
      y >= o.y0 &&
      y <= o.y1,
  );
  if (!inLeftGap && x < SHIP_R) {
    const into = Math.max(0, -vx);
    x = SHIP_R;
    if (vx < 0) vx = 0;
    if (into >= MASS_HIT_SPEED) hit = true;
  }

  const inRightGap = openings.some(
    (o) =>
      (o.facing === "right" || o.facing === "right-bottom") &&
      y >= o.y0 &&
      y <= o.y1,
  );
  if (!inRightGap && x > WORLD_W - SHIP_R) {
    const into = Math.max(0, vx);
    x = WORLD_W - SHIP_R;
    if (vx > 0) vx = 0;
    if (into >= MASS_HIT_SPEED) hit = true;
  }

  const inDownGap = openings.some(
    (o) => o.facing === "down" && x >= o.x0 && x <= o.x1,
  );
  if (!inDownGap && y < SHIP_R) {
    const into = Math.max(0, -vy);
    y = SHIP_R;
    if (vy < 0) vy = 0;
    if (into >= MASS_HIT_SPEED) hit = true;
  }

  const inTopGap = openings.some(
    (o) => o.facing === "up" && x >= o.x0 && x <= o.x1,
  );
  if (!inTopGap && y > WORLD_H - SHIP_R) {
    const into = Math.max(0, vy);
    y = WORLD_H - SHIP_R;
    if (vy > 0) vy = 0;
    if (into >= MASS_HIT_SPEED) hit = true;
  }

  return { body: { x, y, vx, vy, restingOn }, hit };
}

/**
 * Soft frame walls once the exit is live: every edge seals except the exit gap.
 * Keeps the ship from OOB-restarting after Borealis is gathered.
 * `hit` is true only on a hard impact into a sealed edge (speed gate), so
 * callers can tax hull without draining HP while the ship rests on a wall.
 */
export function containAgainstExitFrame(
  body: Body,
  zone: ExitZone,
): { body: Body; hit: boolean } {
  return containAgainstOpenings(body, [openingFromExitZone(zone)]);
}
