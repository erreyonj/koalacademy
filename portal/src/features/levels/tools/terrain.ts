import { createElement } from "react";
import {
  findTerrainSegment,
  findTerrainVertex,
  toView,
  distance,
} from "../geometry";
import { addTerrain, hashSeed, nextId, patchTerrain, terrainById } from "../model";
import { cancelDrag, continueDrag, finishDrag, startDrag } from "./gestures";
import { dot, group, polyline } from "./svg";
import type { EditorTool, ToolCtx } from "./types";
import type { Pt } from "../types";

/** Close and open commits share one path: one undo step either way. */
function commitDraft(ctx: ToolCtx, closed: boolean): void {
  const draft = ctx.state.draft;
  if (!draft) return;
  const need = closed ? 3 : 2;
  if (draft.points.length < need) return;
  const id = nextId("terrain", ctx.level.terrain);
  ctx.dispatch({
    type: "edit",
    level: addTerrain(ctx.level, {
      id,
      points: draft.points,
      closed,
      tickSeed: hashSeed(id),
    }),
  });
  ctx.dispatch({ type: "select", selection: { kind: "terrain", id } });
  ctx.dispatch({ type: "draft", draft: null });
}

function viewGap(ctx: ToolCtx, a: Pt, b: Pt): number {
  return distance(toView(ctx.level.view, a), toView(ctx.level.view, b));
}

function closesRing(ctx: ToolCtx, at: Pt): boolean {
  const draft = ctx.state.draft;
  if (!draft || draft.points.length < 3) return false;
  return viewGap(ctx, at, draft.points[0]!) <= Math.max(ctx.tolerance * 1.5, 4);
}

/**
 * Terrain: solid rock outlines. Click adds a vertex; click the first vertex or
 * press Enter to finish (Enter leaves an open line that the adapter closes
 * off-frame, with rock on the right of the drawing direction). With no line in
 * progress, drag a vertex to move it, or click a segment to insert a vertex.
 * Hold Alt to start a new line on top of existing terrain.
 */
export const terrainTool: EditorTool = {
  id: "terrain",
  label: "Terrain",
  hotkey: "t",
  cursor: "crosshair",

  onPointerDown(ctx, p) {
    if (!ctx.canEdit("terrain")) return;
    const at = ctx.snap(p);
    const draft = ctx.state.draft;

    if (draft) {
      if (closesRing(ctx, at)) {
        commitDraft(ctx, true);
        return;
      }
      const last = draft.points[draft.points.length - 1];
      if (last && viewGap(ctx, last, at) < 0.5) return;
      ctx.dispatch({ type: "draft", draft: { points: [...draft.points, at] } });
      return;
    }

    if (!ctx.mods.alt) {
      const vertex = findTerrainVertex(ctx.level, p, ctx.tolerance);
      if (vertex) {
        startDrag(ctx, vertex, p);
        return;
      }
      const seg = findTerrainSegment(ctx.level, p, ctx.tolerance);
      if (seg && seg.kind === "terrain-segment") {
        const shape = terrainById(ctx.level, seg.id);
        if (!shape) return;
        const index = seg.index + 1;
        const points = [...shape.points];
        points.splice(index, 0, ctx.snap(seg.at));
        ctx.dispatch({
          type: "edit",
          live: true,
          level: patchTerrain(ctx.level, seg.id, { points }),
        });
        ctx.dispatch({
          type: "select",
          selection: { kind: "terrain", id: seg.id, vertex: index },
        });
        ctx.dispatch({
          type: "gesture",
          gesture: { kind: "terrain-vertex", id: seg.id, index },
        });
        return;
      }
    }

    ctx.dispatch({ type: "draft", draft: { points: [at] } });
  },

  onPointerMove(ctx, p) {
    continueDrag(ctx, p);
  },

  onPointerUp(ctx, p) {
    finishDrag(ctx, p);
  },

  onKey(ctx, e) {
    const draft = ctx.state.draft;
    if (!draft) return false;
    if (e.key === "Enter") {
      commitDraft(ctx, false);
      return true;
    }
    if (e.key === "Backspace") {
      const points = draft.points.slice(0, -1);
      ctx.dispatch({ type: "draft", draft: points.length > 0 ? { points } : null });
      return true;
    }
    return false;
  },

  ghost(ctx) {
    const { draft, hover } = ctx.state;
    const view = ctx.level.view;
    if (!hover) return null;
    const tip = toView(view, ctx.snap(hover));
    if (!draft) return group(dot("tip", tip, { r: 1.8 }));

    const pts = draft.points.map((p) => toView(view, p));
    const closable = closesRing(ctx, ctx.snap(hover));
    return group(
      polyline("line", pts, { dashed: false }),
      polyline("rubber", [pts[pts.length - 1]!, tip]),
      ...pts.map((p, i) =>
        dot(`v${i}`, p, {
          r: i === 0 && closable ? 3.6 : 2,
          color: i === 0 && closable ? "#ffe27a" : undefined,
        }),
      ),
      dot("tip", tip, { r: 1.6, filled: false }),
      createElement("title", { key: "title" }, "Enter to finish, click first point to close"),
    );
  },

  cancel(ctx, reason) {
    cancelDrag(ctx);
    // A switch keeps the unfinished line; Esc throws it away.
    if (reason === "esc" && ctx.state.draft) {
      ctx.dispatch({ type: "draft", draft: null });
    }
  },
};
