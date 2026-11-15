import type { Region, ShotSample } from "./sim";

export type GesturePhase = "idle" | "pulling" | "flight" | "sparkle";

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
