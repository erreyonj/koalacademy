import { cancelDrag, continueDrag, finishDrag, startDrag } from "./gestures";
import type { EditorTool } from "./types";

/**
 * Select: pick any item from any editable layer, drag to move it, Delete to
 * remove (handled with the other global keys), Esc to clear.
 */
export const selectTool: EditorTool = {
  id: "select",
  label: "Select",
  hotkey: "v",
  cursor: "default",

  onPointerDown(ctx, p) {
    const hit = ctx.hit(p);
    if (!hit) {
      ctx.dispatch({ type: "select", selection: null });
      return;
    }
    startDrag(ctx, hit, p);
  },

  onPointerMove(ctx, p) {
    continueDrag(ctx, p);
  },

  onPointerUp(ctx, p) {
    finishDrag(ctx, p);
  },

  cancel(ctx) {
    cancelDrag(ctx);
  },
};
