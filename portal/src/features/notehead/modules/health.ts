/**
 * Hull HP: hard impacts cost 1; clearing an interval region restores HP.
 * Exit-frame barrier impacts cost HP on Hard only.
 */
import {
  LANDING_HIT_SPEED,
  MASS_BUMP_SPEED,
  MASS_HIT_SPEED,
  PROFILES,
  type DifficultyId,
} from "./sim";

export function maxHp(difficulty: DifficultyId): number {
  return PROFILES[difficulty].maxHp;
}

/** False when the profile opts out of hull (maxHp 0). */
export function hullEnabled(difficulty: DifficultyId): boolean {
  return maxHp(difficulty) > 0;
}

export function clampHp(hp: number, difficulty: DifficultyId): number {
  const cap = maxHp(difficulty);
  if (cap <= 0) return 0;
  return Math.max(0, Math.min(cap, Math.floor(hp)));
}

/** True when a ledge landing is fast enough to tax hull. */
export function isHardLanding(impactSpeed: number): boolean {
  return impactSpeed >= LANDING_HIT_SPEED;
}

/** True when a rock / exit-wall impact is fast enough to tax hull. */
export function isHardMassHit(intoSpeed: number): boolean {
  return intoSpeed >= MASS_HIT_SPEED;
}

/** True when a rock contact is hard enough for the soft-landing cue. */
export function isSoftMassBump(intoSpeed: number): boolean {
  return intoSpeed >= MASS_BUMP_SPEED && intoSpeed < MASS_HIT_SPEED;
}

/** Hard landing / rock impact costs one hull point (no-op when hull is off). */
export function applyLandingHit(hp: number, difficulty?: DifficultyId): number {
  if (difficulty && !hullEnabled(difficulty)) return hp;
  return Math.max(0, hp - 1);
}

/**
 * Sealed exit-frame barriers only tax hull on Hard — Easy/Medium bounce without
 * damage.
 */
export function applyExitBarrierHit(
  hp: number,
  difficulty: DifficultyId,
): number {
  if (difficulty !== "hard") return hp;
  return applyLandingHit(hp, difficulty);
}

/** First clear of an interval region: Easy/Med +3, Hard +1. */
export function applyRegionClearHeal(
  hp: number,
  difficulty: DifficultyId,
): number {
  if (!hullEnabled(difficulty)) return hp;
  const amount = difficulty === "hard" ? 1 : 3;
  return clampHp(hp + amount, difficulty);
}

/**
 * True when leaving a level should heal the hull: it hosts an interval, the
 * interval was completed, and this level has not healed before. Skipping the
 * interval carries hull damage forward.
 */
export function exitHealsHull(opts: {
  hasInterval: boolean;
  intervalCleared: boolean;
  alreadyHealed: boolean;
}): boolean {
  return opts.hasInterval && opts.intervalCleared && !opts.alreadyHealed;
}

/** Hard breach wipes Tonation; Easy/Medium keep the bank. */
export function breachWipesTonation(difficulty: DifficultyId): boolean {
  return difficulty === "hard";
}
