/**
 * Tonation: banked energy earned by completing level intervals in pitch order.
 * Which levels host an interval lives in `routes/events/`.
 * Borealis collect order is free; only a correct interval sequence awards Tonation.
 */
import type { DifficultyId, PitchName } from "./sim";

/** Tutorial route Tonation cap (notch1 5 + stairs1 9 + zig1 10). */
export const TONATION_CAP = 24;

/** Tonic for scale-degree scoring. */
export const TONIC: PitchName = "C4";

const DEGREE: Partial<Record<PitchName, number>> = {
  C4: 1,
  D4: 2,
  E4: 3,
  F4: 4,
  G4: 5,
  A4: 6,
  B4: 7,
  C5: 8,
};

export interface IntervalChallenge {
  /** Required collect order for a Tonation award. */
  pitches: readonly PitchName[];
  /** Short HUD / teacher label. */
  label: string;
  /** Tonation banked on first successful clear of this level. */
  payout: number;
}

export interface RouteTonation {
  value: number;
  /** Level ids that have already paid out (idempotent awards). */
  earnedLevelIds: readonly string[];
}

export interface IntervalAttempt {
  /** Pitches gathered this attempt, in collect order. */
  collected: readonly PitchName[];
  /** True after a wrong-order collect — remaining gems lock until regen. */
  failed: boolean;
  /** True after the full required sequence this attempt. */
  succeeded: boolean;
}

export type CollectResult =
  | { kind: "progress"; attempt: IntervalAttempt }
  | { kind: "success"; attempt: IntervalAttempt }
  | { kind: "fail"; attempt: IntervalAttempt };

export function emptyRouteTonation(): RouteTonation {
  return { value: 0, earnedLevelIds: [] };
}

export function emptyAttempt(): IntervalAttempt {
  return { collected: [], failed: false, succeeded: false };
}

export function degreeValue(pitch: PitchName): number {
  return DEGREE[pitch] ?? 0;
}

export function clampTonation(value: number): number {
  return Math.max(0, Math.min(TONATION_CAP, Math.floor(value)));
}

/**
 * HUD pair for the current step of the challenge.
 * Notch: full pair. Multi-note: progressive next two pitches.
 */
export function intervalHudPair(
  challenge: IntervalChallenge,
  attempt: IntervalAttempt,
): readonly [PitchName, PitchName] | null {
  const { pitches } = challenge;
  if (pitches.length < 2) return null;
  if (attempt.failed || attempt.succeeded) {
    return [pitches[0]!, pitches[1]!];
  }
  const i = attempt.collected.length;
  if (i >= pitches.length - 1) {
    return [pitches[pitches.length - 2]!, pitches[pitches.length - 1]!];
  }
  return [pitches[i]!, pitches[i + 1]!];
}

/**
 * Feed one collected Borealis pitch into the attempt.
 * Wrong order fails the attempt (gem already consumed by caller).
 */
export function applyCollect(
  challenge: IntervalChallenge,
  attempt: IntervalAttempt,
  pitch: PitchName,
): CollectResult {
  if (attempt.failed || attempt.succeeded) {
    return { kind: attempt.succeeded ? "success" : "fail", attempt };
  }
  const nextIndex = attempt.collected.length;
  const expected = challenge.pitches[nextIndex];
  const collected = [...attempt.collected, pitch];
  if (expected === undefined || pitch !== expected) {
    const failed: IntervalAttempt = {
      collected,
      failed: true,
      succeeded: false,
    };
    return { kind: "fail", attempt: failed };
  }
  if (collected.length >= challenge.pitches.length) {
    const succeeded: IntervalAttempt = {
      collected,
      failed: false,
      succeeded: true,
    };
    return { kind: "success", attempt: succeeded };
  }
  const progress: IntervalAttempt = {
    collected,
    failed: false,
    succeeded: false,
  };
  return { kind: "progress", attempt: progress };
}

/** Bank payout once per level; clamps to TONATION_CAP. */
export function awardIfNew(
  route: RouteTonation,
  levelId: string,
  payout: number,
): RouteTonation {
  if (route.earnedLevelIds.includes(levelId)) return route;
  return {
    value: clampTonation(route.value + payout),
    earnedLevelIds: [...route.earnedLevelIds, levelId],
  };
}

/** Hard breach: wipe bank and earned flags. */
export function wipeTonation(): RouteTonation {
  return emptyRouteTonation();
}

export function tailTonationRequired(difficulty: DifficultyId): number {
  if (difficulty === "hard") return TONATION_CAP;
  return 19;
}

/** Easy: no hull gate (0). Medium ≥2, Hard ≥3. */
export function tailHullRequired(difficulty: DifficultyId): number {
  if (difficulty === "hard") return 3;
  if (difficulty === "medium") return 2;
  return 0;
}

/** Easy: tonation only. Medium/Hard also need a minimum hull. */
export function noteTailGateOk(
  tonation: number,
  hp: number,
  difficulty: DifficultyId,
): { ok: boolean; reason: string | null } {
  const needT = tailTonationRequired(difficulty);
  if (tonation < needT) {
    return { ok: false, reason: `Need ${needT} Tonation` };
  }
  const needH = tailHullRequired(difficulty);
  if (needH > 0 && hp < needH) {
    return { ok: false, reason: "Hull too low" };
  }
  return { ok: true, reason: null };
}
