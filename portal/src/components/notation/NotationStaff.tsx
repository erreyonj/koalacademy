"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { pitchFromStaffLine } from "@/lib/notation/pitch";
import type { ScoreExcerpt } from "@/lib/notation/types";
import { clientToSvg, type HitEvent, type RenderResult } from "./renderScore";

export type StaffClick = {
  pitch: string;
  measureIndex: number;
};

export type KeyAreaClick = {
  action: "add" | "remove";
};

interface NotationStaffProps {
  score: ScoreExcerpt;
  interactive?: boolean;
  wrapSystems?: boolean;
  label?: string;
  onStaffClick?: (click: StaffClick) => void;
  onEventClick?: (hit: HitEvent, pitch: string) => void;
  onKeyAreaClick?: (click: KeyAreaClick) => void;
}

export function NotationStaff({
  score,
  interactive = false,
  wrapSystems = false,
  label = "Musical staff",
  onStaffClick,
  onEventClick,
  onKeyAreaClick,
}: NotationStaffProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<RenderResult | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    const draw = async () => {
      const { renderScore } = await import("./renderScore");
      if (cancelled || !hostRef.current) return;
      const width = Math.floor(hostRef.current.clientWidth) || 480;
      resultRef.current = await renderScore(hostRef.current, score, width, {
        wrapSystems,
      });
    };

    const observer = new ResizeObserver(() => {
      void draw();
    });
    observer.observe(host);
    void draw();

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [score, wrapSystems]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    const host = hostRef.current;
    const rendered = resultRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !rendered || !svg) return;

    const point = clientToSvg(svg, event.clientX, event.clientY);
    const staveInfo =
      rendered.staves.find(
        (entry) =>
          point.x >= entry.x &&
          point.x <= entry.x + entry.width &&
          point.y >= entry.y &&
          point.y <= entry.y + entry.height,
      ) ?? rendered.staves[0];
    if (!staveInfo) return;

    const first = rendered.staves[0];
    if (first && point.x < first.noteStartX) {
      const mid = first.x + (first.noteStartX - first.x) * 0.55;
      onKeyAreaClick?.({ action: point.x < mid ? "remove" : "add" });
      return;
    }

    const line = staveInfo.stave.getLineForY(point.y);
    const pitch = pitchFromStaffLine(score.clef, line);
    const hit = hitEvent(rendered.events, point.x, point.y);
    if (hit) {
      onEventClick?.(hit, pitch);
      return;
    }
    onStaffClick?.({ pitch, measureIndex: staveInfo.measureIndex });
  }

  return (
    <div
      className={`notation-staff${interactive ? " is-interactive" : ""}`}
      ref={hostRef}
      role="img"
      aria-label={label}
      onPointerDown={handlePointerDown}
    />
  );
}

function hitEvent(events: HitEvent[], x: number, y: number): HitEvent | null {
  const pad = 10;
  let best: HitEvent | null = null;
  let bestDist = Infinity;
  for (const event of events) {
    const inside =
      x >= event.x - pad &&
      x <= event.x + event.w + pad &&
      y >= event.y - pad &&
      y <= event.y + event.h + pad;
    if (!inside) continue;
    const cx = event.x + event.w / 2;
    const dist = Math.abs(x - cx);
    if (dist < bestDist) {
      best = event;
      bestDist = dist;
    }
  }
  return best;
}
