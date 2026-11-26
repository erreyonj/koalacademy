import { findBandBody, findBandEnd, scaleOf, toView } from "../geometry";
import {
  beginBandCreate,
  cancelDrag,
  continueDrag,
  finishDrag,
  startDrag,
  DEFAULT_SPAN_VIEW,
} from "./gestures";
import { dot, group, label, polyline } from "./svg";
import type { EditorTool } from "./types";

/**
 * Band: landable ledges (Frequency Bands, steps, blocks). Drag across empty
 * space to draw one; it snaps to the grid. Drag an end to resize it
 * (hold Shift to tilt it into a slope) or drag the body to move it. Kind
 * comes from the tool options; the Inspector edits an existing band. Bands
 * carry no pitch.
 */
export const bandTool: EditorTool = {
  id: "band",
  label: "Band",
  hotkey: "b",
  cursor: "crosshair",

  onPointerDown(ctx, p) {
    if (!ctx.canEdit("band")) return;
    const hit =
      findBandEnd(ctx.level, p, ctx.tolerance) ??
      findBandBody(ctx.level, p, ctx.tolerance);
    if (hit) {
      startDrag(ctx, hit, p);
      return;
    }
    beginBandCreate(ctx, p);
  },

  onPointerMove(ctx, p) {
    continueDrag(ctx, p);
  },

  onPointerUp(ctx, p) {
    finishDrag(ctx, p);
  },

  ghost(ctx) {
    const { hover, gesture } = ctx.state;
    if (!hover || gesture) return null;
    const at = ctx.snap(hover);
    const { sx } = scaleOf(ctx.level.view);
    const half = (DEFAULT_SPAN_VIEW * sx) / 2;
    const a = toView(ctx.level.view, { x: at.x - half, y: at.y });
    const b = toView(ctx.level.view, { x: at.x + half, y: at.y });
    return group(
      polyline("band", [a, b]),
      dot("a", a, { r: 1.6, filled: false }),
      dot("b", b, { r: 1.6, filled: false }),
      label("pitch", { x: (a.x + b.x) / 2, y: a.y - 4 }, ctx.state.options.band.kind),
    );
  },

  cancel(ctx) {
    cancelDrag(ctx);
  },
};
