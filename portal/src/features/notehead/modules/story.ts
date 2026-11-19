/**
 * Captain monologue (CM) and game interrupt (GI) copy.
 * Draft source: story-content.md — this module is what the game reads.
 */
import type { BeatId } from "./progress";

export type InterruptKind = "cm" | "gi";

export type StoryEventId =
  | "launch-enter"
  | "launch-guide-miss"
  | "notch-calibrate-enter"
  | "notch-calibrate-first-warp"
  | "notch-calibrate-hull-hit"
  | "notch-calibrate-hull-breach"
  | "notch-calibrate-exit"
  | "launch-tail-enter";

/** Optional one-shot SFX when a CM/GI line begins. */
export type StoryLineSfx = "anach-repair";

/** One interrupt box: advance through `lines`, then dismiss / queue next. */
export interface StoryInterrupt {
  kind: InterruptKind;
  speaker: string;
  lines: readonly string[];
  /** Parallel to `lines` — play when that line index starts. */
  lineSfx?: readonly (StoryLineSfx | null)[];
  /** Optional HUD accent while this interrupt is on screen. */
  accent?: "hull";
}

const CAPTAIN = "Captain LittleCastle";
const SYSTEM = "Notehead";

const EVENTS: Record<StoryEventId, readonly StoryInterrupt[]> = {
  "launch-enter": [
    {
      kind: "cm",
      speaker: CAPTAIN,
      lines: [
        "Darn it!... This planet had a huge Borealis reading, but that landing scattered every one of the ship's Note-Tails...",
        "Wait a minute... there's almost no Tonal Force on this planet either!! The ship will need to be recalibrated. At least the Frequency Band is still working...",
      ],
    },
    {
      kind: "gi",
      speaker: SYSTEM,
      lines: ["Pull the ship against the Frequency Band to launch the ship"],
    },
  ],
  "launch-guide-miss": [
    {
      kind: "cm",
      speaker: CAPTAIN,
      lines: ["Hmm. Gotta try a stronger pull!"],
    },
  ],
  "notch-calibrate-enter": [
    {
      kind: "cm",
      speaker: CAPTAIN,
      lines: [
        "Great... the ship's hull can't take much more of those!",
        "We need to mitigate our fall speed",
        "I'll try to divert power away from some damaged components to repair the Anachrometer!",
        "... ... ...",
        "... ... ...",
        "Got it!",
      ],
      lineSfx: [null, null, null, null, null, "anach-repair"],
    },
  ],
  "notch-calibrate-first-warp": [
    {
      kind: "gi",
      speaker: SYSTEM,
      lines: [
        "You can now engage the Anachrometer! Pull against the band in mid air to jump again!",
      ],
    },
  ],
  "notch-calibrate-hull-hit": [
    {
      kind: "gi",
      speaker: SYSTEM,
      accent: "hull",
      lines: ["Hard hits against terrain damage the hull"],
    },
  ],
  "notch-calibrate-hull-breach": [
    {
      kind: "gi",
      speaker: SYSTEM,
      lines: [
        "If there's a breach the Anachrometer resets you to try again.",
      ],
    },
  ],
  "notch-calibrate-exit": [
    {
      kind: "gi",
      speaker: SYSTEM,
      lines: [
        "Collecting Borealis orbs repairs the ship's tonal calibration so you can repair the Note-Tails and gain new abilities!",
      ],
    },
  ],
  "launch-tail-enter": [
    {
      kind: "cm",
      speaker: CAPTAIN,
      lines: [
        "Wait a minute… that reading — that's a Note-Tail signature!!",
        "The first missing tail… it's floating right above the Frequency Band. Grab it!",
      ],
    },
    {
      kind: "gi",
      speaker: SYSTEM,
      lines: ["Launch up and collect the Note-Tail"],
    },
  ],
};

export function interruptsForEvent(
  id: StoryEventId,
): readonly StoryInterrupt[] {
  return EVENTS[id] ?? [];
}

/** Story events to queue when entering a beat (debug jump included). */
export function enterEventsForBeat(id: BeatId): readonly StoryEventId[] {
  if (id === "launch-teach") return ["launch-enter"];
  if (id === "notch-calibrate") return ["notch-calibrate-enter"];
  if (id === "launch-tail") return ["launch-tail-enter"];
  return [];
}
