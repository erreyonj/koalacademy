/**
 * Where the ship's bright rim points and what color it is.
 * Angles are in view space (+y down), so -π/2 is straight up.
 *
 * Color: blue rising / at rest; blue→yellow while falling (hotter near ground);
 * red flash only when HP is lost (not Frequency Band landings).
 */
import {
  SHIP_R,
  ledgeYAt,
  type Body,
  type Ledge,
} from "./sim";
import type { FrameGesture } from "./view";

export interface ShipGlow {
  /** Radians. The bright edge of the rim faces this way. */
  angle: number;
  /** 1 rising, 0 level, -1 falling. Heading cue. */
  lift: number;
  /** 0 at rest, 1 at a full-power shot. Sets the trail. */
  energy: number;
  /** 0..1 blue→yellow while falling / near terrain. */
  warn: number;
  /** 0..1 red flash after HP loss. */
  sting: number;
}

const UP = -Math.PI / 2;

export const REST_GLOW: ShipGlow = {
  angle: UP,
  lift: 1,
  energy: 0,
  warn: 0,
  sting: 0,
};

/** Below this speed the ship has no heading worth turning the rim for. */
const MIN_SPEED = 60;
/** Vertical speed that reads as fully rising or fully falling. */
const LIFT_SPEED = 620;
/** Speed that reads as full energy. */
const FULL_SPEED = 1500;
/** Fall speed that maxes the yellow velocity cue. */
export const FALL_WARN_SPEED = 900;
/** Clearance (logical) that maxes the near-ground yellow cue. */
export const WARN_CLEARANCE = 220;

const TURN_RATE = 14;
const HUE_RATE = 9;
const WARN_RATE = 10;
const STING_RISE = 20;
const STING_FALL = 5;
const ENERGY_RISE = 8;
const ENERGY_FALL = 16;

type Rgb = readonly [number, number, number];

const RISING: Rgb = [79, 193, 246];
const LEVEL: Rgb = [241, 207, 72];
const FALLING: Rgb = [238, 79, 74];

function wrap(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

function smooth(from: number, to: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** Gap from ship bottom to the nearest ledge surface below. */
export function clearanceBelow(
  body: Body,
  ledges: readonly Ledge[],
): number {
  const bottom = body.y - SHIP_R;
  let best = Number.POSITIVE_INFINITY;
  for (const ledge of ledges) {
    if (body.x < ledge.x0 || body.x > ledge.x1) continue;
    const surface = ledgeYAt(ledge, body.x);
    if (surface >= bottom - 1) continue;
    best = Math.min(best, bottom - surface);
  }
  return best;
}

/**
 * Yellow danger while falling: fall speed + near-ground proximity.
 * Strongest just before impact.
 */
export function fallWarn(body: Body, clearance: number): number {
  if (body.restingOn || body.vy >= -40) return 0;
  const speed = Math.min(1, -body.vy / FALL_WARN_SPEED);
  const near =
    Number.isFinite(clearance)
      ? 1 - Math.min(1, Math.max(0, clearance / WARN_CLEARANCE))
      : 0;
  return Math.min(1, speed * 0.4 + near * near * 0.75 + speed * near * 0.25);
}

/** What the rim should settle on for this frame. */
export function glowTarget(
  body: Body,
  gesture: Pick<
    FrameGesture,
    "phase" | "power" | "angle" | "clearance" | "sting"
  >,
  heading: number,
): ShipGlow {
  if (gesture.phase === "pulling") {
    if (gesture.power < 0.02) {
      return { ...REST_GLOW, sting: gesture.sting };
    }
    return {
      angle: Math.atan2(Math.cos(gesture.angle), -Math.sin(gesture.angle)),
      lift: 1,
      energy: 0,
      warn: 0,
      sting: gesture.sting,
    };
  }
  if (gesture.phase !== "flight" || body.restingOn) {
    return { ...REST_GLOW, sting: gesture.sting };
  }

  const speed = Math.hypot(body.vx, body.vy);
  return {
    angle: speed > MIN_SPEED ? Math.atan2(-body.vy, body.vx) : heading,
    lift: body.vy / Math.max(speed, LIFT_SPEED),
    energy: Math.min(1, speed / FULL_SPEED),
    warn: fallWarn(body, gesture.clearance),
    sting: gesture.sting,
  };
}

/**
 * Ease toward the target. The rim turns the short way round, and the trail
 * only builds once the rim faces the way the ship is going.
 */
export function easeGlow(from: ShipGlow, to: ShipGlow, dt: number): ShipGlow {
  if (dt <= 0) return from;
  const toward = (rate: number) => 1 - Math.exp(-rate * dt);
  const turn = wrap(to.angle - from.angle);
  const energy = to.energy * Math.max(0, Math.cos(turn));
  const energyRate = energy < from.energy ? ENERGY_FALL : ENERGY_RISE;
  const stingRate = to.sting < from.sting ? STING_FALL : STING_RISE;
  return {
    angle: wrap(from.angle + turn * toward(TURN_RATE)),
    lift: from.lift + (to.lift - from.lift) * toward(HUE_RATE),
    energy: from.energy + (energy - from.energy) * toward(energyRate),
    warn: from.warn + (to.warn - from.warn) * toward(WARN_RATE),
    sting: from.sting + (to.sting - from.sting) * toward(stingRate),
  };
}

function blend(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Blue while rising / calm. Blue→yellow as fall warn rises.
 * Red only from sting (HP loss).
 */
export function glowRgb(glow: Pick<ShipGlow, "lift" | "warn" | "sting">): Rgb {
  let base: Rgb = RISING;
  if (glow.lift > 0.15 && glow.warn < 0.08) {
    base = RISING;
  } else if (glow.warn > 0.01) {
    base = blend(RISING, LEVEL, smooth(0.05, 0.95, glow.warn));
  } else if (glow.lift < -0.05) {
    // Slow fall with no proximity yet — hint of yellow.
    base = blend(RISING, LEVEL, smooth(0, 0.5, -glow.lift));
  }
  if (glow.sting > 0.02) {
    return blend(base, FALLING, smooth(0.05, 0.9, glow.sting));
  }
  return base;
}

export function glowColor(
  glow: Pick<ShipGlow, "lift" | "warn" | "sting"> | number,
  toward: Rgb | null = null,
  mix = 0,
): string {
  const channels =
    typeof glow === "number"
      ? glowRgb({ lift: glow, warn: glow < 0 ? Math.abs(glow) : 0, sting: 0 })
      : glowRgb(glow);
  const [r, g, b] = toward ? blend(channels, toward, mix) : channels;
  return `rgb(${r} ${g} ${b})`;
}

/** 0 until the ship is clearly moving, then up to 1. */
export function trailStrength(energy: number): number {
  return smooth(0.12, 0.4, energy);
}
