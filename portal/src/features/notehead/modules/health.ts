/**
 * Hull HP: hard impacts cost 1; clearing a beat's Borealis restores 1.
 * Exit-frame barrier impacts cost HP on Hard only.
 */
import type { Borealis } from "./borealis";
import { LANDING_HIT_SPEED, PROFILES, type DifficultyId } from "./sim";

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

/** Hard landing / rock impact costs one hull point (no-op when hull is off). */
export function applyLandingHit(hp: number, difficulty?: DifficultyId): number {
  if (difficulty && !hullEnabled(difficulty)) return hp;
  return Math.max(0, hp - 1);
}

/**
 * Sealed exit-frame barriers only tax hull on Hard — Easy/Medium bounce without
 * damage so gathering Borealis does not soft-lock into a hull death.
 */
export function applyExitBarrierHit(
  hp: number,
  difficulty: DifficultyId,
): number {
  if (difficulty !== "hard") return hp;
  return applyLandingHit(hp, difficulty);
}

/** Gathering every Borealis on the beat restores one hull point. */
export function applyBorealisHeal(hp: number, difficulty: DifficultyId): number {
  if (!hullEnabled(difficulty)) return hp;
  return clampHp(hp + 1, difficulty);
}

export function allBorealisCollected(list: readonly Borealis[]): boolean {
  return list.length > 0 && list.every((entry) => entry.collected);
}
