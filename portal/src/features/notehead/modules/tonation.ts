/**
 * Tonation: banked energy earned by completing region intervals in pitch order.
 * Borealis collect order is free; only a correct interval sequence awards Tonation.
 */
import type { BeatId } from "./progress";
import type { DifficultyId, PitchName } from "./sim";

/** Route Tonation cap (Notch 5 + Stairs 9 + Zig 10). */
export const TONATION_CAP = 24;

/** Tonic for scale-degree scoring (Stairs / Zig). */
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
  /** Tonation banked on first successful clear of this beat. */
  payout: number;
}

export interface RouteTonation {
  value: number;
  /** Beats that have already paid out (idempotent awards). */
  earnedBeatIds: readonly BeatId[];
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

const CHALLENGES: Partial<Record<BeatId, IntervalChallenge>> = {
  "notch-calibrate": {
    // Block (high shelf) E4 → pocket (low shelf) A4.
    pitches: ["E4", "A4"],
    label: "Ascending 4th",
    // Pedagogy payout for a fourth (1+4), not E=3+A=6.
    payout: 5,
  },
  "stairs-anach": {
    pitches: ["C4", "E4", "G4"],
    label: "Arpeggio",
    payout: 9,
  },
  "zig-1": {
    pitches: ["C4", "E4", "A4"],
    label: "Contour",
    payout: 10,
  },
};

/** Beats that heal on first route clear and host an interval challenge. */
export const INTERVAL_BEATS: readonly BeatId[] = [
  "notch-calibrate",
  "stairs-anach",
  "zig-1",
];

export function emptyRouteTonation(): RouteTonation {
  return { value: 0, earnedBeatIds: [] };
}

export function emptyAttempt(): IntervalAttempt {
  return { collected: [], failed: false, succeeded: false };
}

export function degreeValue(pitch: PitchName): number {
  return DEGREE[pitch] ?? 0;
}

export function challengeFor(beatId: BeatId): IntervalChallenge | null {
  return CHALLENGES[beatId] ?? null;
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

/** Bank payout once per beat; clamps to TONATION_CAP. */
export function awardIfNew(
  route: RouteTonation,
  beatId: BeatId,
  payout: number,
): RouteTonation {
  if (route.earnedBeatIds.includes(beatId)) return route;
  return {
    value: clampTonation(route.value + payout),
    earnedBeatIds: [...route.earnedBeatIds, beatId],
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
