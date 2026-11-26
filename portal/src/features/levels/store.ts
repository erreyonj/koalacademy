/**
 * Editor state, undo history, and a tiny external store.
 *
 * Tools never mutate the level. They dispatch actions. A drag streams `live`
 * edits and ends with `endEdit`, so each finished gesture is one undo step.
 */
import { DEFAULT_BOREALIS_PITCH, createLevel, nextId, round2 } from "./model";
import { defaultLayers } from "./geometry";
import { WORLD_H, WORLD_W } from "../notehead/modules/sim";
import { maxHp } from "../notehead/modules/health";
import { TONATION_CAP, clampTonation } from "../notehead/modules/tonation";
import { PLAY_GEM_ID, playBlocker } from "./playtest/runtime";
import type {
  EnterPoint,
  ExitFacing,
  ExitOpening,
  LayerId,
  LayerState,
  Layers,
  BandSpot,
  BorealisSpot,
  Ledge,
  LevelFile,
  PitchName,
  Pt,
  Selection,
} from "./types";

export type ToolId = "select" | "terrain" | "band" | "borealis" | "enter-exit";

/** A terrain line in progress. Lives outside the level until it is finished. */
export interface TerrainDraft {
  points: Pt[];
}

/** Transient pointer gesture. Each kind is owned by the tool that starts it. */
export type Gesture =
  | { kind: "terrain-vertex"; id: string; index: number }
  | { kind: "terrain-move"; id: string; grab: Pt; origin: Pt[] }
  | { kind: "band-create"; id: string; anchor: Pt }
  | { kind: "band-end"; id: string; end: 0 | 1; slope: boolean; origin: BandSpot }
  | { kind: "band-move"; id: string; grab: Pt; origin: BandSpot }
  | { kind: "borealis-move"; id: string; reorder: boolean; origin: Pt }
  | { kind: "enter-aim"; anchor: Pt; keep: { vx: number; vy: number } }
  | { kind: "enter-move"; grab: Pt; origin: EnterPoint }
  | { kind: "exit-create"; id: string; facing: ExitFacing; anchor: number }
  | { kind: "exit-move"; id: string; grab: number; origin: ExitOpening };

export interface EditorOptions {
  /** Grid in view units. 0 is off. */
  grid: number;
  band: { kind: Ledge["kind"] };
  /** Pitch the next placed Borealis gets. */
  borealis: { pitch: PitchName };
  enterExit: { mode: "enter" | "exit" };
}

export function defaultOptions(): EditorOptions {
  return {
    grid: 4,
    band: { kind: "band" },
    borealis: { pitch: DEFAULT_BOREALIS_PITCH },
    enterExit: { mode: "enter" },
  };
}

/** Hull the playtest starts with: the game's roomiest profile (Easy). */
export const HULL_MAX = maxHp("easy");
export { TONATION_CAP };

/**
 * Playtest controls that live outside the playtest view (toolbar, sidebar).
 * Session-only: reset on every Play, never written to the level file.
 */
export interface PlaySession {
  /** Press-to-warp is available in flight. */
  anachrometer: boolean;
  /** Display only: nothing in the flight costs hull. */
  hull: number;
  /** Display only, 0..TONATION_CAP. */
  tonation: number;
  /** The Borealis cursor owns the scene instead of aiming. */
  borealisTool: boolean;
  /** Pitch the Borealis cursor gives a new gem. */
  gemPitch: PitchName;
  /** Borealis added during play, on top of the level's own. */
  extraBorealis: BorealisSpot[];
  selectedGem: string | null;
}

export function defaultSession(): PlaySession {
  return {
    anachrometer: false,
    hull: HULL_MAX,
    tonation: 0,
    borealisTool: false,
    gemPitch: DEFAULT_BOREALIS_PITCH,
    extraBorealis: [],
    selectedGem: null,
  };
}

export type GemAction =
  | { op: "add"; x: number; y: number; pitch?: PitchName }
  | { op: "patch"; id: string; patch: Partial<Omit<BorealisSpot, "id">> }
  | { op: "remove"; id: string }
  | { op: "clear" };

export interface EditorState {
  level: LevelFile;
  past: LevelFile[];
  future: LevelFile[];
  /** Level before the current live gesture began. Null when idle. */
  base: LevelFile | null;
  tool: ToolId;
  selection: Selection | null;
  draft: TerrainDraft | null;
  gesture: Gesture | null;
  /** Pointer in logical space, for ghosts. */
  hover: Pt | null;
  layers: Layers;
  options: EditorOptions;
  /** Playtest is running. The level is read-only until it stops. */
  playing: boolean;
  play: PlaySession;
}

export type Action =
  | { type: "edit"; level: LevelFile; live?: boolean }
  | { type: "endEdit" }
  | { type: "cancelEdit" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "load"; level: LevelFile }
  | { type: "setTool"; tool: ToolId }
  | { type: "select"; selection: Selection | null }
  | { type: "draft"; draft: TerrainDraft | null }
  | { type: "gesture"; gesture: Gesture | null }
  | { type: "hover"; p: Pt | null }
  | { type: "layer"; layer: LayerId; patch: Partial<LayerState> }
  | { type: "options"; options: EditorOptions }
  | { type: "play"; on: boolean }
  | { type: "session"; patch: Partial<Omit<PlaySession, "extraBorealis">> }
  | ({ type: "gem" } & GemAction);

export const HISTORY_LIMIT = 200;

export function createState(level: LevelFile = createLevel()): EditorState {
  return {
    level,
    past: [],
    future: [],
    base: null,
    tool: "select",
    selection: null,
    draft: null,
    gesture: null,
    hover: null,
    layers: defaultLayers(),
    options: defaultOptions(),
    playing: false,
    play: defaultSession(),
  };
}

function pushPast(past: LevelFile[], entry: LevelFile): LevelFile[] {
  const next = [...past, entry];
  return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
}

/** Drop a selection whose item no longer exists. */
function pruneSelection(
  selection: Selection | null,
  level: LevelFile,
): Selection | null {
  if (!selection) return null;
  switch (selection.kind) {
    case "terrain": {
      const shape = level.terrain.find((s) => s.id === selection.id);
      if (!shape) return null;
      if (selection.vertex !== undefined && selection.vertex >= shape.points.length) {
        return { kind: "terrain", id: shape.id };
      }
      return selection;
    }
    case "band":
      return level.bands.some((b) => b.id === selection.id) ? selection : null;
    case "borealis":
      return level.borealis.some((g) => g.id === selection.id) ? selection : null;
    case "exit":
      return level.exits.some((e) => e.id === selection.id) ? selection : null;
    case "enter":
      return level.enter ? selection : null;
  }
}

function clampTo(n: number, max: number): number {
  return Math.max(0, Math.min(max, n));
}

function reduceGems(play: PlaySession, action: { type: "gem" } & GemAction): PlaySession {
  switch (action.op) {
    case "add": {
      const spot: BorealisSpot = {
        id: nextId(PLAY_GEM_ID, play.extraBorealis),
        x: round2(action.x),
        y: round2(action.y),
        pitch: action.pitch ?? play.gemPitch,
      };
      return { ...play, extraBorealis: [...play.extraBorealis, spot], selectedGem: spot.id };
    }
    case "patch":
      return {
        ...play,
        extraBorealis: play.extraBorealis.map((gem) =>
          gem.id === action.id
            ? {
                ...gem,
                ...action.patch,
                x: clampTo(action.patch.x ?? gem.x, WORLD_W),
                y: clampTo(action.patch.y ?? gem.y, WORLD_H),
              }
            : gem,
        ),
      };
    case "remove":
      return {
        ...play,
        extraBorealis: play.extraBorealis.filter((gem) => gem.id !== action.id),
        selectedGem: play.selectedGem === action.id ? null : play.selectedGem,
      };
    case "clear":
      return { ...play, extraBorealis: [], selectedGem: null };
  }
}

export function reduce(state: EditorState, action: Action): EditorState {
  // The level is read-only while a playtest runs. Only stopping, loading and
  // the play-session controls get through.
  if (
    state.playing &&
    action.type !== "play" &&
    action.type !== "load" &&
    action.type !== "session" &&
    action.type !== "gem"
  ) {
    return state;
  }
  switch (action.type) {
    case "edit": {
      if (action.live) {
        return {
          ...state,
          level: action.level,
          base: state.base ?? state.level,
        };
      }
      const before = state.base ?? state.level;
      if (action.level === before) return { ...state, base: null };
      return {
        ...state,
        level: action.level,
        past: pushPast(state.past, before),
        future: [],
        base: null,
        selection: pruneSelection(state.selection, action.level),
      };
    }
    case "endEdit": {
      if (!state.base) return state;
      if (state.base === state.level) return { ...state, base: null };
      return {
        ...state,
        past: pushPast(state.past, state.base),
        future: [],
        base: null,
        selection: pruneSelection(state.selection, state.level),
      };
    }
    case "cancelEdit": {
      if (!state.base) return state;
      return {
        ...state,
        level: state.base,
        base: null,
        selection: pruneSelection(state.selection, state.base),
      };
    }
    case "undo": {
      if (state.base) {
        return {
          ...state,
          level: state.base,
          base: null,
          gesture: null,
          selection: pruneSelection(state.selection, state.base),
        };
      }
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        level: previous,
        past: state.past.slice(0, -1),
        future: [state.level, ...state.future],
        gesture: null,
        selection: pruneSelection(state.selection, previous),
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next || state.base) return state;
      return {
        ...state,
        level: next,
        past: pushPast(state.past, state.level),
        future: state.future.slice(1),
        gesture: null,
        selection: pruneSelection(state.selection, next),
      };
    }
    case "load":
      return {
        ...state,
        level: action.level,
        past: [],
        future: [],
        base: null,
        selection: null,
        draft: null,
        gesture: null,
        hover: null,
        playing: false,
      };
    case "setTool":
      return { ...state, tool: action.tool };
    case "select":
      return { ...state, selection: action.selection };
    case "draft":
      return { ...state, draft: action.draft };
    case "gesture":
      return { ...state, gesture: action.gesture };
    case "hover":
      return { ...state, hover: action.p };
    case "layer":
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.layer]: { ...state.layers[action.layer], ...action.patch },
        },
      };
    case "options":
      return { ...state, options: action.options };
    case "play": {
      if (action.on === state.playing) return state;
      if (!action.on) return { ...state, playing: false, play: defaultSession() };
      // Only a settled, playable level can run.
      if (state.base || state.gesture || playBlocker(state.level)) return state;
      return { ...state, playing: true, hover: null, play: defaultSession() };
    }
    case "session": {
      if (!state.playing) return state;
      const merged = { ...state.play, ...action.patch };
      return {
        ...state,
        play: {
          ...merged,
          hull: Math.max(0, Math.min(HULL_MAX, Math.round(merged.hull))),
          tonation: clampTonation(merged.tonation),
        },
      };
    }
    case "gem": {
      if (!state.playing) return state;
      return { ...state, play: reduceGems(state.play, action) };
    }
  }
}

export interface EditorStore {
  getState(): EditorState;
  dispatch(action: Action): void;
  subscribe(listener: () => void): () => void;
}

export function createEditorStore(
  level: LevelFile = createLevel(),
): EditorStore {
  let state = createState(level);
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
