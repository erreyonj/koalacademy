import { describe, expect, it } from "vitest";
import { OOB_Y } from "../modules/exit-zone";
import { WORLD_H, WORLD_W, type Body } from "../modules/sim";
import { getRoute } from "../routes/registry";
import { arrive, matchDeparture } from "../routes/runtime";

const route = getRoute();
const scene = (id: string) => route.scenes.get(id)!;
const ship = (patch: Partial<Body> = {}): Body => ({
  x: 450,
  y: 800,
  vx: 0,
  vy: 0,
  restingOn: null,
  ...patch,
});
const exitIndex = (levelId: string, exitId: string) =>
  scene(levelId).level.exits.findIndex((exit) => exit.id === exitId);

function departVia(levelId: string, exitId: string, body: Body = ship()) {
  const index = exitIndex(levelId, exitId);
  const exit = scene(levelId).level.exits[index]!;
  return arrive(route, scene(levelId), { exit: index, to: exit.to ?? null }, body);
}

describe("matchDeparture", () => {
  it("fires through an upward exit only once the ship is past the frame", () => {
    const s = scene("notch1");
    const door = s.level.exits[0]!;
    const x = (door.x0 + door.x1) / 2;
    expect(matchDeparture(s, { x, y: WORLD_H - 40, vy: 400 })).toBeNull();
    const out = matchDeparture(s, { x, y: WORLD_H + OOB_Y + 1, vy: 400 });
    expect(out).toEqual({ exit: 0, to: "landing1" });
  });

  it("fires through a down exit the moment a falling hull touches the floor in the gap", () => {
    const s = scene("landing1");
    const index = exitIndex("landing1", "exit-2");
    const door = s.level.exits[index]!;
    const x = (door.x0 + door.x1) / 2;
    expect(matchDeparture(s, { x, y: 0, vy: -200 })).toEqual({ exit: index, to: "notch1" });
    // Rising into the floor (an arrival) never departs.
    expect(matchDeparture(s, { x, y: 5, vy: 900 })).toBeNull();
    // Mid-air above the gap does not either.
    expect(matchDeparture(s, { x, y: 500, vy: -200 })).toBeNull();
  });

  it("leaves a ship that rests on its start alone", () => {
    for (const level of route.levels) {
      const s = scene(level.id);
      if (s.start.y > 0 && s.start.y < WORLD_H) {
        const departure = matchDeparture(s, { x: s.start.x, y: s.start.y, vy: 0 });
        expect(departure, level.id).toBeNull();
      }
    }
  });
});

describe("arrive", () => {
  it("goes forward through an up exit to the target's Enter pose", () => {
    const result = departVia("notch1", "exit-1");
    expect(result).toMatchObject({
      kind: "enter",
      levelId: "landing1",
      fallIn: false,
      soft: false,
      forward: true,
    });
    if (result.kind !== "enter") return;
    expect(result.body).toEqual(scene("landing1").start);
  });

  it("goes forward through a right exit", () => {
    const result = departVia("stairs1", "exit-1");
    expect(result).toMatchObject({ kind: "enter", levelId: "zig1", forward: true, fallIn: false });
  });

  it("goes back through a down exit, falling in through the target's up door", () => {
    const result = departVia("landing1", "exit-2", ship({ x: 300, vx: 900, vy: -700 }));
    expect(result.kind).toBe("enter");
    if (result.kind !== "enter") return;
    const door = scene("notch1").level.exits[0]!;
    expect(result).toMatchObject({ levelId: "notch1", fallIn: true, soft: false, forward: false });
    expect(result.body.y).toBeGreaterThan(WORLD_H);
    expect(result.body.vy).toBeLessThan(0);
    expect(Math.abs(result.body.vx)).toBeLessThanOrEqual(400);
    expect(result.body.x).toBeGreaterThanOrEqual(door.x0);
    expect(result.body.x).toBeLessThanOrEqual(door.x1);
  });

  it("goes back into a level that was left through a right exit, from the right edge", () => {
    const result = departVia("zig1", "exit-1");
    expect(result.kind).toBe("enter");
    if (result.kind !== "enter") return;
    const door = scene("stairs1").level.exits.find((exit) => exit.id === "exit-1")!;
    expect(result.levelId).toBe("stairs1");
    expect(result.fallIn).toBe(true);
    expect(result.body.x).toBeGreaterThan(WORLD_W);
    expect(result.body.vx).toBeLessThan(0);
    expect(result.body.y).toBeGreaterThanOrEqual(door.y0);
    expect(result.body.y).toBeLessThanOrEqual(door.y1);
  });

  it("re-enters the same level softly through a self-loop", () => {
    const result = departVia("zig1", "exit-2");
    expect(result).toMatchObject({ kind: "enter", levelId: "zig1", soft: true });
    if (result.kind !== "enter") return;
    expect(result.body).toEqual(scene("zig1").start);
    expect(result.fallIn).toBe(false);
  });

  it("returns to the level above after coming back down to it", () => {
    const result = departVia("8thTail1", "exit-1");
    expect(result).toMatchObject({ kind: "enter", levelId: "zig1", fallIn: true });
  });

  it("ends the route when an exit has no target", () => {
    const from = scene("notch1");
    expect(arrive(route, from, { exit: 0, to: null }, ship())).toEqual({ kind: "end" });
  });

  it("reports a target that is not in the route", () => {
    const from = scene("notch1");
    const result = arrive(route, from, { exit: 0, to: "ghost" }, ship());
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.message).toMatch(/ghost/);
  });
});
