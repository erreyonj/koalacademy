/**
 * Pointer gestures shared by the tools. A tool starts a gesture (and chooses
 * which one); moving and releasing are handled here so every drag behaves the
 * same from any tool. Each gesture streams `live` edits and ends in one undo
 * step.
 */
import {
  bandEnds,
  findBorealis,
  fromView,
  layerOf,
  scaleOf,
  toView,
  viewSizeOf,
  type Hit,
} from "../geometry";
import {
  asLedge,
  borealisById,
  bandById,
  exitById,
  nextId,
  patchBand,
  patchBorealis,
  patchExit,
  patchTerrain,
  reorderBorealis,
  round2,
  setEnter,
  terrainById,
  addBand,
  addExit,
} from "../model";
import { WORLD_H, WORLD_W, ledgeYAt } from "../../notehead/modules/sim";
import type { BandSpot, ExitFacing, ExitOpening, LevelFile, Pt } from "../types";
import type { ToolCtx } from "./types";

/** Smallest band or exit span, in view units. */
export const MIN_SPAN_VIEW = 6;
/** Default width of a clicked-in band or exit, in view units. */
export const DEFAULT_SPAN_VIEW = 24;
/** Launch velocity per logical unit of aim drag. */
export const VELOCITY_PER_UNIT = 3;
/** How far from a frame edge an exit click still counts, in view units. */
export const EDGE_REACH_VIEW = 28;

function live(ctx: ToolCtx, level: LevelFile): void {
  ctx.dispatch({ type: "edit", level, live: true });
}

// Exit helpers

export function axisOf(facing: ExitFacing): "x" | "y" {
  return facing === "right" ? "y" : "x";
}

export function openingFor(
  facing: ExitFacing,
  lo: number,
  hi: number,
): Pick<ExitOpening, "facing" | "x0" | "x1" | "y0" | "y1"> {
  const max = facing === "right" ? WORLD_H : WORLD_W;
  const a = round2(Math.max(0, Math.min(max, lo)));
  const b = round2(Math.max(0, Math.min(max, hi)));
  if (facing === "up") return { facing, x0: a, x1: b, y0: WORLD_H, y1: WORLD_H };
  if (facing === "down") return { facing, x0: a, x1: b, y0: 0, y1: 0 };
  return { facing, x0: WORLD_W, x1: WORLD_W, y0: a, y1: b };
}

export function exitRange(exit: ExitOpening): { lo: number; hi: number } {
  return exit.facing === "right"
    ? { lo: exit.y0, hi: exit.y1 }
    : { lo: exit.x0, hi: exit.x1 };
}

/** The frame edge nearest a point, if it is close enough to start an exit. */
export function edgeFor(ctx: ToolCtx, p: Pt): ExitFacing | null {
  const size = viewSizeOf(ctx.level.view);
  const v = toView(ctx.level.view, p);
  const edges: { facing: ExitFacing; d: number }[] = [
    { facing: "up", d: Math.abs(v.y) },
    { facing: "down", d: Math.abs(v.y - size.h) },
    { facing: "right", d: Math.abs(v.x - size.w) },
  ];
  edges.sort((a, b) => a.d - b.d);
  const best = edges[0]!;
  return best.d <= EDGE_REACH_VIEW ? best.facing : null;
}

function axisValue(axis: "x" | "y", p: Pt): number {
  return axis === "x" ? p.x : p.y;
}

function snapAxis(ctx: ToolCtx, axis: "x" | "y", value: number): number {
  const snapped = ctx.snap(axis === "x" ? { x: value, y: 0 } : { x: 0, y: value });
  return axisValue(axis, snapped);
}

/** Span across an axis, in logical units, for `DEFAULT_SPAN_VIEW`. */
function defaultSpan(ctx: ToolCtx, axis: "x" | "y"): number {
  const { sx, sy } = scaleOf(ctx.level.view);
  return DEFAULT_SPAN_VIEW * (axis === "x" ? sx : sy);
}

// Starting gestures on existing items

/** Select the hit item and begin dragging it. Returns false if nothing started. */
export function startDrag(ctx: ToolCtx, hit: Hit, p: Pt): boolean {
  const { level, dispatch } = ctx;
  const kindLayer =
    hit.kind === "terrain-vertex" ||
    hit.kind === "terrain-segment" ||
    hit.kind === "terrain-body"
      ? layerOf("terrain")
      : hit.kind === "band-end" || hit.kind === "band-body"
        ? layerOf("band")
        : hit.kind === "borealis"
          ? layerOf("borealis")
          : layerOf("enter");
  if (!ctx.canEdit(kindLayer)) return false;

  switch (hit.kind) {
    case "terrain-vertex": {
      dispatch({
        type: "select",
        selection: { kind: "terrain", id: hit.id, vertex: hit.index },
      });
      dispatch({
        type: "gesture",
        gesture: { kind: "terrain-vertex", id: hit.id, index: hit.index },
      });
      return true;
    }
    case "terrain-segment":
    case "terrain-body": {
      const shape = terrainById(level, hit.id);
      if (!shape) return false;
      dispatch({ type: "select", selection: { kind: "terrain", id: hit.id } });
      dispatch({
        type: "gesture",
        gesture: {
          kind: "terrain-move",
          id: hit.id,
          grab: p,
          origin: shape.points.map((pt) => ({ ...pt })),
        },
      });
      return true;
    }
    case "band-end": {
      const band = bandById(level, hit.id);
      if (!band) return false;
      dispatch({ type: "select", selection: { kind: "band", id: hit.id } });
      dispatch({
        type: "gesture",
        gesture: {
          kind: "band-end",
          id: hit.id,
          end: hit.end,
          slope: ctx.mods.shift,
          origin: { ...band },
        },
      });
      return true;
    }
    case "band-body": {
      const band = bandById(level, hit.id);
      if (!band) return false;
      dispatch({ type: "select", selection: { kind: "band", id: hit.id } });
      dispatch({
        type: "gesture",
        gesture: { kind: "band-move", id: hit.id, grab: p, origin: { ...band } },
      });
      return true;
    }
    case "borealis": {
      const gem = borealisById(level, hit.id);
      if (!gem) return false;
      dispatch({ type: "select", selection: { kind: "borealis", id: hit.id } });
      dispatch({
        type: "gesture",
        gesture: {
          kind: "borealis-move",
          id: hit.id,
          reorder: ctx.mods.shift,
          origin: { x: gem.x, y: gem.y },
        },
      });
      return true;
    }
    case "enter": {
      if (!level.enter) return false;
      dispatch({ type: "select", selection: { kind: "enter", id: "enter" } });
      dispatch({
        type: "gesture",
        gesture: { kind: "enter-move", grab: p, origin: { ...level.enter } },
      });
      return true;
    }
    case "exit": {
      const exit = exitById(level, hit.id);
      if (!exit) return false;
      dispatch({ type: "select", selection: { kind: "exit", id: hit.id } });
      dispatch({
        type: "gesture",
        gesture: {
          kind: "exit-move",
          id: hit.id,
          grab: axisValue(axisOf(exit.facing), p),
          origin: { ...exit },
        },
      });
      return true;
    }
  }
}

// Creating items with a drag

export function beginBandCreate(ctx: ToolCtx, p: Pt): void {
  const { level, state } = ctx;
  const at = ctx.snap(p);
  const id = nextId("band", level.bands);
  const half = defaultSpan(ctx, "x") / 2;
  const band: BandSpot = {
    id,
    x0: round2(at.x - half),
    x1: round2(at.x + half),
    y: round2(at.y),
    kind: state.options.band.kind,
  };
  live(ctx, addBand(level, band));
  ctx.dispatch({ type: "select", selection: { kind: "band", id } });
  ctx.dispatch({
    type: "gesture",
    gesture: { kind: "band-create", id, anchor: { x: at.x, y: at.y } },
  });
}

export function beginExitCreate(
  ctx: ToolCtx,
  p: Pt,
  facing: ExitFacing,
): void {
  const axis = axisOf(facing);
  const anchor = snapAxis(ctx, axis, axisValue(axis, p));
  const half = defaultSpan(ctx, axis) / 2;
  const id = nextId("exit", ctx.level.exits);
  const exit: ExitOpening = {
    id,
    ...openingFor(facing, anchor - half, anchor + half),
  };
  live(ctx, addExit(ctx.level, exit));
  ctx.dispatch({ type: "select", selection: { kind: "exit", id } });
  ctx.dispatch({
    type: "gesture",
    gesture: { kind: "exit-create", id, facing, anchor },
  });
}

export function beginEnterAim(ctx: ToolCtx, p: Pt): void {
  const anchor = ctx.snap(p);
  const keep = ctx.level.enter
    ? { vx: ctx.level.enter.vx, vy: ctx.level.enter.vy }
    : { vx: 0, vy: 0 };
  live(
    ctx,
    setEnter(ctx.level, {
      x: anchor.x,
      y: anchor.y,
      ...keep,
      ...(ctx.level.enter?.mustCatch ? { mustCatch: true } : {}),
    }),
  );
  ctx.dispatch({ type: "select", selection: { kind: "enter", id: "enter" } });
  ctx.dispatch({ type: "gesture", gesture: { kind: "enter-aim", anchor, keep } });
}

// Continuing

function viewGap(ctx: ToolCtx, a: Pt, b: Pt): number {
  const va = toView(ctx.level.view, a);
  const vb = toView(ctx.level.view, b);
  return Math.hypot(va.x - vb.x, va.y - vb.y);
}

export function continueDrag(ctx: ToolCtx, p: Pt): void {
  const g = ctx.state.gesture;
  if (!g) return;
  const { level } = ctx;
  const view = level.view;

  switch (g.kind) {
    case "terrain-vertex": {
      const shape = terrainById(level, g.id);
      if (!shape || g.index >= shape.points.length) return;
      const points = shape.points.map((pt, i) => (i === g.index ? ctx.snap(p) : pt));
      live(ctx, patchTerrain(level, g.id, { points }));
      return;
    }
    case "terrain-move": {
      const a = toView(view, g.grab);
      const b = toView(view, p);
      const grid = ctx.state.options.grid;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      if (grid > 0) {
        dx = Math.round(dx / grid) * grid;
        dy = Math.round(dy / grid) * grid;
      }
      const points = g.origin.map((pt) => {
        const v = toView(view, pt);
        const back = fromView(view, { x: v.x + dx, y: v.y + dy });
        return { x: round2(back.x), y: round2(back.y) };
      });
      live(ctx, patchTerrain(level, g.id, { points }));
      return;
    }
    case "band-create": {
      const sx = scaleOf(view).sx;
      const x = ctx.snap({ x: p.x, y: g.anchor.y }).x;
      const wide = Math.abs(x - g.anchor.x) >= MIN_SPAN_VIEW * sx;
      const half = defaultSpan(ctx, "x") / 2;
      const x0 = wide ? Math.min(g.anchor.x, x) : g.anchor.x - half;
      const x1 = wide ? Math.max(g.anchor.x, x) : g.anchor.x + half;
      live(ctx, patchBand(level, g.id, { x0: round2(x0), x1: round2(x1) }));
      return;
    }
    case "band-end": {
      const band = bandById(level, g.id);
      if (!band) return;
      const minSpan = MIN_SPAN_VIEW * scaleOf(view).sx;
      const at = ctx.snap(p);
      const [left, right] = bandEnds(g.origin);
      const { slope: _drop, ...rest } = g.origin;
      void _drop;

      if (g.slope) {
        // The dragged end follows the cursor, the other end stays put.
        const fixed = g.end === 0 ? right : left;
        const dragX =
          g.end === 0 ? Math.min(at.x, fixed.x - minSpan) : Math.max(at.x, fixed.x + minSpan);
        const [l, r] =
          g.end === 0
            ? [{ x: dragX, y: at.y }, fixed]
            : [fixed, { x: dragX, y: at.y }];
        const rise = (r.y - l.y) / (r.x - l.x);
        const next: BandSpot = {
          ...rest,
          x0: round2(l.x),
          x1: round2(r.x),
          y: round2((l.y + r.y) / 2),
          ...(Math.abs(rise) > 1e-9 ? { slope: Math.round(rise * 10000) / 10000 } : {}),
        };
        live(ctx, patchBandFull(level, next));
        return;
      }

      // Slide the end along the band's own line.
      const x0 = g.end === 0 ? Math.min(at.x, g.origin.x1 - minSpan) : g.origin.x0;
      const x1 = g.end === 1 ? Math.max(at.x, g.origin.x0 + minSpan) : g.origin.x1;
      const next: BandSpot = {
        ...g.origin,
        x0: round2(x0),
        x1: round2(x1),
        y: round2(ledgeYAt(asLedge(g.origin), (x0 + x1) / 2)),
      };
      live(ctx, patchBandFull(level, next));
      return;
    }
    case "band-move": {
      const o = g.origin;
      const centre = { x: (o.x0 + o.x1) / 2, y: o.y };
      const target = ctx.snap({
        x: centre.x + (p.x - g.grab.x),
        y: centre.y + (p.y - g.grab.y),
      });
      const dx = target.x - centre.x;
      live(
        ctx,
        patchBand(level, g.id, {
          x0: round2(o.x0 + dx),
          x1: round2(o.x1 + dx),
          y: round2(target.y),
        }),
      );
      return;
    }
    case "borealis-move": {
      if (g.reorder) return;
      const gem = borealisById(level, g.id);
      if (!gem) return;
      const at = ctx.snap(p);
      live(
        ctx,
        patchBorealis(level, g.id, {
          x: at.x,
          y: at.y,
        }),
      );
      return;
    }
    case "enter-aim": {
      const far = viewGap(ctx, g.anchor, p) >= ctx.tolerance;
      const vx = far ? (p.x - g.anchor.x) * VELOCITY_PER_UNIT : g.keep.vx;
      const vy = far ? (p.y - g.anchor.y) * VELOCITY_PER_UNIT : g.keep.vy;
      live(
        ctx,
        setEnter(level, {
          x: g.anchor.x,
          y: g.anchor.y,
          vx: round2(vx),
          vy: round2(vy),
          ...(level.enter?.mustCatch ? { mustCatch: true } : {}),
        }),
      );
      return;
    }
    case "enter-move": {
      const at = ctx.snap({
        x: g.origin.x + (p.x - g.grab.x),
        y: g.origin.y + (p.y - g.grab.y),
      });
      live(ctx, setEnter(level, { ...g.origin, x: at.x, y: at.y }));
      return;
    }
    case "exit-create": {
      const axis = axisOf(g.facing);
      const cur = snapAxis(ctx, axis, axisValue(axis, p));
      const { sx, sy } = scaleOf(view);
      const wide = Math.abs(cur - g.anchor) >= MIN_SPAN_VIEW * (axis === "x" ? sx : sy);
      const half = defaultSpan(ctx, axis) / 2;
      const lo = wide ? Math.min(g.anchor, cur) : g.anchor - half;
      const hi = wide ? Math.max(g.anchor, cur) : g.anchor + half;
      live(ctx, patchExit(level, g.id, openingFor(g.facing, lo, hi)));
      return;
    }
    case "exit-move": {
      const axis = axisOf(g.origin.facing);
      const { lo, hi } = exitRange(g.origin);
      const width = hi - lo;
      const max = g.origin.facing === "right" ? WORLD_H : WORLD_W;
      const moved = snapAxis(ctx, axis, lo + (axisValue(axis, p) - g.grab));
      const start = Math.max(0, Math.min(max - width, moved));
      live(ctx, patchExit(level, g.id, openingFor(g.origin.facing, start, start + width)));
      return;
    }
  }
}

function patchBandFull(level: LevelFile, band: BandSpot): LevelFile {
  return { ...level, bands: level.bands.map((b) => (b.id === band.id ? band : b)) };
}

// Finishing

/** End the active gesture as one undo step. */
export function finishDrag(ctx: ToolCtx, p: Pt): void {
  const g = ctx.state.gesture;
  if (!g) return;
  if (g.kind === "borealis-move" && g.reorder) {
    const target = findBorealis(ctx.level, p, ctx.tolerance, g.id);
    if (target && target.kind === "borealis") {
      const index = ctx.level.borealis.findIndex((gem) => gem.id === target.id);
      ctx.dispatch({
        type: "edit",
        level: reorderBorealis(ctx.level, g.id, index),
      });
    }
  } else {
    ctx.dispatch({ type: "endEdit" });
  }
  ctx.dispatch({ type: "gesture", gesture: null });
}

/** Drop the active gesture and restore the level from before it began. */
export function cancelDrag(ctx: ToolCtx): void {
  if (!ctx.state.gesture && !ctx.state.base) return;
  ctx.dispatch({ type: "cancelEdit" });
  ctx.dispatch({ type: "gesture", gesture: null });
}
