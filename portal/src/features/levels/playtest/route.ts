/**
 * Route play: carry the ship from one level of a route to the next.
 *
 * Pure, like `runtime.ts`. A level's exit with a `to` target is a door. When
 * the ship departs through one, `arrive` says which level it lands in and
 * where:
 * - through an up or right door (forward): the target's Enter point, with the
 *   target's Enter velocity;
 * - through a down door (back): in through the target's own door that leads
 *   here, with the ship's x (up door) or y (right door) kept inside that gap,
 *   and falling or flying into the frame. Without such a door it falls back
 *   to the Enter point.
 */
import { WORLD_H, WORLD_W, SHIP_R, type Body } from "../../notehead/modules/sim";
import type { LevelFile } from "../types";
import {
  buildScene,
  createState,
  type Departure,
  type PlaytestScene,
  type PlaytestState,
} from "./runtime";

/** Scenes by level id. Null marks a level that cannot be played yet. */
export type RouteScenes = Map<string, PlaytestScene | null>;

export function buildRouteScenes(levels: readonly LevelFile[]): RouteScenes {
  return new Map(levels.map((level) => [level.id, buildScene(level)]));
}

export interface Arrival {
  /** Index of the level the ship lands in. */
  index: number;
  scene: PlaytestScene;
  body: Body;
}

export type ArrivalResult = Arrival | { error: string };

const FALL_MIN = 60;
const FALL_MAX = 400;
const PUSH_IN = SHIP_R * 2;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** `n` kept inside [lo, hi] with a margin, or the middle when the gap is too narrow. */
function within(n: number, lo: number, hi: number): number {
  const margin = SHIP_R * 2;
  if (hi - lo <= margin * 2) return (lo + hi) / 2;
  return clamp(n, lo + margin, hi - margin);
}

/**
 * Where the ship lands after departing `from` through `departed`. The ship's
 * body is the one it had when it left.
 */
export function arrive(
  levels: readonly LevelFile[],
  scenes: RouteScenes,
  from: LevelFile,
  departed: Departure,
  ship: Body,
): ArrivalResult {
  const index = levels.findIndex((level) => level.id === departed.to);
  if (index < 0) {
    return { error: `This exit leads to "${departed.to}", which is not in the route.` };
  }
  const target = levels[index]!;
  const scene = scenes.get(target.id);
  if (!scene) return { error: `"${target.id}" cannot be played yet. Open it to see why.` };

  const leaving = from.exits[departed.exit];
  if (leaving?.facing !== "down") return { index, scene, body: { ...scene.start } };

  // Going back: come in through the door of the target that leads here.
  const door = target.exits.find((exit) => exit.to === from.id && exit.facing !== "down");
  if (!door) return { index, scene, body: { ...scene.start } };

  if (door.facing === "up") {
    return {
      index,
      scene,
      body: {
        x: within(ship.x, door.x0, door.x1),
        y: WORLD_H + PUSH_IN,
        vx: clamp(ship.vx, -FALL_MAX, FALL_MAX),
        vy: clamp(ship.vy, -FALL_MAX, -FALL_MIN),
        restingOn: null,
      },
    };
  }
  return {
    index,
    scene,
    body: {
      x: WORLD_W + PUSH_IN,
      y: within(ship.y, door.y0, door.y1),
      vx: -clamp(Math.abs(ship.vx), 150, 600),
      vy: 0,
      restingOn: null,
    },
  };
}

/**
 * A fresh run state in the target level that keeps the run's counters and
 * clock (travelling is not a reset).
 */
export function enterLevel(
  scene: PlaytestScene,
  prev: Pick<PlaytestState, "hardHits" | "shots" | "resets" | "clock">,
  body: Body,
  notice: string | null = null,
): PlaytestState {
  return {
    ...createState(scene, undefined, notice),
    body: { ...body },
    hardHits: prev.hardHits,
    shots: prev.shots,
    resets: prev.resets,
    clock: prev.clock,
  };
}
