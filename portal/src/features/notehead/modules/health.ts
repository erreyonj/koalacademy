/**
 * Hull HP: landings cost 1; clearing a beat's Borealis restores 1.
 * Easy currently uses maxHp 0 — hull is off (no damage, no HUD).
 */
import type { Borealis } from "./borealis";
import { PROFILES, type DifficultyId } from "./sim";

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

/** Every landing from `step` costs one hull point (no-op when hull is off). */
export function applyLandingHit(hp: number, difficulty?: DifficultyId): number {
  if (difficulty && !hullEnabled(difficulty)) return hp;
  return Math.max(0, hp - 1);
}

/** Gathering every Borealis on the beat restores one hull point. */
export function applyBorealisHeal(hp: number, difficulty: DifficultyId): number {
  if (!hullEnabled(difficulty)) return hp;
  return clampHp(hp + 1, difficulty);
}

export function allBorealisCollected(list: readonly Borealis[]): boolean {
  return list.length > 0 && list.every((entry) => entry.collected);
}
