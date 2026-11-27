import type { LevelEvents, RouteEvents } from "./types";
import { TUTORIAL_EVENTS } from "./tutorial";

export type { LevelEvents, RouteEvents, Slingshot } from "./types";

const BY_ROUTE: Record<string, RouteEvents> = {
  [TUTORIAL_EVENTS.routeId]: TUTORIAL_EVENTS,
};

const NONE: LevelEvents = {};

/** The special events for one level of a route. Empty when it has none. */
export function eventsFor(routeId: string, levelId: string): LevelEvents {
  return BY_ROUTE[routeId]?.levels[levelId] ?? NONE;
}

/** Every level id a route's events table mentions (for consistency checks). */
export function eventLevelIds(routeId: string): string[] {
  return Object.keys(BY_ROUTE[routeId]?.levels ?? {});
}
