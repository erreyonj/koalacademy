/**
 * Tiny SVG helpers for tool ghosts. Ghosts are drawn in view space (+y down),
 * on top of the game's own markup, so they use plain presentation attributes.
 */
import { createElement, type ReactNode } from "react";
import type { Pt } from "../types";

export const GHOST = "#7fd0ff";

export function group(...children: ReactNode[]): ReactNode {
  return createElement("g", { pointerEvents: "none" }, ...children);
}

export function polyline(
  key: string,
  points: readonly Pt[],
  opts: { closed?: boolean; dashed?: boolean; color?: string; width?: number } = {},
): ReactNode {
  const { closed = false, dashed = true, color = GHOST, width = 1.4 } = opts;
  const d =
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") +
    (closed ? " Z" : "");
  return createElement("path", {
    key,
    d,
    fill: "none",
    stroke: color,
    strokeWidth: width,
    strokeDasharray: dashed ? "3 2.5" : undefined,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  });
}

export function dot(
  key: string,
  at: Pt,
  opts: { r?: number; color?: string; filled?: boolean } = {},
): ReactNode {
  const { r = 2.2, color = GHOST, filled = true } = opts;
  return createElement("circle", {
    key,
    cx: at.x,
    cy: at.y,
    r,
    fill: filled ? color : "none",
    stroke: color,
    strokeWidth: 1,
  });
}

export function label(key: string, at: Pt, text: string, color = GHOST): ReactNode {
  return createElement(
    "text",
    {
      key,
      x: at.x,
      y: at.y,
      fill: color,
      fontSize: 5,
      fontFamily: "ui-monospace, monospace",
      textAnchor: "middle",
    },
    text,
  );
}
