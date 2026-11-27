/**
 * Playtest runtime: fly an authored level with the game's own physics.
 *
 * Pure and framework-free. It uses only the sim functions that take their
 * data as arguments (`step`, `stepBorealis`, `resolveMassesAgainst`,
 * `containAgainstOpenings`), never the region registry or story progress, so
 * a level under test cannot touch the shipped game.
 *
 * Rules that are the editor's, not the game's:
 * - Bands always catch (the same policy the aim chart uses).
 * - Leaving through an exit clears the level only when every Borealis is
 *   collected; leaving early, flying out of bounds or sitting stuck on rock
 *   resets the run.
 * - An exit with a `to` target is a door to another level of the route. Doors
 *   are never locked by Borealis (a player may skip them at any time). The
 *   ship does not clear: it `departed`, and the caller (see `route.ts`)
 *   carries it into the target level. Only an exit with no target still needs
 *   every Borealis.
 * - No hull HP. Hard hits are counted so a level can be judged on them.
 */
import {
  borealisFromSpot,
  previewLevel,
  type PreviewLevel,
} from "../adapter";
import { fromView } from "../geometry";
import { validateLevel } from "../model";
import type { BorealisSpot, LevelFile, LevelView } from "../types";
import {
  resolveMassesAgainst,
  type LogicalMass,
} from "../../notehead/modules/collide";
import { stepBorealis, type Borealis } from "../../notehead/modules/borealis";
import {
  WARP_BAND_ID,
  canWarp,
  engageWarp,
  followWarpBand,
} from "../../notehead/modules/anachrometer";
import {
  OOB_X,
  OOB_Y,
  containAgainstOpenings,
  leftFrameThroughOpening,
  touchedOpening,
  type FrameOpening,
  type OpeningFacing,
} from "../../notehead/modules/exit-zone";
import {
  BREAK_SPEED,
  FIXED_DT,
  GRAVITY,
  WORLD_H,
  WORLD_W,
  aimFromPull,
  isSlopedStep,
  launchVelocity,
  ledgeById,
  step,
  type Aim,
  type Body,
  type Ledge,
  type RegionId,
  type StepPolicy,
} from "../../notehead/modules/sim";

/** Authored bands always catch, like the live aim chart. */
export const PLAYTEST_POLICY: StepPolicy = {
  breakSpeed: BREAK_SPEED,
  catchBands: true,
};

/** Id prefix of Borealis added during play (`pt-gem-1`). */
export const PLAY_GEM_ID = "pt-gem";
/** A pull shorter than this cancels a warp instead of launching from it. */
export const WARP_MIN_POWER = 0.08;

/** Frames of near-zero motion off a ledge before the run resets (2 s). */
export const STALL_FRAMES = 120;
/** Per-frame travel (logical units) that counts as "not moving". */
const STALL_STEP = 0.15;
/** Frames the aim chart simulates at most (10 s at 60 Hz). */
const CHART_FRAMES = 600;
/** Consecutive stalled preview frames before stopping a rock-wedged chart. */
const CHART_STALL_LIMIT = 6;

/** Where an exit leads, when the level is part of a route. */
export interface SceneDoor {
  to: string;
  facing: OpeningFacing;
}

/** The exit a ship left through, and the level it was headed for. */
export interface Departure {
  /** Index into the level's exits (and the scene's openings). */
  exit: number;
  to: string;
}

export interface PlaytestScene {
  view: LevelView;
  regionId: RegionId;
  masses: LogicalMass[];
  ledges: Ledge[];
  borealis: Borealis[];
  openings: FrameOpening[];
  /** One entry per opening: its route target, or null for a plain exit. */
  doors: (SceneDoor | null)[];
  start: Body;
}

export interface PlaytestState {
  body: Body;
  borealis: Borealis[];
  collected: number;
  total: number;
  hardHits: number;
  shots: number;
  resets: number;
  clock: number;
  /** Consecutive frames spent unmoving off a ledge. */
  still: number;
  cleared: boolean;
  /** Set when the ship leaves through an exit that leads to another level. */
  departed: Departure | null;
  /**
   * Anachrometer band under the ship while a warp is held. It follows the
   * ship and is not a surface: the ship flies on until the player releases.
   */
  warp: Ledge | null;
  /** Why the last reset happened, for the HUD. */
  notice: string | null;
}

/** The reset notice `advance` sets when the ship leaves before collecting everything. */
const LEFT_EARLY = "Left early. Collect every Borealis first.";
/** Frames of hands-off flight checked for a free ride out an exit (10 s). */
const UNATTENDED_FRAMES = 600;

/** Level problems that are visible without flying it. */
function staticBlocker(level: LevelFile): string | null {
  const errors = validateLevel(level);
  if (errors.length > 0) return errors[0]!;
  if (!level.enter) return "Place an enter point first.";
  if (level.exits.length === 0) return "Add an exit first.";
  return null;
}

/**
 * True when the ship, with no shots fired, leaves through an exit before it
 * lands on a ledge. A down exit fires on a falling hull touching the floor in
 * the gap, so an enter point above one clears (or resets) the run before the
 * player can act, and "Play again" repeats it forever.
 */
export function exitsUnattended(level: LevelFile): boolean {
  const scene = buildScene(level);
  if (!scene) return false;
  let state = createState(scene);
  for (let i = 0; i < UNATTENDED_FRAMES; i++) {
    const next = advance(scene, state);
    if (next.cleared || next.departed || next.notice === LEFT_EARLY) return true;
    if (next.body.restingOn) return false;
    state = next;
  }
  return false;
}

/** Why a level cannot be played yet, or null when it can. */
export function playBlocker(level: LevelFile): string | null {
  const fixed = staticBlocker(level);
  if (fixed) return fixed;
  if (exitsUnattended(level)) {
    return "The ship flies out an exit before it lands on anything. Start it higher or away from the exit.";
  }
  return null;
}

/** Build the sandbox scene from a level. Null while `playBlocker` has a reason. */
export function buildScene(
  level: LevelFile,
  precomputedPreview?: PreviewLevel,
): PlaytestScene | null {
  if (staticBlocker(level) !== null || !level.enter) return null;
  const preview = precomputedPreview ?? previewLevel(level, { ticks: false });
  return {
    view: level.view,
    regionId: preview.regionId,
    masses: preview.masses.map((mass) => ({
      id: mass.id,
      outline: mass.outline.map((p) => fromView(level.view, p)),
    })),
    ledges: preview.ledges,
    borealis: level.borealis.map(borealisFromSpot),
    openings: preview.openings,
    doors: level.exits.map((exit) =>
      exit.to !== undefined ? { to: exit.to, facing: exit.facing } : null,
    ),
    start: {
      x: level.enter.x,
      y: level.enter.y,
      vx: level.enter.vx,
      vy: level.enter.vy,
      restingOn: null,
    },
  };
}

export function createState(
  scene: PlaytestScene,
  prev?: Pick<PlaytestState, "hardHits" | "shots" | "resets">,
  notice: string | null = null,
): PlaytestState {
  const borealis = scene.borealis.map((gem) => ({ ...gem }));
  return {
    body: { ...scene.start },
    borealis,
    collected: 0,
    total: borealis.length,
    hardHits: prev?.hardHits ?? 0,
    shots: prev?.shots ?? 0,
    resets: prev ? prev.resets + 1 : 0,
    clock: 0,
    still: 0,
    cleared: false,
    departed: null,
    warp: null,
    notice,
  };
}

/** True once a run has nothing left to simulate: cleared, or off to another level. */
export function runOver(state: Pick<PlaytestState, "cleared" | "departed">): boolean {
  return state.cleared || state.departed !== null;
}

/** Back to the enter point, keeping the run's counters. */
export function resetState(
  scene: PlaytestScene,
  state: PlaytestState,
  notice: string | null = null,
): PlaytestState {
  return createState(scene, state, notice);
}

function outOfBounds(body: Body): boolean {
  return (
    body.y < -OOB_Y ||
    body.y > WORLD_H + OOB_Y ||
    body.x < -OOB_X ||
    body.x > WORLD_W + OOB_X
  );
}

/** One body frame: ledges, then rock, then the frame walls. */
export function stepBody(
  scene: PlaytestScene,
  body: Body,
  dt: number = FIXED_DT,
): { body: Body; hit: boolean; landedId: string | null } {
  const result = step(body, scene.ledges, dt, GRAVITY, PLAYTEST_POLICY);
  let next = result.body;
  let hit = false;
  const seat = ledgeById(scene.ledges, next.restingOn);
  // Flat ledge seats stay authoritative; sliding treads still need walls.
  if (!next.restingOn || isSlopedStep(seat)) {
    const solid = resolveMassesAgainst(next, scene.masses);
    next = solid.body;
    hit = solid.hit;
    if (scene.openings.length > 0) {
      const sealed = containAgainstOpenings(next, scene.openings);
      next = sealed.body;
      hit = hit || sealed.hit;
    }
  }
  return { body: next, hit, landedId: result.landedId };
}

/** One fixed frame of the run. */
export function advance(
  scene: PlaytestScene,
  state: PlaytestState,
  opts: { gems?: boolean } = {},
): PlaytestState {
  if (runOver(state)) return state;

  const moved = stepBody(scene, state.body);
  const body = moved.body;
  // While warping the ship runs slow but Borealis stay in real time, so the
  // caller turns this off and calls `tickBorealis` itself.
  const gems =
    opts.gems === false
      ? { list: state.borealis, collected: [] as Borealis[] }
      : stepBorealis(state.borealis, body, FIXED_DT);
  const collected = state.collected + gems.collected.length;
  const allCollected = state.total === 0 || collected >= state.total;

  const leftBy = scene.openings.findIndex(
    (opening) =>
      leftFrameThroughOpening(opening, body) || touchedOpening(opening, body),
  );
  const left = leftBy >= 0;
  const next: PlaytestState = {
    ...state,
    body,
    borealis: gems.list,
    collected,
    hardHits: state.hardHits + (moved.hit ? 1 : 0),
    clock: state.clock + FIXED_DT,
    // A real surface drops the warp; otherwise the band keeps tracking the ship.
    warp: state.warp && !body.restingOn ? followWarpBand(body) : null,
    notice: state.notice,
  };

  const door = left ? scene.doors[leftBy] : null;
  if (left && door) {
    // A door to another level is open whatever has been collected.
    return { ...next, departed: { exit: leftBy, to: door.to }, notice: null };
  }
  if (left) {
    if (allCollected) return { ...next, cleared: true, notice: null };
    return resetState(scene, next, LEFT_EARLY);
  }
  if (outOfBounds(body)) {
    return resetState(scene, next, "Out of bounds.");
  }

  const travelled = Math.hypot(body.x - state.body.x, body.y - state.body.y);
  const idle = !body.restingOn && travelled < STALL_STEP;
  const still = idle ? state.still + 1 : 0;
  if (still > STALL_FRAMES) {
    return resetState(scene, next, "Stuck on rock.");
  }
  return { ...next, still };
}

/** The aim a drag produces. `pull` is the drag in logical space (+y up). */
export function aimFor(
  scene: PlaytestScene,
  restingId: string,
  pull: { x: number; y: number },
): Aim {
  return aimFromPull(scene.regionId, restingId, pull.x, pull.y, 0, "free");
}

/** The seat an aim launches from: the ledge underfoot, else the held warp band. */
function homeOf(state: Pick<PlaytestState, "body" | "warp">): string | null {
  return state.body.restingOn ?? (state.warp ? WARP_BAND_ID : null);
}

/**
 * Launch from the ledge the ship rests on, or from the held warp band in
 * flight. A tiny pull cancels a warp; on the ground it is ignored.
 */
export function fire(
  scene: PlaytestScene,
  state: PlaytestState,
  pull: { x: number; y: number },
): PlaytestState {
  const { body } = state;
  const home = homeOf(state);
  if (runOver(state) || !home) return state;
  const aim = aimFor(scene, home, pull);
  if (state.warp && !body.restingOn && aim.power < WARP_MIN_POWER) {
    return cancelWarp(state);
  }
  if (aim.power <= 0.02) return state;
  const velocity = launchVelocity(scene.regionId, home, aim, 0, "free");
  return {
    ...state,
    body: { ...body, ...velocity, restingOn: null },
    warp: null,
    shots: state.shots + 1,
    notice: null,
  };
}

/** True when a press mid-flight may open an Anachrometer warp. */
export function canEngageWarp(state: PlaytestState, enabled: boolean): boolean {
  return (
    !runOver(state) && canWarp(enabled, state.body.restingOn, state.warp !== null)
  );
}

/** Slow the world and hold a band under the ship. No-op unless `canEngageWarp`. */
export function engageWarpState(
  state: PlaytestState,
  enabled: boolean,
): PlaytestState {
  if (!canEngageWarp(state, enabled)) return state;
  const engaged = engageWarp(state.body);
  return { ...state, body: engaged.body, warp: engaged.warp };
}

/** Let go of the warp without launching. */
export function cancelWarp(state: PlaytestState): PlaytestState {
  return state.warp ? { ...state, warp: null } : state;
}

/** Borealis in real time (`dt` is wall-clock seconds), for use while warping. */
export function tickBorealis(
  state: PlaytestState,
  dt: number,
): PlaytestState {
  if (runOver(state) || state.total === 0) return state;
  const gems = stepBorealis(state.borealis, state.body, dt);
  if (gems.collected.length === 0 && gems.list === state.borealis) return state;
  return {
    ...state,
    borealis: gems.list,
    collected: state.collected + gems.collected.length,
  };
}

/** The scene with the session's added Borealis folded in, so resets keep them. */
export function withExtras(
  scene: PlaytestScene,
  extras: readonly BorealisSpot[],
): PlaytestScene {
  if (extras.length === 0) return scene;
  return {
    ...scene,
    borealis: [...scene.borealis, ...extras.map(borealisFromSpot)],
  };
}

/**
 * Reconcile the running state with the session's added Borealis without
 * touching the ship: new ones appear, edited ones move, removed ones go.
 * Collected gems stay collected. The level's own Borealis are never touched.
 */
export function syncExtras(
  state: PlaytestState,
  extras: readonly BorealisSpot[],
): PlaytestState {
  if (runOver(state)) return state;
  const wanted = new Map(extras.map((spot) => [spot.id, spot]));
  const isExtra = (id: string) => id.startsWith(`${PLAY_GEM_ID}-`);
  const list: Borealis[] = [];
  const seen = new Set<string>();
  for (const gem of state.borealis) {
    if (!isExtra(gem.id)) {
      list.push(gem);
      continue;
    }
    const spot = wanted.get(gem.id);
    if (!spot) continue;
    seen.add(gem.id);
    const same = gem.x === spot.x && gem.y === spot.y && gem.pitch === spot.pitch;
    list.push(
      gem.collected || same
        ? gem
        : { ...gem, x: spot.x, y: spot.y, homeX: spot.x, pitch: spot.pitch },
    );
  }
  for (const spot of extras) {
    if (!seen.has(spot.id)) list.push(borealisFromSpot(spot));
  }
  const collected = list.filter((gem) => gem.collected).length;
  if (
    list.length === state.borealis.length &&
    collected === state.collected &&
    list.every((gem, i) => gem === state.borealis[i])
  ) {
    return state;
  }
  return { ...state, borealis: list, collected, total: list.length };
}

/** The flight a pull would produce, until it lands or leaves. */
export function chartShot(
  scene: PlaytestScene,
  body: Body,
  pull: { x: number; y: number },
  /** Seat to aim from when the ship is airborne, e.g. a held warp band. */
  airHome: string | null = null,
): {
  points: { x: number; y: number }[];
  apex: { x: number; y: number } | null;
  landedOn: string | null;
} {
  const restingId = body.restingOn ?? airHome;
  if (!restingId) return { points: [], apex: null, landedOn: null };
  const aim = aimFor(scene, restingId, pull);
  const velocity = launchVelocity(scene.regionId, restingId, aim, 0, "free");
  let current: Body = { ...body, ...velocity, restingOn: null };
  const points = [{ x: body.x, y: body.y }];
  let apex = { x: current.x, y: current.y };
  let landedOn: string | null = null;
  let stillFrames = 0;

  for (let frame = 0; frame < CHART_FRAMES && !landedOn; frame++) {
    const prevX = current.x;
    const prevY = current.y;
    const result = stepBody(scene, current);
    current = result.body;
    if (frame % 2 === 0) points.push({ x: current.x, y: current.y });
    if (current.y >= apex.y) apex = { x: current.x, y: current.y };
    if (
      scene.openings.some(
        (opening) =>
          leftFrameThroughOpening(opening, current) ||
          touchedOpening(opening, current),
      )
    ) {
      points.push({ x: current.x, y: current.y });
      break;
    }
    if (outOfBounds(current)) break;
    const moveDx = current.x - prevX;
    const moveDy = current.y - prevY;
    if (!current.restingOn && moveDx * moveDx + moveDy * moveDy < 0.25) {
      stillFrames += 1;
      if (stillFrames >= CHART_STALL_LIMIT) {
        points.push({ x: current.x, y: current.y });
        break;
      }
    } else {
      stillFrames = 0;
    }
    if (!result.landedId || !current.restingOn) continue;
    points.push({ x: current.x, y: current.y });
    landedOn = result.landedId;
  }
  return { points, apex, landedOn };
}
