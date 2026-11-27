/**
 * Route play for the game: where a ship that leaves a level lands next.
 *
 * Pure. It carries the semantics of the editor's `playtest/route.ts` into the
 * game:
 * - an exit with a `to` target is always open (never Borealis-locked);
 * - up / right exits are forward travel: the target's Enter pose;
 * - a down exit is a way back: the ship falls (or flies) in through the
 *   target's own door that leads here, and the arrival is flagged `fallIn`
 *   so the game plays its short slow-motion;
 * - an exit that leads back to the same level is a soft re-entry: the level
 *   keeps its Borealis and Tonation attempt and the ship just re-enters;
 * - an exit with no target ends the route.
 */
import {
  leftFrameThroughOpening,
  touchedOpening,
} from "../modules/exit-zone";
import { SHIP_R, WORLD_H, WORLD_W, type Body } from "../modules/sim";
import type { GameRoute } from "./registry";
import type { LevelScene } from "./scene";

/** The exit a ship left through. */
export interface Departure {
  /** Index into the level's exits (and the scene's openings). */
  exit: number;
  /** Target level id, or null when the exit ends the route. */
  to: string | null;
}

export type Arrival =
  | {
      kind: "enter";
      levelId: string;
      body: Body;
      /** Falling in from a door above: play the short slow-motion. */
      fallIn: boolean;
      /** Same level: keep Borealis and the Tonation attempt. */
      soft: boolean;
      /** The arrival continues a forward exit (up / right). */
      forward: boolean;
    }
  | { kind: "end" }
  | { kind: "error"; message: string };

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
 * The exit the ship is leaving through this frame, if any: out the top or
 * right, or a falling hull touching the floor inside a bottom gap.
 */
export function matchDeparture(
  scene: LevelScene,
  body: { x: number; y: number; vy: number },
): Departure | null {
  const index = scene.openings.findIndex(
    (opening) => leftFrameThroughOpening(opening, body) || touchedOpening(opening, body),
  );
  if (index < 0) return null;
  return { exit: index, to: scene.doors[index]?.to ?? null };
}

/** Where the ship lands after `departure` out of `from`. */
export function arrive(
  route: GameRoute,
  from: LevelScene,
  departure: Departure,
  ship: Body,
): Arrival {
  if (departure.to === null) return { kind: "end" };
  const target = route.scenes.get(departure.to);
  if (!target) {
    return {
      kind: "error",
      message: `The exit leads to "${departure.to}", which is not in the route.`,
    };
  }
  const leaving = from.level.exits[departure.exit];
  const soft = target.id === from.id;
  const forward = leaving?.facing !== "down";
  const enter = (body: Body, fallIn = false): Arrival => ({
    kind: "enter",
    levelId: target.id,
    body,
    fallIn,
    soft,
    forward,
  });

  if (forward || soft) return enter({ ...target.start });

  // Going back: come in through the door of the target that leads here.
  const door = target.level.exits.find(
    (exit) => exit.to === from.id && exit.facing !== "down",
  );
  if (!door) return enter({ ...target.start });

  if (door.facing === "up") {
    return enter(
      {
        x: within(ship.x, door.x0, door.x1),
        y: WORLD_H + PUSH_IN,
        vx: clamp(ship.vx, -FALL_MAX, FALL_MAX),
        vy: clamp(ship.vy, -FALL_MAX, -FALL_MIN),
        restingOn: null,
      },
      true,
    );
  }
  return enter(
    {
      x: WORLD_W + PUSH_IN,
      y: within(ship.y, door.y0, door.y1),
      vx: -clamp(Math.abs(ship.vx), 150, 600),
      vy: 0,
      restingOn: null,
    },
    true,
  );
}
