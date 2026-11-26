import { findEnter, findExit, scaleOf, toView } from "../geometry";
import {
  DEFAULT_SPAN_VIEW,
  axisOf,
  beginEnterAim,
  beginExitCreate,
  cancelDrag,
  continueDrag,
  edgeFor,
  finishDrag,
  openingFor,
  startDrag,
} from "./gestures";
import { dot, group, label, polyline } from "./svg";
import type { EditorTool } from "./types";

/**
 * Enter/Exit: one tool, two modes (press E again to flip). Enter mode places
 * the single ship entry; drag out from it to set the launch velocity. Exit
 * mode opens a gap on the top, right, or bottom frame edge: click near an
 * edge, drag along it to set the span.
 */
export const enterExitTool: EditorTool = {
  id: "enter-exit",
  label: "Enter / Exit",
  hotkey: "e",
  cursor: "crosshair",

  onPointerDown(ctx, p) {
    if (!ctx.canEdit("enterExit")) return;

    if (ctx.state.options.enterExit.mode === "enter") {
      const hit = findEnter(ctx.level, p, ctx.tolerance);
      if (hit) startDrag(ctx, hit, p);
      else beginEnterAim(ctx, p);
      return;
    }

    const hit = findExit(ctx.level, p, ctx.tolerance);
    if (hit) {
      startDrag(ctx, hit, p);
      return;
    }
    const facing = edgeFor(ctx, p);
    if (facing) beginExitCreate(ctx, p, facing);
  },

  onPointerMove(ctx, p) {
    continueDrag(ctx, p);
  },

  onPointerUp(ctx, p) {
    finishDrag(ctx, p);
  },

  onKey(ctx, e) {
    if (e.key.toLowerCase() !== "e") return false;
    const mode = ctx.state.options.enterExit.mode === "enter" ? "exit" : "enter";
    ctx.dispatch({
      type: "options",
      options: { ...ctx.state.options, enterExit: { mode } },
    });
    return true;
  },

  ghost(ctx) {
    const { hover, gesture, options } = ctx.state;
    if (!hover || gesture) return null;
    const view = ctx.level.view;

    if (options.enterExit.mode === "enter") {
      const v = toView(view, ctx.snap(hover));
      return group(dot("ring", v, { r: 5, filled: false }), label("e", { x: v.x, y: v.y - 8 }, "enter"));
    }

    const facing = edgeFor(ctx, hover);
    if (!facing) return null;
    const axis = axisOf(facing);
    const at = ctx.snap(hover);
    const { sx, sy } = scaleOf(view);
    const half = (DEFAULT_SPAN_VIEW * (axis === "x" ? sx : sy)) / 2;
    const centre = axis === "x" ? at.x : at.y;
    const o = openingFor(facing, centre - half, centre + half);
    const a = toView(view, { x: o.x0, y: o.y0 });
    const b = toView(view, { x: o.x1, y: o.y1 });
    const nudge = facing === "down" ? -5 : facing === "up" ? 9 : 0;
    return group(
      polyline("span", [a, b], { width: 2.4 }),
      label("f", { x: (a.x + b.x) / 2 - (facing === "right" ? 10 : 0), y: (a.y + b.y) / 2 + nudge }, `exit ${facing}`),
    );
  },

  cancel(ctx) {
    cancelDrag(ctx);
  },
};
