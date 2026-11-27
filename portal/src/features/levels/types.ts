/**
 * Level file: everything the editor authors, in the game's own coordinate
 * space. Logical space is portrait 900×1600, origin bottom-left, +y up (see
 * `notehead/modules/sim.ts`). Nothing here is an image or an asset.
 */
import type { Ledge, PitchName } from "../notehead/modules/sim";

export type { Ledge, PitchName };

/** A point in logical space (+y up). */
export interface Pt {
  x: number;
  y: number;
}

/** Portrait mirrors launch / stairs / notch (200×360); landscape mirrors zig (554×308). */
export type LevelView = "portrait" | "landscape";

/** One rock mass. Open lines are closed off-frame by the adapter. */
export interface TerrainShape {
  id: string;
  points: Pt[];
  /** True when the player closed the ring themselves. */
  closed: boolean;
  /** Seed for the rock score marks, so a level renders identically every load. */
  tickSeed: number;
}

/**
 * A landable surface the player authors. It has no pitch: how high a band sits
 * means nothing, and the game's own `Ledge` pitch is filled in by the adapter.
 */
export type BandSpot = Omit<Ledge, "pitch">;

export interface BorealisSpot {
  id: string;
  x: number;
  y: number;
  pitch: PitchName;
}

/** Ship entry: position plus launch velocity (logical px / s). */
export interface EnterPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /**
   * The ship leaves an exit (or loops back through a portal) before it lands,
   * so the player must catch it with an Anachrometer warp to play the level.
   * Absent means false.
   */
  mustCatch?: boolean;
}

export type ExitFacing = "up" | "right" | "down";

/**
 * A gap in the sealed frame. Mirrors the game's `FrameOpening`: up / down use
 * `x0..x1`, right uses `y0..y1`. The unused axis holds the frame edge.
 */
export interface ExitOpening {
  id: string;
  facing: ExitFacing;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /**
   * Id of the level this exit leads to when levels are played as a route.
   * Absent means a dead end: leaving here clears (or resets) the level alone.
   */
  to?: string;
}

export interface LevelFile {
  version: 1;
  id: string;
  view: LevelView;
  terrain: TerrainShape[];
  /** Landable surfaces (`kind`: band | step | block). Never inferred from terrain. */
  bands: BandSpot[];
  /** Array order is goal order. */
  borealis: BorealisSpot[];
  enter: EnterPoint | null;
  exits: ExitOpening[];
}

/** Item kinds a selection can point at. */
export type ItemKind = "terrain" | "band" | "borealis" | "enter" | "exit";

export interface Selection {
  kind: ItemKind;
  /** Item id. The enter point uses `"enter"`. */
  id: string;
  /** Selected terrain vertex, when one is picked. */
  vertex?: number;
}

/** Layers map one-to-one onto tools (Enter/Exit share one layer). */
export type LayerId = "terrain" | "band" | "borealis" | "enterExit";

export interface LayerState {
  visible: boolean;
  locked: boolean;
}

export type Layers = Record<LayerId, LayerState>;
