"use client";

import { createRoot, type Root } from "react-dom/client";
import type { Region, ShotSample } from "../sim";
import type { FrameGesture, NoteheadView } from "../view";
import { LaunchArt } from "./LaunchSite";
import { NotchArt } from "./CanyonRun";
import { StairArt } from "./StairCave";

function SceneArt({
  sample,
  region,
  gesture,
}: {
  sample: ShotSample;
  region: Region;
  gesture: FrameGesture;
}) {
  if (region.id === "stairs") {
    return <StairArt body={sample.body} gesture={gesture} />;
  }
  if (region.id === "notch") {
    return <NotchArt body={sample.body} gesture={gesture} />;
  }
  return (
    <LaunchArt
      body={sample.body}
      gesture={gesture}
      goalPitch={region.goalPitch}
    />
  );
}

/** SVG adapter for NoteheadView. The sim never imports this module. */
export class SvgNoteheadView implements NoteheadView {
  private root: Root | null = null;
  private host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    this.host = host;
    this.root = createRoot(host);
  }

  resize(width: number, height: number): void {
    if (!this.host) return;
    this.host.style.width = `${width}px`;
    this.host.style.height = `${height}px`;
  }

  frame(sample: ShotSample, region: Region, gesture: FrameGesture): void {
    this.root?.render(
      <SceneArt sample={sample} region={region} gesture={gesture} />,
    );
  }

  unmount(): void {
    this.root?.unmount();
    this.root = null;
    this.host = null;
  }
}
