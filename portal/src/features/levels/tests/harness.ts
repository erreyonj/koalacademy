import { fromView } from "../geometry";
import { createLevel } from "../model";
import { createEditorStore, type ToolId } from "../store";
import {
  handleKey,
  pointerDown,
  pointerMove,
  pointerUp,
  switchTool,
  type HostEnv,
  type Mods,
} from "../tools";
import type { LevelFile, Pt } from "../types";

/** A point given in portrait view units (the grid is 4 view units by default). */
export function v(x: number, y: number): Pt {
  return fromView("portrait", { x, y });
}

/** Drives the store through the same host functions the canvas uses. */
export function harness(level: LevelFile = createLevel("test")) {
  const store = createEditorStore(level);
  const env: HostEnv = { tolerance: 3, mods: {} };

  const api = {
    store,
    env,
    get state() {
      return store.getState();
    },
    get level() {
      return store.getState().level;
    },
    tool(id: ToolId) {
      switchTool(store, env, id);
    },
    down(p: Pt, mods: Partial<Mods> = {}) {
      env.mods = mods;
      pointerDown(store, env, p);
    },
    move(p: Pt) {
      pointerMove(store, env, p);
    },
    up(p: Pt) {
      pointerUp(store, env, p);
      env.mods = {};
    },
    click(p: Pt, mods: Partial<Mods> = {}) {
      api.down(p, mods);
      api.up(p);
    },
    drag(a: Pt, b: Pt, mods: Partial<Mods> = {}) {
      api.down(a, mods);
      api.move({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      api.move(b);
      api.up(b);
    },
    key(key: string, mods: { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean } = {}) {
      return handleKey(store, env, { key, ...mods });
    },
    get undoDepth() {
      return store.getState().past.length;
    },
  };
  return api;
}
