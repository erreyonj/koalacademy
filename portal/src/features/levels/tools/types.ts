import type { ReactNode } from "react";
import type { Hit } from "../geometry";
import type { Action, EditorState, ToolId } from "../store";
import type { LayerId, LevelFile, Pt } from "../types";

/** Subset of `KeyboardEvent` the tools read, so tests can pass plain objects. */
export interface KeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export interface Mods {
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/** Everything a tool may touch. Tools never mutate the level directly. */
export interface ToolCtx {
  state: EditorState;
  /** Current level (same as `state.level`). */
  level: LevelFile;
  dispatch(action: Action): void;
  /** Pick radius in view units (already scaled for zoom). */
  tolerance: number;
  mods: Mods;
  /** Snap to the view-space grid (rounded to 2 decimals). */
  snap(p: Pt): Pt;
  /** Whether a layer takes pointer edits (visible and unlocked). */
  canEdit(layer: LayerId): boolean;
  /** Hit-test every editable layer at a logical point. */
  hit(p: Pt): Hit | null;
}

/**
 * One cursor tool. Only one is active at a time and each owns exactly one
 * kind of level data (Select is the shared pick/move/delete tool).
 */
export interface EditorTool {
  id: ToolId;
  label: string;
  hotkey: string;
  /** CSS cursor while active. */
  cursor: string;
  onPointerDown(ctx: ToolCtx, p: Pt): void;
  onPointerMove(ctx: ToolCtx, p: Pt): void;
  onPointerUp(ctx: ToolCtx, p: Pt): void;
  /** Return true when the key was used. */
  onKey?(ctx: ToolCtx, e: KeyInput): boolean | void;
  /** Preview under the cursor, drawn in view space. */
  ghost?(ctx: ToolCtx): ReactNode;
  /** Esc, or a tool switch. A tool may keep a draft across a switch. */
  cancel(ctx: ToolCtx, reason?: "esc" | "switch"): void;
}
