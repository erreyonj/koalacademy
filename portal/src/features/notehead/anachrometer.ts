/**
 * Press-to-warp Anachrometer: slow time, place a Frequency Band under the
 * ship, and let the player pull while the ship is still moving.
 */
import {
  SHIP_R,
  type Body,
  type Ledge,
  type PitchName,
} from "./sim";

export const WARP_BAND_ID = "warp-band";
export const WARP_TIME_SCALE = 0.10;
/** Half-width of the transient band in logical pixels. */
export const WARP_HALF = 90;

export function isWarpBand(id: string | null): boolean {
  return id === WARP_BAND_ID;
}

/** Transient Frequency Band centered under the ship. */
export function makeWarpBand(
  body: Body,
  pitch: PitchName = "C4",
): Ledge {
  return {
    id: WARP_BAND_ID,
    x0: body.x - WARP_HALF,
    x1: body.x + WARP_HALF,
    y: body.y - SHIP_R,
    pitch,
    kind: "band",
  };
}

/**
 * Engage a warp without killing velocity. The band tracks the ship while the
 * player pulls; release applies a new launch from the current pose.
 */
export function engageWarp(
  body: Body,
  pitch: PitchName = "C4",
): { body: Body; warp: Ledge } {
  return {
    body: { ...body, restingOn: null },
    warp: makeWarpBand(body, pitch),
  };
}

/** Keep the warp band under the ship as it drifts. */
export function followWarpBand(
  body: Body,
  pitch: PitchName = "C4",
): Ledge {
  return makeWarpBand(body, pitch);
}

/**
 * Press-to-warp while airborne, Anachrometer on, and no warp already active.
 */
export function canWarp(
  anachrometer: boolean,
  restingOn: string | null,
  warpActive: boolean,
): boolean {
  return anachrometer && restingOn === null && !warpActive;
}
