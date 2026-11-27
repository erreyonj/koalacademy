import { describe, expect, it } from "vitest";
import { parseLevelSet, serializeRoute } from "../../levels/model";
import { guideY } from "../modules/progress";
import { TONATION_CAP } from "../modules/tonation";
import { eventLevelIds, eventsFor } from "../routes/events";
import {
  DEFAULT_ROUTE_ID,
  ROUTE_IDS,
  getRoute,
  loadRouteText,
} from "../routes/registry";
import { buildLevelScene } from "../routes/scene";
import { massesFor } from "../modules/terrain";
import { ledgesFor, regionById, svgViewFor } from "../modules/sim";
import { playBlocker } from "../../levels/playtest/runtime";

describe("route registry", () => {
  it("ships the tutorial route with its origin", () => {
    expect(ROUTE_IDS).toContain(DEFAULT_ROUTE_ID);
    const route = getRoute();
    expect(route.id).toBe("notch1");
    expect(route.origin).toBe("landing1");
    expect(route.levels.map((level) => level.id)).toEqual([
      "notch1",
      "landing1",
      "stairs1",
      "zig1",
      "8thTail1",
    ]);
    expect(getRoute()).toBe(route);
  });

  it("rejects an unknown route id", () => {
    expect(() => getRoute("nope")).toThrow(/Unknown route/);
  });

  it("builds a scene for every level, registered under the level id", () => {
    const route = getRoute();
    for (const level of route.levels) {
      const scene = route.scenes.get(level.id)!;
      expect(scene.level).toBe(level);
      expect(ledgesFor(level.id)).toBe(scene.ledges);
      expect(massesFor(level.id)).toBe(scene.masses);
      expect(svgViewFor(level.id)).toEqual(scene.size);
      expect(regionById(level.id).id).toBe(level.id);
      expect(scene.openings).toHaveLength(level.exits.length);
    }
  });

  it("plays landscape levels in the landscape frame", () => {
    const route = getRoute();
    expect(route.scenes.get("zig1")!.view).toBe("landscape");
    expect(route.scenes.get("zig1")!.size.w).toBeGreaterThan(route.scenes.get("zig1")!.size.h);
    expect(route.scenes.get("notch1")!.size.h).toBeGreaterThan(route.scenes.get("notch1")!.size.w);
  });

  it("only ships levels the editor playtest also accepts", () => {
    for (const level of getRoute().levels) {
      expect(playBlocker(level), level.id).toBeNull();
    }
  });

  it("resolves every door to a level in the route", () => {
    const route = getRoute();
    const ids = new Set(route.levels.map((level) => level.id));
    expect(ids.has(route.origin)).toBe(true);
    for (const level of route.levels) {
      expect(level.exits.length, level.id).toBeGreaterThan(0);
      for (const exit of level.exits) {
        if (exit.to) expect(ids.has(exit.to), `${level.id} -> ${exit.to}`).toBe(true);
      }
    }
  });

  it("rejects a route whose door leads nowhere", () => {
    const broken = getRoute().levels.map((level, index) =>
      index === 0
        ? { ...level, exits: level.exits.map((exit) => ({ ...exit, to: "missing" })) }
        : level,
    );
    expect(() => loadRouteText(serializeRoute(broken, "notch1", "x"))).toThrow(/missing/);
  });

  it("rejects a route whose origin is not a level", () => {
    const file = { version: 1, id: "x", origin: "ghost", levels: getRoute().levels };
    expect(() => loadRouteText(JSON.stringify(file))).toThrow(/ghost/);
  });

  it("round-trips the origin through the route file", () => {
    const route = getRoute();
    const text = serializeRoute([...route.levels], "stairs1", "copy");
    const parsed = parseLevelSet(text);
    expect(parsed.ok && parsed.origin).toBe("stairs1");
    expect(parsed.ok && parsed.routeId).toBe("copy");
    const copy = loadRouteText(text);
    expect(copy.origin).toBe("stairs1");
    expect(copy.id).toBe("copy");
    // Put the shipped levels back under the default route.
    getRoute();
  });

  it("falls back to the first level when a bare level list has no origin", () => {
    const route = getRoute();
    const bare = loadRouteText(JSON.stringify(route.levels), "bare");
    expect(bare.origin).toBe(route.levels[0]!.id);
    expect(bare.id).toBe("bare");
  });

  it("buildLevelScene explains a level it cannot play", () => {
    const level = { ...getRoute().levels[0]!, exits: [] };
    expect(() => buildLevelScene(level)).toThrow(/no exit/);
  });
});

describe("events table", () => {
  const route = getRoute();
  const levelIds = new Set(route.levels.map((level) => level.id));

  it("only mentions levels that are in the route", () => {
    for (const id of eventLevelIds(route.id)) expect(levelIds.has(id), id).toBe(true);
  });

  it("returns an empty set for unknown routes and levels", () => {
    expect(eventsFor(route.id, "nowhere")).toEqual({});
    expect(eventsFor("other", "notch1")).toEqual({});
  });

  it("matches every Tonation interval to its level's gem pitches", () => {
    let payout = 0;
    for (const level of route.levels) {
      const challenge = eventsFor(route.id, level.id).tonation;
      if (!challenge) continue;
      payout += challenge.payout;
      const gems = level.borealis.map((spot) => spot.pitch).sort();
      expect([...challenge.pitches].sort()).toEqual(gems);
    }
    expect(payout).toBe(TONATION_CAP);
  });

  it("places the Note-Tail in the frame, on the last level only", () => {
    const withTail = route.levels.filter((level) => eventsFor(route.id, level.id).noteTail);
    expect(withTail.map((level) => level.id)).toEqual(["8thTail1"]);
    const tail = eventsFor(route.id, "8thTail1").noteTail!;
    expect(tail.x).toBeGreaterThan(0);
    expect(tail.x).toBeLessThan(900);
    expect(tail.y).toBeGreaterThan(0);
    expect(tail.y).toBeLessThan(1600);
  });

  it("opens on landing1 with the slingshot lesson", () => {
    expect(route.origin).toBe("landing1");
    const events = eventsFor(route.id, route.origin);
    expect(events.enter).toEqual(["launch-enter"]);
    expect(events.slingshot).toMatchObject({ goal: "G4", miss: "launch-guide-miss" });
    // No other level runs the lesson, and the origin has no Borealis to gather.
    for (const level of route.levels) {
      if (level.id !== route.origin) expect(eventsFor(route.id, level.id).slingshot).toBeUndefined();
    }
    expect(route.scenes.get(route.origin)!.borealis).toEqual([]);
  });

  it("breaks the band out the floor gap into the crash level", () => {
    const scene = route.scenes.get(route.origin)!;
    const down = scene.level.exits.filter((exit) => exit.facing === "down");
    expect(down.map((exit) => exit.to)).toContain("notch1");
    const band = scene.ledges.find((ledge) => ledge.kind === "band")!;
    // The lesson's band sits over the gap that leads to the crash level.
    const gap = down.find((exit) => exit.to === "notch1")!;
    expect((band.x0 + band.x1) / 2).toBeGreaterThan(gap.x0);
    expect((band.x0 + band.x1) / 2).toBeLessThan(gap.x1);
    // The guide fits inside the frame.
    expect(guideY(band, eventsFor(route.id, route.origin).slingshot!.goal)).toBeLessThan(1600);
  });

  it("teaches the Anachrometer on the crash level", () => {
    const events = eventsFor(route.id, "notch1");
    expect(events.grant?.anachrometer).toBe(true);
    expect(events.riseGate?.y).toBeGreaterThan(0);
    expect(events.enter).toEqual(["notch-calibrate-enter"]);
  });
});
