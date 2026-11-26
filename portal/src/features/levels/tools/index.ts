/**
 * Tool registry and the host-side glue: build a `ToolCtx`, route pointer and
 * key events to the active tool, switch tools, and handle the global keys
 * (undo/redo, Esc, hotkeys, Delete, flip). The React canvas just forwards
 * events here, so every behavior is testable without a DOM.
 */
import {
  editable,
  hitTest,
  layerOf,
  snapToGrid,
} from "../geometry";
import { flipTerrain, removeSelection, terrainById } from "../model";
import type { EditorStore, ToolId } from "../store";
import type { Pt } from "../types";
import { bandTool } from "./band";
import { borealisTool } from "./borealis";
import { enterExitTool } from "./enter-exit";
import { selectTool } from "./select";
import { terrainTool } from "./terrain";
import type { EditorTool, KeyInput, Mods, ToolCtx } from "./types";

export type { EditorTool, KeyInput, Mods, ToolCtx } from "./types";

export const TOOLS: Record<ToolId, EditorTool> = {
  select: selectTool,
  terrain: terrainTool,
  band: bandTool,
  borealis: borealisTool,
  "enter-exit": enterExitTool,
};

/** Toolbar order. */
export const TOOL_ORDER: readonly ToolId[] = [
  "select",
  "terrain",
  "band",
  "borealis",
  "enter-exit",
];

export interface HostEnv {
  /** Pick radius in view units, already scaled for zoom. */
  tolerance: number;
  mods?: Partial<Mods>;
}

export function makeCtx(store: EditorStore, env: HostEnv): ToolCtx {
  const state = store.getState();
  const { level } = state;
  const grid = state.options.grid;
  return {
    state,
    level,
    dispatch: store.dispatch,
    tolerance: env.tolerance,
    mods: {
      shift: env.mods?.shift ?? false,
      alt: env.mods?.alt ?? false,
      meta: env.mods?.meta ?? false,
    },
    snap: (p) => snapToGrid(level.view, p, grid),
    canEdit: (layer) => editable(state.layers, layer),
    hit: (p) => hitTest(level, state.layers, p, env.tolerance),
  };
}

function activeTool(store: EditorStore): EditorTool {
  return TOOLS[store.getState().tool];
}

export function pointerDown(store: EditorStore, env: HostEnv, p: Pt): void {
  store.dispatch({ type: "hover", p });
  activeTool(store).onPointerDown(makeCtx(store, env), p);
}

export function pointerMove(store: EditorStore, env: HostEnv, p: Pt): void {
  store.dispatch({ type: "hover", p });
  activeTool(store).onPointerMove(makeCtx(store, env), p);
}

export function pointerUp(store: EditorStore, env: HostEnv, p: Pt): void {
  activeTool(store).onPointerUp(makeCtx(store, env), p);
}

/** Cancel the old tool's gesture, then activate the new one. */
export function switchTool(store: EditorStore, env: HostEnv, id: ToolId): void {
  if (store.getState().tool === id) return;
  activeTool(store).cancel(makeCtx(store, env), "switch");
  store.dispatch({ type: "setTool", tool: id });
}

/** Delete whatever is selected, if its layer takes edits. */
export function deleteSelection(store: EditorStore, env: HostEnv): boolean {
  const ctx = makeCtx(store, env);
  const { selection } = ctx.state;
  if (!selection || !ctx.canEdit(layerOf(selection.kind))) return false;
  const next = removeSelection(ctx.level, selection);
  if (next === ctx.level) return false;
  ctx.dispatch({ type: "edit", level: next });
  const after = store.getState();
  if (selection.kind === "terrain" && after.level.terrain.some((s) => s.id === selection.id)) {
    ctx.dispatch({ type: "select", selection: { kind: "terrain", id: selection.id } });
  } else {
    ctx.dispatch({ type: "select", selection: null });
  }
  return true;
}

/** Reverse the selected terrain line, which swaps the side the rock sits on. */
export function flipSelection(store: EditorStore, env: HostEnv): boolean {
  const ctx = makeCtx(store, env);
  const { selection } = ctx.state;
  if (selection?.kind !== "terrain" || !ctx.canEdit("terrain")) return false;
  if (!terrainById(ctx.level, selection.id)) return false;
  ctx.dispatch({ type: "edit", level: flipTerrain(ctx.level, selection.id) });
  return true;
}

/**
 * Global key handling. Returns true when the key was used, so the host can
 * `preventDefault`. Skip this while a text field has focus.
 */
export function handleKey(store: EditorStore, env: HostEnv, e: KeyInput): boolean {
  const key = e.key;
  const lower = key.toLowerCase();
  const mod = Boolean(e.ctrlKey || e.metaKey);

  // While a playtest runs the level is read-only: only leaving it is handled here.
  if (store.getState().playing) {
    if (key === "Escape" || (!mod && !e.altKey && lower === "p")) {
      store.dispatch({ type: "play", on: false });
      return true;
    }
    return false;
  }

  if (mod) {
    if (lower === "z") {
      store.dispatch({ type: e.shiftKey ? "redo" : "undo" });
      return true;
    }
    if (lower === "y") {
      store.dispatch({ type: "redo" });
      return true;
    }
    return false;
  }

  if (key === "Escape") {
    const before = store.getState();
    const transient = Boolean(before.gesture || before.draft);
    activeTool(store).cancel(makeCtx(store, env), "esc");
    if (!transient) store.dispatch({ type: "select", selection: null });
    return true;
  }

  const tool = activeTool(store);
  if (tool.onKey?.(makeCtx(store, env), e)) return true;

  if (!e.altKey) {
    const target = TOOL_ORDER.find((id) => TOOLS[id].hotkey === lower);
    if (target) {
      switchTool(store, env, target);
      return true;
    }
  }

  // Shift+P plays the route from its origin instead of the open level.
  if (!e.altKey && e.shiftKey && lower === "p") {
    store.dispatch({ type: "play", on: true, from: "origin" });
    return true;
  }

  if (!e.altKey && lower === "p") {
    store.dispatch({ type: "play", on: true });
    return true;
  }

  if (key === "Delete" || key === "Backspace") return deleteSelection(store, env);
  if (lower === "f") return flipSelection(store, env);
  return false;
}
