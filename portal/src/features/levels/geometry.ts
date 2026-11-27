/**
 * Coordinates, snapping, and hit-testing for the editor.
 *
 * Level data lives in logical space (900×1600, +y up). The game draws it in a
 * y-down SVG view (portrait 200×360, landscape 554×308). Landscape logical
 * space is anisotropic, so every distance a person can see is measured in
 * view space, never logical space.
 */
import {
  LANDSCAPE_REGION,
  LAUNCH_REGION,
  WORLD_H,
  WORLD_W,
  fromSvgPoint,
  ledgeYAt,
  svgViewFor,
  toSvg,
  landscapeCameraFrame,
  type RegionId,
  type SvgViewSize,
} from "../notehead/modules/sim";
import { asLedge, round2 } from "./model";
import type {
  BandSpot,
  ExitOpening,
  LayerId,
  Layers,
  LevelFile,
  LevelView,
  Pt,
  Selection,
  TerrainShape,
} from "./types";

/** How far masses run past the frame (matches `OVER` in the game's terrain). */
export const OVER = 16;

/** The plain frame region the editor uses for a view (not a route level). */
export function regionOf(view: LevelView): RegionId {
  return view === "landscape" ? LANDSCAPE_REGION : LAUNCH_REGION;
}

export function viewSizeOf(view: LevelView): SvgViewSize {
  return svgViewFor(regionOf(view));
}

export function toView(view: LevelView, p: Pt): Pt {
  return toSvg(p.x, p.y, regionOf(view));
}

export function fromView(view: LevelView, p: Pt): Pt {
  return fromSvgPoint(p.x, p.y, regionOf(view));
}

/** Logical points per view unit, per axis. */
export function scaleOf(view: LevelView): { sx: number; sy: number } {
  const size = viewSizeOf(view);
  return { sx: WORLD_W / size.w, sy: WORLD_H / size.h };
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The frame plus the bleed the game draws rock into (zig adds its camera pad). */
export function outerRect(view: LevelView): Rect {
  const size = viewSizeOf(view);
  if (view === "landscape") {
    const { ox, oy } = landscapeCameraFrame();
    return {
      x0: -ox - OVER,
      y0: -oy - OVER,
      x1: size.w + ox + OVER,
      y1: size.h + oy + OVER,
    };
  }
  return { x0: -OVER, y0: -OVER, x1: size.w + OVER, y1: size.h + OVER };
}

export function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Snapping

/** Snap a logical point to a grid measured in view units. 0 turns the grid off. */
export function snapToGrid(view: LevelView, p: Pt, grid: number): Pt {
  if (grid <= 0) return { x: round2(p.x), y: round2(p.y) };
  const v = toView(view, p);
  const snapped = {
    x: Math.round(v.x / grid) * grid,
    y: Math.round(v.y / grid) * grid,
  };
  const back = fromView(view, snapped);
  return { x: round2(back.x), y: round2(back.y) };
}

// Segment + polygon math (view space)

export function distToSegment(
  p: Pt,
  a: Pt,
  b: Pt,
): { dist: number; t: number; at: Pt } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
        );
  const at = { x: a.x + dx * t, y: a.y + dy * t };
  return { dist: distance(p, at), t, at };
}

export function pointInPolygon(p: Pt, ring: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y === b.y > p.y) continue;
    const cross = a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x);
    if (p.x < cross) inside = !inside;
  }
  return inside;
}

// Terrain outline

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Nearest point on the rectangle's border (clamps points that sit outside). */
function boundaryProject(p: Pt, r: Rect): Pt {
  const inside = p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1;
  if (!inside) return { x: clamp(p.x, r.x0, r.x1), y: clamp(p.y, r.y0, r.y1) };
  const gaps = [
    { d: p.y - r.y0, at: { x: p.x, y: r.y0 } },
    { d: r.x1 - p.x, at: { x: r.x1, y: p.y } },
    { d: r.y1 - p.y, at: { x: p.x, y: r.y1 } },
    { d: p.x - r.x0, at: { x: r.x0, y: p.y } },
  ];
  gaps.sort((a, b) => a.d - b.d);
  return gaps[0]!.at;
}

/** Clockwise (on screen) distance around the border, from the top-left corner. */
function perimeterT(q: Pt, r: Rect): number {
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  const edges = [
    { d: Math.abs(q.y - r.y0), t: q.x - r.x0 },
    { d: Math.abs(q.x - r.x1), t: w + (q.y - r.y0) },
    { d: Math.abs(q.y - r.y1), t: w + h + (r.x1 - q.x) },
    { d: Math.abs(q.x - r.x0), t: 2 * w + h + (r.y1 - q.y) },
  ];
  edges.sort((a, b) => a.d - b.d);
  return edges[0]!.t;
}

/**
 * Closed outline of a terrain shape in view space.
 *
 * Closed shapes are used as drawn. An open line is finished off-frame: both
 * ends run out to the frame border and the ring walks clockwise (on screen)
 * between them. That puts the rock on the right-hand side of the drawing
 * direction (draw a floor left to right and the rock sits below it).
 */
export function terrainOutline(view: LevelView, shape: TerrainShape): Pt[] {
  const pts = shape.points.map((p) => toView(view, p));
  if (shape.closed || pts.length < 2) return pts;

  const r = outerRect(view);
  const start = boundaryProject(pts[0]!, r);
  const end = boundaryProject(pts[pts.length - 1]!, r);
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  const total = 2 * (w + h);

  const ring = [...pts];
  const last = pts[pts.length - 1]!;
  if (distance(last, end) > 1e-6) ring.push(end);

  const tEnd = perimeterT(end, r);
  let tStart = perimeterT(start, r);
  if (tStart <= tEnd) tStart += total;

  const corners = [
    { t: 0, at: { x: r.x0, y: r.y0 } },
    { t: w, at: { x: r.x1, y: r.y0 } },
    { t: w + h, at: { x: r.x1, y: r.y1 } },
    { t: 2 * w + h, at: { x: r.x0, y: r.y1 } },
  ];
  const between: { t: number; at: Pt }[] = [];
  for (const lap of [0, total]) {
    for (const c of corners) {
      const t = c.t + lap;
      if (t > tEnd + 1e-6 && t < tStart - 1e-6) between.push({ t, at: c.at });
    }
  }
  between.sort((a, b) => a.t - b.t);
  for (const c of between) ring.push(c.at);

  if (distance(start, pts[0]!) > 1e-6) ring.push(start);
  return ring;
}

// Band geometry

/** Both ends of a ledge in logical space. */
export function bandEnds(band: BandSpot): [Pt, Pt] {
  const ledge = asLedge(band);
  return [
    { x: band.x0, y: ledgeYAt(ledge, band.x0) },
    { x: band.x1, y: ledgeYAt(ledge, band.x1) },
  ];
}

/** Both ends of a ledge in view space. */
export function bandEndsView(view: LevelView, band: BandSpot): [Pt, Pt] {
  const [a, b] = bandEnds(band);
  return [toView(view, a), toView(view, b)];
}

// Exit geometry

/** The span an opening covers, drawn along its frame edge, in view space. */
export function exitSegmentView(
  view: LevelView,
  exit: Pick<ExitOpening, "facing" | "x0" | "x1" | "y0" | "y1">,
): [Pt, Pt] {
  if (exit.facing === "right") {
    return [
      toView(view, { x: WORLD_W, y: exit.y0 }),
      toView(view, { x: WORLD_W, y: exit.y1 }),
    ];
  }
  const edge = exit.facing === "up" ? WORLD_H : 0;
  return [
    toView(view, { x: exit.x0, y: edge }),
    toView(view, { x: exit.x1, y: edge }),
  ];
}

// Layers

export function layerOf(kind: Selection["kind"]): LayerId {
  switch (kind) {
    case "terrain":
      return "terrain";
    case "band":
      return "band";
    case "borealis":
      return "borealis";
    case "enter":
    case "exit":
      return "enterExit";
  }
}

export function defaultLayers(): Layers {
  return {
    terrain: { visible: true, locked: false },
    band: { visible: true, locked: false },
    borealis: { visible: true, locked: false },
    enterExit: { visible: true, locked: false },
  };
}

/** A layer takes pointer edits only while visible and unlocked. */
export function editable(layers: Layers, id: LayerId): boolean {
  return layers[id].visible && !layers[id].locked;
}

// Hit-testing (tolerance is in view units)

export type Hit =
  | { kind: "terrain-vertex"; id: string; index: number }
  | { kind: "terrain-segment"; id: string; index: number; at: Pt }
  | { kind: "terrain-body"; id: string }
  | { kind: "band-end"; id: string; end: 0 | 1 }
  | { kind: "band-body"; id: string }
  | { kind: "borealis"; id: string }
  | { kind: "enter" }
  | { kind: "exit"; id: string };

/** Minimum pick radius for point-like markers, in view units. */
const MARKER = 5;

export function findEnter(
  level: LevelFile,
  p: Pt,
  tol: number,
): Hit | null {
  if (!level.enter) return null;
  const c = toView(level.view, level.enter);
  const v = toView(level.view, p);
  return distance(v, c) <= Math.max(tol, MARKER) ? { kind: "enter" } : null;
}

export function findBorealis(
  level: LevelFile,
  p: Pt,
  tol: number,
  skipId?: string,
): Hit | null {
  const v = toView(level.view, p);
  let best: { id: string; d: number } | null = null;
  for (const gem of level.borealis) {
    if (gem.id === skipId) continue;
    const d = distance(v, toView(level.view, gem));
    if (d <= Math.max(tol, MARKER) && (!best || d < best.d)) {
      best = { id: gem.id, d };
    }
  }
  return best ? { kind: "borealis", id: best.id } : null;
}

export function findBandEnd(level: LevelFile, p: Pt, tol: number): Hit | null {
  const v = toView(level.view, p);
  let best: { id: string; end: 0 | 1; d: number } | null = null;
  for (const band of level.bands) {
    bandEndsView(level.view, band).forEach((e, i) => {
      const d = distance(v, e);
      if (d <= Math.max(tol, MARKER) && (!best || d < best.d)) {
        best = { id: band.id, end: i as 0 | 1, d };
      }
    });
  }
  const hit = best as { id: string; end: 0 | 1 } | null;
  return hit ? { kind: "band-end", id: hit.id, end: hit.end } : null;
}

export function findBandBody(level: LevelFile, p: Pt, tol: number): Hit | null {
  const v = toView(level.view, p);
  let best: { id: string; d: number } | null = null;
  for (const band of level.bands) {
    const [a, b] = bandEndsView(level.view, band);
    const d = distToSegment(v, a, b).dist;
    if (d <= tol + 1.5 && (!best || d < best.d)) best = { id: band.id, d };
  }
  return best ? { kind: "band-body", id: best.id } : null;
}

export function findExit(level: LevelFile, p: Pt, tol: number): Hit | null {
  const v = toView(level.view, p);
  let best: { id: string; d: number } | null = null;
  for (const exit of level.exits) {
    const [a, b] = exitSegmentView(level.view, exit);
    const d = distToSegment(v, a, b).dist;
    if (d <= tol + 2 && (!best || d < best.d)) best = { id: exit.id, d };
  }
  return best ? { kind: "exit", id: best.id } : null;
}

export function findTerrainVertex(
  level: LevelFile,
  p: Pt,
  tol: number,
): Hit | null {
  const v = toView(level.view, p);
  let best: { id: string; index: number; d: number } | null = null;
  for (const shape of level.terrain) {
    shape.points.forEach((pt, index) => {
      const d = distance(v, toView(level.view, pt));
      if (d <= Math.max(tol, MARKER * 0.7) && (!best || d < best.d)) {
        best = { id: shape.id, index, d };
      }
    });
  }
  const hit = best as { id: string; index: number } | null;
  return hit ? { kind: "terrain-vertex", id: hit.id, index: hit.index } : null;
}

/** Nearest drawn segment of any terrain line (not the closing run off-frame). */
export function findTerrainSegment(
  level: LevelFile,
  p: Pt,
  tol: number,
): Hit | null {
  const v = toView(level.view, p);
  let best: { id: string; index: number; at: Pt; d: number } | null = null;
  for (const shape of level.terrain) {
    const pts = shape.points.map((pt) => toView(level.view, pt));
    const count = shape.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      const hit = distToSegment(v, pts[i]!, pts[(i + 1) % pts.length]!);
      if (hit.dist <= tol + 1.5 && (!best || hit.dist < best.d)) {
        best = { id: shape.id, index: i, at: hit.at, d: hit.dist };
      }
    }
  }
  const hit = best as { id: string; index: number; at: Pt } | null;
  return hit
    ? {
        kind: "terrain-segment",
        id: hit.id,
        index: hit.index,
        at: fromView(level.view, hit.at),
      }
    : null;
}

export function findTerrainBody(
  level: LevelFile,
  p: Pt,
): Hit | null {
  const v = toView(level.view, p);
  // Later shapes draw on top, so test them first.
  for (let i = level.terrain.length - 1; i >= 0; i--) {
    const shape = level.terrain[i]!;
    if (pointInPolygon(v, terrainOutline(level.view, shape))) {
      return { kind: "terrain-body", id: shape.id };
    }
  }
  return null;
}

/**
 * The one item under the pointer across every editable layer. Small targets
 * beat large ones: markers, vertices, bands, exits, segments, then rock fill.
 */
export function hitTest(
  level: LevelFile,
  layers: Layers,
  p: Pt,
  tol: number,
): Hit | null {
  const ee = editable(layers, "enterExit");
  const gems = editable(layers, "borealis");
  const bands = editable(layers, "band");
  const rock = editable(layers, "terrain");
  return (
    (ee ? findEnter(level, p, tol) : null) ??
    (gems ? findBorealis(level, p, tol) : null) ??
    (bands ? findBandEnd(level, p, tol) : null) ??
    (rock ? findTerrainVertex(level, p, tol) : null) ??
    (bands ? findBandBody(level, p, tol) : null) ??
    (ee ? findExit(level, p, tol) : null) ??
    (rock ? findTerrainSegment(level, p, tol) : null) ??
    (rock ? findTerrainBody(level, p) : null)
  );
}
