/**
 * The tutorial route (`../notch1.route.json`, origin `landing1`). It carries
 * the game's special events: the slingshot lesson on `landing1` (the start;
 * breaking its band crashes the ship into `notch1`), the Anachrometer repair
 * and first Tonation interval on `notch1`, an interval on each of `stairs1`
 * and `zig1`, and the first Note-Tail on `8thTail1`.
 */
import type { RouteEvents } from "./types";

/**
 * Logical height of the pocket shelf on notch1: the first rise past it teaches
 * the Anachrometer. Not drawn.
 */
export const NOTCH1_TEACH_Y = 906;

export const TUTORIAL_EVENTS: RouteEvents = {
  routeId: "zig1perspective",
  levels: {
    landing1: {
      enter: ["launch-enter"],
      slingshot: {
        goal: "G4",
        miss: "launch-guide-miss",
        hint: "Pull the Frequency Band. Reach the guide, then the fall will break through.",
        clearHint: "Through the band",
      },
    },
    notch1: {
      enter: ["notch-calibrate-enter"],
      grant: { anachrometer: true },
      riseGate: { y: NOTCH1_TEACH_Y, event: "notch-calibrate-first-warp" },
      // Block (high) E4, then pocket (low) A4.
      tonation: { pitches: ["E4", "A4"], label: "Ascending 4th", payout: 5 },
      hull: {
        hit: "notch-calibrate-hull-hit",
        breach: "notch-calibrate-hull-breach",
      },
      departMs: 280,
    },
    stairs1: {
      tonation: { pitches: ["C4", "E4", "G4"], label: "Arpeggio", payout: 9 },
    },
    zig1perspective: {
      enter: ["zig-perspective-enter"],
      tonation: { pitches: ["C4", "E4", "A4"], label: "Contour", payout: 10 },
    },
    "8thTail1": {
      enter: ["8thTail1-enter"],
      // Above the band, outside the start magnet range.
      noteTail: { x: 450, y: 724 },
    },
  },
};
