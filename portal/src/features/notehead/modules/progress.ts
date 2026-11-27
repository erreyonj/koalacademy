/**
 * Run progress that is not part of a level's geometry: the slingshot lesson's
 * rules, the ship's repairs, and which stories have played. A route's own
 * travel lives in `routes/runtime.ts`, and its special events in
 * `routes/events/`.
 */
import { engageWarp, WARP_BAND_ID } from "./anachrometer";
import {
  type AimMode,
  type Ledge,
  type PitchName,
  type ShipRepair,
  type StepPolicy,
  BREAK_SPEED,
  LAUNCH_SPACING,
  ledgesFor,
  pitchIndex,
} from "./sim";

/** While the slingshot lesson is live the pull is vertical; otherwise free. */
export function aimModeFor(slingshot: boolean): AimMode {
  return slingshot ? "vertical" : "free";
}

/** Persistent flags for freer travel. */
export interface RouteMemory {
  /** Places whose enter CM/GI already ran. */
  storySeen: readonly string[];
}

export function emptyRouteMemory(): RouteMemory {
  return { storySeen: [] };
}

export function markStorySeen(memory: RouteMemory, id: string): RouteMemory {
  if (memory.storySeen.includes(id)) return memory;
  return { ...memory, storySeen: [...memory.storySeen, id] };
}

/** What the slingshot needs to judge a flight. */
export interface SlingshotFlight {
  /** The guide height was crossed while rising. */
  crossedGoal: boolean;
  /** Fell through the band without landing (break-through). */
  brokeBand: boolean;
}

export interface SlingshotClear {
  cleared: boolean;
  hint: string;
}

/** The slingshot is done once the guide is crossed and the fall breaks the band. */
export function evaluateSlingshot(flight: SlingshotFlight): SlingshotClear {
  const cleared = flight.crossedGoal && flight.brokeBand;
  return {
    cleared,
    hint: cleared
      ? "Through the band"
      : flight.crossedGoal
        ? "Fall through the band"
        : "Reach the guide on the way up",
  };
}

/** Logical height of the guide line: `goal` scale degrees above `band`. */
export function guideY(band: Ledge, goal: PitchName): number {
  const index = Math.max(0, pitchIndex(goal));
  return band.y + (index + 1) * LAUNCH_SPACING;
}

/**
 * The band stays soft until the guide is crossed, then lets the fall through.
 * Without the lesson (or once it is done) bands always catch.
 */
export function stepPolicyFor(
  slingshot: boolean,
  crossedGoal = false,
): StepPolicy {
  if (slingshot) {
    return { breakSpeed: BREAK_SPEED, catchBands: !crossedGoal };
  }
  return { breakSpeed: BREAK_SPEED, catchBands: true };
}

/** Ledges for a region plus optional exit / warp bands. */
export function liveLedges(
  regionId: string,
  warp: Ledge | null,
  exitBand: Ledge | null = null,
): readonly Ledge[] {
  const base = ledgesFor(regionId);
  const withExit = exitBand ? [...base, exitBand] : base;
  if (!warp) return withExit;
  return [...withExit, warp];
}

export function emptyRepair(): ShipRepair {
  return { anachrometer: false, tails: [] };
}

/** Engage a mid-flight warp under `body` without killing velocity. */
export function applyWarp(
  body: Parameters<typeof engageWarp>[0],
  pitch: PitchName = "C4",
): ReturnType<typeof engageWarp> {
  return engageWarp(body, pitch);
}

export { WARP_BAND_ID };
