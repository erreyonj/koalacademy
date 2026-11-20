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

/**
 * Hull bleach while warp is held: a pinging beacon.
 * Quick ease to white on engage, smooth ease back to black, rest, repeat.
 */
/** Seconds between ping starts. */
export const WHOLE_PULSE_PERIOD = 1.15;
/** Seconds from black → white at the start of each ping. */
export const WHOLE_PULSE_RISE = 0.11;
/** Seconds from white → black after the peak. */
export const WHOLE_PULSE_FALL = 0.52;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * 0..1 hull bleach for Anachrometer warp time `elapsed` (seconds).
 * Beacon ping: rises right away, eases out, then rests black until the next.
 */
export function wholePulseAmount(elapsed: number): number {
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  const u =
    ((elapsed % WHOLE_PULSE_PERIOD) + WHOLE_PULSE_PERIOD) % WHOLE_PULSE_PERIOD;
  if (u < WHOLE_PULSE_RISE) {
    return smoothstep(u / WHOLE_PULSE_RISE);
  }
  const afterPeak = u - WHOLE_PULSE_RISE;
  if (afterPeak < WHOLE_PULSE_FALL) {
    return 1 - smoothstep(afterPeak / WHOLE_PULSE_FALL);
  }
  return 0;
}

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
