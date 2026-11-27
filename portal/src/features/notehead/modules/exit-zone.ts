/**
 * Level exits. A level's exits come from its route file (see
 * `routes/scene.ts`); sealed frame edges block every other escape so the ship
 * must leave through an open gap (forward exit and/or reverse travel).
 */
import {
  MASS_HIT_SPEED,
  SHIP_R,
  WORLD_H,
  WORLD_W,
  type Body,
  type RegionId,
} from "./sim";

export type ExitFacing = "up" | "right";

/** Barrier + arrow in the level's SVG view space (+y down). */
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
export type OpeningFacing = "up" | "right" | "down";

export interface FrameOpening {
  facing: OpeningFacing;
  /** Inclusive world-space gap. Up/down use x0..x1; right uses y0..y1. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Match NoteheadApp / sim out-of-bounds margins. */
export const OOB_Y = 240;
export const OOB_X = 120;

/** Bottom-edge gap over world x in [x0, x1]. Fires on touch (see touchedOpening). */
export function bottomOpening(x0: number, x1: number): FrameOpening {
  return { facing: "down", x0, x1, y0: 0, y1: 0 };
}

/**
 * True when a falling ship's hull touches the frame floor inside a bottom gap.
 * Rising enter bodies (vy > 0) never fire, so rise-in arrivals stay safe.
 */
export function touchedOpening(
  opening: FrameOpening,
  body: { x: number; y: number; vy: number },
): boolean {
  if (opening.facing !== "down") return false;
  return (
    body.vy <= 0 &&
    body.y - SHIP_R <= 0 &&
    body.x >= opening.x0 &&
    body.x <= opening.x1
  );
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
  return body.x > WORLD_W + OOB_X && body.y >= y0 && body.y <= y1;
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

  if (x < SHIP_R) {
    const into = Math.max(0, -vx);
    x = SHIP_R;
    if (vx < 0) vx = 0;
    if (into >= MASS_HIT_SPEED) hit = true;
  }

  const inRightGap = openings.some(
    (o) => o.facing === "right" && y >= o.y0 && y <= o.y1,
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
