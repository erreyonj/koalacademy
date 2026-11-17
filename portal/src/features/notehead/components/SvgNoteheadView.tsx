"use client";

import { createRoot, type Root } from "react-dom/client";
import { REST_GLOW, easeGlow, glowTarget, type ShipGlow } from "../momentum";
import type { Ledge, Region, ShotSample } from "../sim";
import type { FrameGesture, NoteheadView } from "../view";
import { LaunchArt } from "./LaunchSite";
import { NotchArt } from "./CanyonRun";
import type { ShipLook } from "./Ship";
import { StairArt } from "./StairCave";
import { ZigArt } from "./ZigRun";

function SceneArt({
  sample,
  region,
  gesture,
  look,
  warp,
}: {
  sample: ShotSample;
  region: Region;
  gesture: FrameGesture;
  look: ShipLook;
  warp: Ledge | null;
}) {
  if (region.id === "stairs") {
    return (
      <StairArt body={sample.body} gesture={gesture} look={look} warp={warp} />
    );
  }
  if (region.id === "notch") {
    return (
      <NotchArt body={sample.body} gesture={gesture} look={look} warp={warp} />
    );
  }
  if (region.id === "zig") {
    return (
      <ZigArt body={sample.body} gesture={gesture} look={look} warp={warp} />
    );
  }
  return (
    <LaunchArt
      body={sample.body}
      gesture={gesture}
      goalPitch={region.goalPitch}
      look={look}
      warp={warp}
    />
  );
}

/** SVG adapter for NoteheadView. The sim never imports this module. */
export class SvgNoteheadView implements NoteheadView {
  private root: Root | null = null;
  private host: HTMLElement | null = null;
  /** Eased between frames here, so the rim glides when React re-renders the scene. */
  private glow: ShipGlow = REST_GLOW;
  private lastFrame = 0;
  private still = false;

  mount(host: HTMLElement): void {
    this.host = host;
    this.root = createRoot(host);
    this.still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  resize(width: number, height: number): void {
    if (!this.host) return;
    this.host.style.width = `${Math.max(1, Math.floor(width))}px`;
    this.host.style.height = `${Math.max(1, Math.floor(height))}px`;
  }

  frame(sample: ShotSample, region: Region, gesture: FrameGesture): void {
    const now = performance.now() / 1000;
    const dt = this.lastFrame ? Math.min(0.05, now - this.lastFrame) : 0;
    this.lastFrame = now;
    this.glow = easeGlow(
      this.glow,
      glowTarget(sample.body, gesture, this.glow.angle),
      dt,
    );
    this.root?.render(
      <SceneArt
        sample={sample}
        region={region}
        gesture={gesture}
        look={{ glow: this.glow, clock: now, still: this.still }}
        warp={gesture.warp}
      />,
    );
  }

  unmount(): void {
    this.root?.unmount();
    this.root = null;
    this.host = null;
  }
}
