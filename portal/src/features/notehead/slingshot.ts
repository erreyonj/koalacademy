/**
 * Vertical slingshot: pull depth → launch speed, gravity, apex degree, hit test.
 * Height 0 is the cradle. Degrees sit at integer heights (spacing = 1).
 * Up is +y; the note you "play" is the apex, not any degree crossed on the way.
 */

export const DEGREE_SPACING = 1;
export const DEFAULT_GRAVITY = 18;
export const DEFAULT_MAX_PULL = 1.6;
export const DEFAULT_MAX_SPEED = 14;

export type FlightPhase = "flight" | "landed";

export interface FlightState {
  y: number;
  /** Upward positive. */
  vy: number;
  apexY: number;
  phase: FlightPhase;
  /** Degrees newly crossed while rising this step (lowest → highest). */
  crossedUp: number[];
}

export interface LaunchResult {
  apexDegree: number;
  hit: boolean;
}

/** Map pull depth (0..maxPull) to upward launch speed. */
export function pullToLaunchSpeed(
  pullDepth: number,
  maxPull = DEFAULT_MAX_PULL,
  maxSpeed = DEFAULT_MAX_SPEED,
): number {
  if (maxPull <= 0) return 0;
  const t = Math.max(0, Math.min(1, pullDepth / maxPull));
  return t * maxSpeed;
}

/** Nearest degree index for a height (clamped to the scale). */
export function heightToDegree(
  y: number,
  scaleLength: number,
  spacing = DEGREE_SPACING,
): number {
  if (scaleLength <= 0) return 0;
  const raw = Math.round(y / spacing);
  return Math.max(0, Math.min(scaleLength - 1, raw));
}

export function isApexHit(apexDegree: number, targetDegree: number): boolean {
  return apexDegree === targetDegree;
}

export function evaluateLaunch(
  apexY: number,
  targetDegree: number,
  scaleLength: number,
  spacing = DEGREE_SPACING,
): LaunchResult {
  const apexDegree = heightToDegree(apexY, scaleLength, spacing);
  return {
    apexDegree,
    hit: isApexHit(apexDegree, targetDegree),
  };
}

export function beginFlight(launchSpeed: number): FlightState {
  return {
    y: 0,
    vy: Math.max(0, launchSpeed),
    apexY: 0,
    phase: "flight",
    crossedUp: [],
  };
}

/**
 * Advance one frame. When the ship returns to y <= 0 with non-positive
 * velocity, the phase becomes `landed`.
 */
export function stepFlight(
  state: FlightState,
  dt: number,
  gravity = DEFAULT_GRAVITY,
  scaleLength: number,
  spacing = DEGREE_SPACING,
): FlightState {
  if (state.phase === "landed" || dt <= 0) {
    return { ...state, crossedUp: [] };
  }

  const prevY = state.y;
  let y = state.y + state.vy * dt;
  let vy = state.vy - gravity * dt;
  let apexY = Math.max(state.apexY, y);
  const crossedUp: number[] = [];

  if (vy >= 0 || y > prevY) {
    const prevDeg = Math.floor(prevY / spacing + 1e-9);
    const nextDeg = Math.floor(y / spacing + 1e-9);
    for (let d = prevDeg + 1; d <= nextDeg; d++) {
      if (d >= 0 && d < scaleLength) crossedUp.push(d);
    }
  }

  if (y <= 0 && vy <= 0) {
    return {
      y: 0,
      vy: 0,
      apexY: Math.max(apexY, 0),
      phase: "landed",
      crossedUp,
    };
  }

  return { y, vy, apexY, phase: "flight", crossedUp };
}

/** Analytic apex for tests: v² / (2g) from rest at y = 0. */
export function analyticApexY(launchSpeed: number, gravity = DEFAULT_GRAVITY): number {
  if (launchSpeed <= 0 || gravity <= 0) return 0;
  return (launchSpeed * launchSpeed) / (2 * gravity);
}
