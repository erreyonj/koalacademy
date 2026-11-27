import type { Borealis } from "./borealis";
import type { NoteTail } from "./note-tail";
import type { Ledge, Region, ShotSample } from "./sim";

export type GesturePhase =
  | "idle"
  | "pulling"
  | "flight"
  | "sparkle"
  /** Hull at 0 HP — ship shatter, then GI / level restart. */
  | "breach";

/** Aim and phase sit beside the sample. They are gesture state, not sim state. */
export interface FrameGesture {
  power: number;
  /** Radians from straight up. Positive aims to the right. */
  angle: number;
  phase: GesturePhase;
  visited: readonly string[];
  /** Logical-space preview of the shot under the current aim. Empty unless pulling. */
  chart: readonly { x: number; y: number }[];
  chartApex: { x: number; y: number } | null;
  /** Transient Anachrometer band, if any. */
  warp: Ledge | null;
  /** Exit Frequency Band planted after the last Borealis, if any. */
  exitBand: Ledge | null;
  /** Live Borealis pickups for this level. */
  borealis: readonly Borealis[];
  /** Floating Note-Tail pickup, when this level has one. */
  noteTail: NoteTail | null;
  /** Logical height of the slingshot guide line, while that lesson is live. */
  guide: number | null;
  /**
   * Slingshot break-through impact in logical space, if the Frequency Band
   * has snapped this flight.
   */
  bandBreak: { x: number; y: number } | null;
  /** Gap to terrain below (logical). Large when open sky. */
  clearance: number;
  /** 0..1 red flash after HP loss (not Frequency Band landings). */
  sting: number;
}

/** SVG offset for the band and ship while the player is dragging. */
export function pullOffsetSvg(
  angle: number,
  power: number,
): { x: number; y: number } {
  const mag = power * 34;
  return { x: -Math.sin(angle) * mag, y: Math.cos(angle) * mag };
}

export interface NoteheadView {
  mount(host: HTMLElement): void;
  resize(width: number, height: number): void;
  frame(sample: ShotSample, region: Region, gesture: FrameGesture): void;
  unmount(): void;
}
