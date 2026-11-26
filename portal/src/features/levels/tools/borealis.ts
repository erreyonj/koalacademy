import { findBorealis, toView } from "../geometry";
import { addBorealis, nextId } from "../model";
import { cancelDrag, continueDrag, finishDrag, startDrag } from "./gestures";
import { dot, group, label } from "./svg";
import type { EditorTool } from "./types";

/**
 * Borealis: energy collectibles. Click places the next gem in goal order, with
 * the pitch chosen in the tool options. Height means nothing.
 * Drag a gem to move it; Shift-drag it onto another gem to reorder the chain.
 */
export const borealisTool: EditorTool = {
  id: "borealis",
  label: "Borealis",
  hotkey: "r",
  cursor: "crosshair",

  onPointerDown(ctx, p) {
    if (!ctx.canEdit("borealis")) return;
    const hit = findBorealis(ctx.level, p, ctx.tolerance);
    if (hit) {
      startDrag(ctx, hit, p);
      return;
    }
    const at = ctx.snap(p);
    const id = nextId("gem", ctx.level.borealis);
    ctx.dispatch({
      type: "edit",
      level: addBorealis(ctx.level, {
        id,
        x: at.x,
        y: at.y,
        pitch: ctx.state.options.borealis.pitch,
      }),
    });
    ctx.dispatch({ type: "select", selection: { kind: "borealis", id } });
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
    const v = toView(ctx.level.view, at);
    const { pitch } = ctx.state.options.borealis;
    return group(
      dot("ring", v, { r: 5, filled: false }),
      dot("core", v, { r: 1.4 }),
      label("n", { x: v.x, y: v.y - 8 }, `${ctx.level.borealis.length + 1} · ${pitch}`),
    );
  },

  cancel(ctx) {
    cancelDrag(ctx);
  },
};
