"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { PaletteId } from "@/lib/notation/noteColors";
import { pitchFromStaffLine } from "@/lib/notation/pitch";
import type { ScoreExcerpt } from "@/lib/notation/types";
import {
  clientToSvg,
  type HitEvent,
  type PlayHighlight,
  type RenderResult,
} from "./renderScore";

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
  /** Uniform zoom for the drawn staff (1 = default). */
  scale?: number;
  /** Tighter vertical canvas so the staff fills more of the box. */
  compact?: boolean;
  /** Now-playing note flash (pattern 2). */
  highlight?: PlayHighlight | null;
  /** When true, playback highlight uses the palette color. */
  colorize?: boolean;
  /** Active absolute-pitch palette. */
  paletteId?: PaletteId;
  label?: string;
  onStaffClick?: (click: StaffClick) => void;
  onEventClick?: (hit: HitEvent, pitch: string) => void;
  onEventDoubleClick?: (hit: HitEvent) => void;
  onKeyAreaClick?: (click: KeyAreaClick) => void;
}

const DOUBLE_CLICK_MS = 350;

export function NotationStaff({
  score,
  interactive = false,
  wrapSystems = false,
  scale = 1,
  compact = false,
  highlight = null,
  colorize = false,
  paletteId = "roygbiv",
  label = "Musical staff",
  onStaffClick,
  onEventClick,
  onEventDoubleClick,
  onKeyAreaClick,
}: NotationStaffProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<RenderResult | null>(null);
  const pendingEventClickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // pointerdown.detail is always 0 in Chrome — track double-clicks ourselves.
  const lastEventTapRef = useRef<{ key: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearPendingEventClick() {
    if (pendingEventClickRef.current == null) return;
    clearTimeout(pendingEventClickRef.current);
    pendingEventClickRef.current = null;
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    const draw = async () => {
      try {
        const { renderScore } = await import("./renderScore");
        if (cancelled || !hostRef.current) return;
        const zoom = scale > 0 ? scale : 1;
        const cssWidth = hostRef.current.clientWidth || 480;
        const width = Math.max(240, Math.floor(cssWidth / zoom));
        resultRef.current = await renderScore(hostRef.current, score, width, {
          wrapSystems,
          highlight,
          colorize,
          paletteId,
          ...(compact
            ? {
                systemTop: 20,
                // Wrapped systems need room for stems/beams so rows don't overlap.
                systemHeight: wrapSystems ? 155 : 112,
              }
            : {}),
        });
        if (!cancelled) setError(null);
      } catch (err) {
        if (cancelled) return;
        resultRef.current = null;
        const message =
          err instanceof Error ? err.message : "Could not render the staff.";
        setError(message);
        if (hostRef.current) {
          hostRef.current.innerHTML = "";
        }
      }
    };

    const observer = new ResizeObserver(() => {
      void draw();
    });
    observer.observe(host);
    void draw();

    return () => {
      cancelled = true;
      observer.disconnect();
      clearPendingEventClick();
    };
  }, [score, wrapSystems, scale, compact, highlight, colorize, paletteId]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || error) return;
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
    // Key-signature clicks only apply on the first system — later systems start
    // further left without a clef, so x < first.noteStartX would steal note hits.
    const onFirstSystem =
      first != null &&
      point.y >= first.y - 8 &&
      point.y <= first.y + first.height + 8;
    if (onFirstSystem && first && point.x < first.noteStartX) {
      clearPendingEventClick();
      const mid = first.x + (first.noteStartX - first.x) * 0.55;
      onKeyAreaClick?.({ action: point.x < mid ? "remove" : "add" });
      return;
    }

    const line = staveInfo.stave.getLineForY(point.y);
    const pitch = pitchFromStaffLine(score.clef, line);
    const hit = hitEvent(rendered.events, point.x, point.y, staveInfo.measureIndex);
    if (hit) {
      const hitKey = `${hit.measureIndex}:${hit.eventIndex}`;
      const now = performance.now();
      const prev = lastEventTapRef.current;
      const isDouble =
        prev != null && prev.key === hitKey && now - prev.at <= DOUBLE_CLICK_MS;
      if (isDouble) {
        clearPendingEventClick();
        lastEventTapRef.current = null;
        onEventDoubleClick?.(hit);
        return;
      }
      lastEventTapRef.current = { key: hitKey, at: now };
      // Defer so a double-click can cancel and remove instead of replace.
      clearPendingEventClick();
      pendingEventClickRef.current = setTimeout(() => {
        pendingEventClickRef.current = null;
        onEventClick?.(hit, pitch);
      }, DOUBLE_CLICK_MS);
      return;
    }
    clearPendingEventClick();
    lastEventTapRef.current = null;
    onStaffClick?.({ pitch, measureIndex: staveInfo.measureIndex });
  }

  return (
    <div
      className={`notation-staff${interactive ? " is-interactive" : ""}${error ? " has-error" : ""}`}
      role="img"
      aria-label={error ? `Notation error: ${error}` : label}
      onPointerDown={handlePointerDown}
    >
      {/* SVG host is separate so renderScore's innerHTML wipe does not remove the error UI. */}
      <div className="notation-staff-host" ref={hostRef} />
      {error ? (
        <p className="notation-staff-error" role="alert">
          Notation could not load ({error}). Try refreshing the page.
        </p>
      ) : null}
    </div>
  );
}

function hitEvent(
  events: HitEvent[],
  x: number,
  y: number,
  preferMeasure?: number,
): HitEvent | null {
  const pad = 10;
  let best: HitEvent | null = null;
  let bestScore = Infinity;
  for (const event of events) {
    const inside =
      x >= event.x - pad &&
      x <= event.x + event.w + pad &&
      y >= event.y - pad &&
      y <= event.y + event.h + pad;
    if (!inside) continue;
    const cx = event.x + event.w / 2;
    const cy = event.y + event.h / 2;
    // Prefer same-measure hits, then nearest 2D center (avoids cross-system steals).
    const measureBias =
      preferMeasure != null && event.measureIndex !== preferMeasure ? 40 : 0;
    const dist = Math.hypot(x - cx, y - cy) + measureBias;
    if (dist < bestScore) {
      best = event;
      bestScore = dist;
    }
  }
  return best;
}
