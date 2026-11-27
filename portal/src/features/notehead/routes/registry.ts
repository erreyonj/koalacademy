/**
 * Route files the game can play. Each `*.route.json` is authored in the level
 * editor (`{version, id, origin, levels}`); this registry validates it, builds
 * a scene per level and registers each level with the sim, so nothing else in
 * the game needs to know a route's contents ahead of time.
 */
import { parseLevelSet, validateRoute } from "../../levels/model";
import type { LevelFile } from "../../levels/types";
import notch1 from "./notch1.route.json";
import zig1perspective from "./zig1perspective.route.json";
import { buildLevelScene, registerScene, type LevelScene } from "./scene";

export interface GameRoute {
  id: string;
  /** The level the route begins on. */
  origin: string;
  levels: readonly LevelFile[];
  scenes: ReadonlyMap<string, LevelScene>;
}

export const DEFAULT_ROUTE_ID = "notch1";

const SOURCES: Record<string, unknown> = {
  notch1,
  zig1perspective,
};

/** Route ids the game ships. */
export const ROUTE_IDS: readonly string[] = Object.keys(SOURCES);

/**
 * Turn route file text into a playable route. Throws, naming the problem,
 * when the file is not a usable route: bad levels, a missing Enter or exit,
 * or a door whose target is not in the route.
 */
export function loadRouteText(text: string, fallbackId = "route"): GameRoute {
  const parsed = parseLevelSet(text);
  if (!parsed.ok) throw new Error(`Route "${fallbackId}": ${parsed.errors.join("; ")}`);
  const origin = parsed.origin ?? parsed.levels[0]!.id;
  const id = parsed.routeId ?? fallbackId;
  const check = validateRoute(parsed.levels, origin);
  const problems = [...check.errors, ...check.warnings];
  if (problems.length > 0) throw new Error(`Route "${id}": ${problems.join("; ")}`);
  const scenes = new Map<string, LevelScene>();
  for (const level of parsed.levels) {
    scenes.set(level.id, buildLevelScene(level));
  }
  for (const scene of scenes.values()) registerScene(scene);
  return { id, origin, levels: parsed.levels, scenes };
}

const loaded = new Map<string, GameRoute>();

/** A shipped route by id, built and registered on first use. */
export function getRoute(id: string = DEFAULT_ROUTE_ID): GameRoute {
  const hit = loaded.get(id);
  if (hit) return hit;
  const source = SOURCES[id];
  if (source === undefined) throw new Error(`Unknown route "${id}".`);
  const route = loadRouteText(JSON.stringify(source), id);
  loaded.set(id, route);
  return route;
}
