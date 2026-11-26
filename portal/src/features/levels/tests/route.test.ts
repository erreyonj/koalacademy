import { describe, expect, it } from "vitest";
import {
  addBand,
  addBorealis,
  addExit,
  createLevel,
  parseLevelSet,
  patchExit,
  routeFileName,
  serializeLevel,
  serializeRoute,
  setEnter,
  validateLevel,
  validateRoute,
} from "../model";
import { arrive, buildRouteScenes, enterLevel } from "../playtest/route";
import {
  advance,
  buildScene,
  createState,
  type PlaytestScene,
  type PlaytestState,
} from "../playtest/runtime";
import { handleKey } from "../tools";
import { createEditorStore, exitDestination, originIndexOf, retarget } from "../store";
import type { ExitOpening, LevelFile } from "../types";
import { WORLD_H, WORLD_W } from "../../notehead/modules/sim";

const up = (id: string, to?: string): ExitOpening => ({
  id,
  facing: "up",
  x0: 300,
  x1: 600,
  y0: 1600,
  y1: 1600,
  ...(to ? { to } : {}),
});
const down = (id: string, to?: string): ExitOpening => ({
  id,
  facing: "down",
  x0: 100,
  x1: 800,
  y0: 0,
  y1: 0,
  ...(to ? { to } : {}),
});
const right = (id: string, to?: string): ExitOpening => ({
  id,
  facing: "right",
  x0: 900,
  x1: 900,
  y0: 900,
  y1: 1500,
  ...(to ? { to } : {}),
});

/** A level with a catching band, a hovering enter point and the given exits. */
function make(id: string, exits: ExitOpening[], gems = 0): LevelFile {
  let lv = createLevel(id, "portrait");
  lv = addBand(lv, { id: "band-1", x0: 300, x1: 600, y: 500, kind: "band" });
  for (let i = 0; i < gems; i++) {
    lv = addBorealis(lv, { id: `gem-${i + 1}`, x: 450, y: 700 + i * 50, pitch: "E4" });
  }
  lv = setEnter(lv, { x: 450, y: 800, vx: 0, vy: 0 });
  for (const exit of exits) lv = addExit(lv, exit);
  return lv;
}

function scene(lv: LevelFile): PlaytestScene {
  const built = buildScene(lv);
  if (!built) throw new Error("should build");
  return built;
}

const at = (s: PlaytestScene, body: Partial<PlaytestState["body"]>): PlaytestState => {
  const state = createState(s);
  return { ...state, body: { ...state.body, ...body } };
};

describe("exit targets in the level file", () => {
  it("accepts a target and keeps it through serialization", () => {
    const lv = make("a", [up("exit-1", "b")]);
    expect(validateLevel(lv)).toEqual([]);
    const parsed = parseLevelSet(serializeLevel(lv));
    expect(parsed.ok && parsed.levels[0]!.exits[0]!.to).toBe("b");
  });

  it("rejects an empty target and drops an undefined one", () => {
    const bad = make("a", [{ ...up("exit-1"), to: " " }]);
    expect(validateLevel(bad).join("\n")).toMatch(/to must be a non-empty level id/);
    const lv = patchExit(make("a", [up("exit-1", "b")]), "exit-1", { to: undefined });
    expect(JSON.parse(serializeLevel(lv)).exits[0]).not.toHaveProperty("to");
  });
});

describe("parseLevelSet", () => {
  const a = make("a", []);
  const b = make("b", []);

  it("reads one level or an array of levels", () => {
    const one = parseLevelSet(serializeLevel(a));
    expect(one.ok && one.levels.map((l) => l.id)).toEqual(["a"]);
    const many = parseLevelSet(serializeRoute([a, b]));
    expect(many.ok && many.levels.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("reports the index of a bad level and refuses an empty array", () => {
    const text = JSON.stringify([JSON.parse(serializeLevel(a)), { version: 2 }]);
    const bad = parseLevelSet(text);
    expect(!bad.ok && bad.errors[0]).toMatch(/^levels\[1\]: /);
    expect(parseLevelSet("[]")).toEqual({ ok: false, errors: ["the array has no levels"] });
    expect(parseLevelSet("nope")).toEqual({ ok: false, errors: ["file is not valid JSON"] });
  });
});

describe("validateRoute", () => {
  it("errors on duplicate ids and warns about missing targets", () => {
    expect(validateRoute([make("a", []), make("a", [])]).errors).toEqual(['duplicate level id "a"']);
    const check = validateRoute([make("a", [up("exit-1", "ghost")]), make("b", [])]);
    expect(check.errors).toEqual([]);
    expect(check.warnings).toEqual(['a exit-1: goes to "ghost", which is not in the route']);
  });

  it("names the route file after the first level", () => {
    expect(routeFileName([make("Zig 1", []), make("b", [])])).toBe("zig-1.route.json");
  });
});

describe("route in the editor store", () => {
  const route = () => [make("a", [up("exit-1", "b")]), make("b", [down("exit-1", "a")]), make("c", [])];

  it("loads a route, opens the first level and clears history", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    const s = store.getState();
    expect(s.library.map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(s.activeIndex).toBe(0);
    expect(s.level).toBe(s.library[0]);
    expect(s.past).toEqual([]);
  });

  it("refuses a route with duplicate ids or no levels", () => {
    const store = createEditorStore();
    const before = store.getState();
    store.dispatch({ type: "loadRoute", levels: [make("a", []), make("a", [])] });
    store.dispatch({ type: "loadRoute", levels: [] });
    expect(store.getState()).toBe(before);
  });

  it("keeps the library in step with edits, undo and redo", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({ type: "selectLevel", index: 1 });
    const edited = addBand(store.getState().level, { id: "band-2", x0: 0, x1: 50, y: 100, kind: "band" });
    store.dispatch({ type: "edit", level: edited });
    expect(store.getState().library[1]!.bands).toHaveLength(2);
    store.dispatch({ type: "undo" });
    expect(store.getState().library[1]!.bands).toHaveLength(1);
    store.dispatch({ type: "redo" });
    expect(store.getState().library[1]).toBe(store.getState().level);
  });

  it("selects a level and gives each its own history", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({
      type: "edit",
      level: addBand(store.getState().level, { id: "band-2", x0: 0, x1: 50, y: 100, kind: "band" }),
    });
    expect(store.getState().past).toHaveLength(1);
    store.dispatch({ type: "selectLevel", index: 2 });
    expect(store.getState().level.id).toBe("c");
    expect(store.getState().past).toEqual([]);
    expect(store.getState().library[0]!.bands).toHaveLength(2);
    store.dispatch({ type: "selectLevel", index: 9 });
    expect(store.getState().activeIndex).toBe(2);
  });

  it("moves levels and keeps the open one open", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({ type: "selectLevel", index: 1 });
    store.dispatch({ type: "moveLevel", from: 0, to: 2 });
    const s = store.getState();
    expect(s.library.map((l) => l.id)).toEqual(["b", "c", "a"]);
    expect(s.level.id).toBe("b");
    expect(s.activeIndex).toBe(0);
    store.dispatch({ type: "moveLevel", from: 0, to: 5 });
    expect(store.getState().library.map((l) => l.id)).toEqual(["b", "c", "a"]);
  });

  it("adds a blank level with a fresh id and selects it", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({ type: "addLevel" });
    store.dispatch({ type: "addLevel" });
    const s = store.getState();
    expect(s.library).toHaveLength(5);
    expect(new Set(s.library.map((l) => l.id)).size).toBe(5);
    expect(s.activeIndex).toBe(4);
    expect(s.level).toBe(s.library[4]);
  });

  it("removes levels but never the last one, and tracks the active index", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({ type: "selectLevel", index: 2 });
    store.dispatch({ type: "removeLevel", index: 0 });
    expect(store.getState().library.map((l) => l.id)).toEqual(["b", "c"]);
    expect(store.getState().level.id).toBe("c");
    store.dispatch({ type: "removeLevel", index: 1 });
    expect(store.getState().level.id).toBe("b");
    store.dispatch({ type: "removeLevel", index: 0 });
    expect(store.getState().library).toHaveLength(1);
  });

  it("renaming a level retargets exits that led to it, and undo restores them", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({ type: "edit", level: { ...store.getState().level, id: "start" } });
    let s = store.getState();
    expect(s.library.map((l) => l.id)).toEqual(["start", "b", "c"]);
    expect(s.library[1]!.exits[0]!.to).toBe("start");
    expect(s.library[0]!.exits[0]!.to).toBe("b");
    store.dispatch({ type: "undo" });
    s = store.getState();
    expect(s.library[0]!.id).toBe("a");
    expect(s.library[1]!.exits[0]!.to).toBe("a");
  });

  it("retarget leaves unrelated exits alone", () => {
    const lv = make("x", [up("exit-1", "b"), down("exit-2", "c")]);
    expect(retarget(lv, "z", "y")).toBe(lv);
    expect(retarget(lv, "b", "y").exits.map((e) => e.to)).toEqual(["y", "c"]);
  });

  it("freezes route changes while playing", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: [make("a", [up("exit-1")]), make("b", [])] });
    store.dispatch({ type: "play", on: true });
    expect(store.getState().playing).toBe(true);
    const before = store.getState();
    store.dispatch({ type: "selectLevel", index: 1 });
    store.dispatch({ type: "moveLevel", from: 0, to: 1 });
    store.dispatch({ type: "addLevel" });
    store.dispatch({ type: "removeLevel", index: 0 });
    expect(store.getState()).toBe(before);
  });
});

describe("travelling a route", () => {
  const a = make("a", [up("exit-1", "b")], 1);
  const b = make("b", [down("exit-1", "a"), right("exit-2", "c")]);
  const c = make("c", [down("exit-1", "b"), up("exit-2")]);
  const levels = [a, b, c];
  const scenes = buildRouteScenes(levels);

  it("builds a scene per level with doors for exits that have a target", () => {
    expect(scenes.get("a")!.doors).toEqual([{ to: "b", facing: "up" }]);
    expect(scenes.get("b")!.doors).toEqual([
      { to: "a", facing: "down" },
      { to: "c", facing: "right" },
    ]);
    expect(scenes.get("c")!.doors[1]).toBeNull();
  });

  it("an up door departs even with Borealis left", () => {
    const s = scene(a);
    const next = advance(s, at(s, { x: 450, y: WORLD_H + 300, vx: 0, vy: 300 }));
    expect(next.collected).toBe(0);
    expect(next.departed).toEqual({ exit: 0, to: "b" });
    expect(next.cleared).toBe(false);
    expect(next.resets).toBe(0);
    // A departed run no longer simulates.
    expect(advance(s, next)).toBe(next);
  });

  it("a right door departs even with Borealis left", () => {
    const lv = make("r", [right("exit-1", "z")], 2);
    const s = scene(lv);
    const next = advance(s, at(s, { x: WORLD_W + 200, y: 1200, vx: 300, vy: 0 }));
    expect(next.departed).toEqual({ exit: 0, to: "z" });
    expect(next.notice).toBeNull();
  });

  it("a dead end with Borealis left still resets the run", () => {
    const s = scene(make("d", [up("exit-1")], 1));
    const next = advance(s, at(s, { x: 450, y: WORLD_H + 300, vx: 0, vy: 300 }));
    expect(next.departed).toBeNull();
    expect(next.cleared).toBe(false);
    expect(next.notice).toBe("Left early. Collect every Borealis first.");
    expect(next.resets).toBe(1);
  });

  it("a down door is a free way back even with Borealis left", () => {
    const s = scene(make("a", [down("exit-1", "z")], 2));
    const next = advance(s, at(s, { x: 450, y: -300, vx: 0, vy: -200 }));
    expect(next.departed).toEqual({ exit: 0, to: "z" });
  });

  it("an exit without a target still clears the level", () => {
    const s = scene(c);
    const next = advance(s, at(s, { x: 450, y: WORLD_H + 300, vx: 0, vy: 300 }));
    expect(next.cleared).toBe(true);
    expect(next.departed).toBeNull();
  });

  it("forward travel lands on the target's Enter point and keeps the counters", () => {
    const s = scenes.get("a")!;
    const left = { ...at(s, { x: 450, y: WORLD_H + 300, vx: 0, vy: 300 }), collected: 1 };
    const gone = advance(s, left);
    const arrival = arrive(levels, scenes, a, gone.departed!, gone.body);
    if ("error" in arrival) throw new Error(arrival.error);
    expect(arrival.index).toBe(1);
    expect(arrival.body).toEqual(scenes.get("b")!.start);
    const entered = enterLevel(
      arrival.scene,
      { hardHits: 2, shots: 5, resets: 1, clock: 9 },
      arrival.body,
      "Entered b",
    );
    expect(entered).toMatchObject({ hardHits: 2, shots: 5, resets: 1, clock: 9, notice: "Entered b" });
    expect(entered.departed).toBeNull();
    expect(entered.total).toBe(0);
  });

  it("going back through a down door re-enters through the matching up door", () => {
    const ship = { x: 120, y: -300, vx: 30, vy: -900, restingOn: null };
    const arrival = arrive(levels, scenes, b, { exit: 0, to: "a" }, ship);
    if ("error" in arrival) throw new Error(arrival.error);
    expect(arrival.index).toBe(0);
    // x is pulled inside a's 300..600 gap, and the ship comes in falling.
    expect(arrival.body.x).toBeGreaterThan(300);
    expect(arrival.body.x).toBeLessThan(600);
    expect(arrival.body.y).toBeGreaterThan(WORLD_H);
    expect(arrival.body.vy).toBeLessThan(0);
    expect(arrival.body.vy).toBeGreaterThanOrEqual(-400);
    // ...and it stays in the level: it falls onto the band instead of leaving.
    const target = arrival.scene;
    let state = enterLevel(target, createState(target), arrival.body);
    for (let i = 0; i < 1500 && !state.body.restingOn; i++) state = advance(target, state);
    expect(state.body.restingOn).toBe("band-1");
    expect(state.resets).toBe(0);
  });

  it("going back through a right door comes in from the right edge, moving left", () => {
    const ship = { x: 450, y: -300, vx: 0, vy: -500, restingOn: null };
    const arrival = arrive(levels, scenes, c, { exit: 0, to: "b" }, ship);
    if ("error" in arrival) throw new Error(arrival.error);
    expect(arrival.index).toBe(1);
    expect(arrival.body.x).toBeGreaterThan(WORLD_W);
    expect(arrival.body.y).toBeGreaterThanOrEqual(900);
    expect(arrival.body.y).toBeLessThanOrEqual(1500);
    expect(arrival.body.vx).toBeLessThan(0);
    const target = arrival.scene;
    let state = enterLevel(target, createState(target), arrival.body);
    for (let i = 0; i < 20; i++) state = advance(target, state);
    expect(state.notice).toBeNull();
    expect(state.body.x).toBeLessThan(arrival.body.x);
  });

  it("falls back to the Enter point when the target has no door back", () => {
    const lonely = [make("p", [down("exit-1", "q")]), make("q", [up("exit-1")])];
    const lonelyScenes = buildRouteScenes(lonely);
    const arrival = arrive(lonely, lonelyScenes, lonely[0]!, { exit: 0, to: "q" }, {
      x: 450,
      y: -300,
      vx: 0,
      vy: -100,
      restingOn: null,
    });
    if ("error" in arrival) throw new Error(arrival.error);
    expect(arrival.body).toEqual(lonelyScenes.get("q")!.start);
  });

  it("reports a target that is missing or cannot be played", () => {
    const ship = { x: 0, y: 0, vx: 0, vy: 0, restingOn: null };
    const missing = arrive(levels, scenes, a, { exit: 0, to: "ghost" }, ship);
    expect(missing).toEqual({ error: 'This exit leads to "ghost", which is not in the route.' });
    const noEnter = { ...make("d", []), enter: undefined } as unknown as LevelFile;
    const withBroken = [a, noEnter];
    const broken = arrive(withBroken, buildRouteScenes(withBroken), a, { exit: 0, to: "d" }, ship);
    expect("error" in broken && broken.error).toMatch(/"d" cannot be played yet/);
  });

  it("flies a whole trip: land, collect, leave through the door, arrive in the next level", () => {
    const s = scenes.get("a")!;
    // Drop the ship onto the band, collect, then give it a push out the top door.
    let state = createState(s);
    for (let i = 0; i < 1500 && !state.body.restingOn; i++) state = advance(s, state);
    expect(state.body.restingOn).toBe("band-1");
    state = { ...state, collected: 1, body: { ...state.body, restingOn: null, vy: 4000, vx: 0 } };
    for (let i = 0; i < 1500 && !state.departed && !state.notice; i++) state = advance(s, state);
    expect(state.departed).toEqual({ exit: 0, to: "b" });
    const arrival = arrive(levels, scenes, a, state.departed!, state.body);
    expect("error" in arrival).toBe(false);
  });
});

describe("route origin", () => {
  const route = () => [make("a", [up("exit-1", "b")]), make("b", [down("exit-1", "a")]), make("c", [])];
  const key = (k: string, extra: Record<string, boolean> = {}) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...extra,
  });

  it("the origin is the first level until one is set, even out of order", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({ type: "selectLevel", index: 1 });
    expect(originIndexOf(store.getState())).toBe(0);
    store.dispatch({ type: "setOrigin", id: "c" });
    expect(originIndexOf(store.getState())).toBe(2);
    store.dispatch({ type: "setOrigin", id: null });
    expect(originIndexOf(store.getState())).toBe(0);
  });

  it("ignores an origin that is not in the route", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    const before = store.getState();
    store.dispatch({ type: "setOrigin", id: "ghost" });
    expect(store.getState()).toBe(before);
  });

  it("follows a rename, clears on removal and on a new import, and is frozen in play", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: route() });
    store.dispatch({ type: "setOrigin", id: "a" });
    store.dispatch({ type: "edit", level: { ...store.getState().level, id: "start" } });
    expect(store.getState().originId).toBe("start");
    store.dispatch({ type: "undo" });
    expect(store.getState().originId).toBe("a");
    store.dispatch({ type: "removeLevel", index: 0 });
    expect(store.getState().originId).toBeNull();
    store.dispatch({ type: "setOrigin", id: "c" });
    store.dispatch({ type: "loadRoute", levels: route() });
    expect(store.getState().originId).toBeNull();
  });

  it("P plays the open level; Shift+P plays from the origin", () => {
    const store = createEditorStore();
    store.dispatch({
      type: "loadRoute",
      levels: [make("a", [up("exit-1", "b")]), make("b", [up("exit-1", "c")]), make("c", [up("exit-1")])],
    });
    store.dispatch({ type: "setOrigin", id: "c" });
    store.dispatch({ type: "selectLevel", index: 1 });

    expect(handleKey(store, { tolerance: 3 }, key("p"))).toBe(true);
    expect(store.getState().playing).toBe(true);
    expect(store.getState().playFrom).toBe(1);
    expect(handleKey(store, { tolerance: 3 }, key("p"))).toBe(true);
    expect(store.getState().playing).toBe(false);

    expect(handleKey(store, { tolerance: 3 }, key("P", { shiftKey: true }))).toBe(true);
    expect(store.getState().playing).toBe(true);
    expect(store.getState().playFrom).toBe(2);
    // Shift+P again leaves play, like P.
    handleKey(store, { tolerance: 3 }, key("P", { shiftKey: true }));
    expect(store.getState().playing).toBe(false);
    expect(store.getState().originId).toBe("c");
  });

  it("Shift+P without an origin plays from the first level", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: [make("a", [up("exit-1", "b")]), make("b", [up("exit-1")])] });
    store.dispatch({ type: "selectLevel", index: 1 });
    handleKey(store, { tolerance: 3 }, key("P", { shiftKey: true }));
    expect(store.getState().playFrom).toBe(0);
  });

  it("does not start when the level it would start on cannot be played", () => {
    const store = createEditorStore();
    store.dispatch({ type: "loadRoute", levels: [createLevel("empty"), make("b", [up("exit-1")])] });
    store.dispatch({ type: "selectLevel", index: 1 });
    handleKey(store, { tolerance: 3 }, key("P", { shiftKey: true }));
    expect(store.getState().playing).toBe(false);
    handleKey(store, { tolerance: 3 }, key("p"));
    expect(store.getState().playing).toBe(true);
  });
});

describe("exitDestination", () => {
  const levels = [
    make("a", [up("exit-1", "b"), down("exit-2", "ghost"), right("exit-3")]),
    make("b", [down("exit-1", "a")]),
  ];
  const state = { level: levels[0]!, library: levels };

  it("follows the exit that faces the arrow", () => {
    expect(exitDestination(state, "up")).toEqual({ index: 1 });
  });

  it("says when there is no exit that way", () => {
    expect(exitDestination(state, "left")).toEqual({ error: "No left exit" });
    expect(exitDestination({ level: levels[1]!, library: levels }, "right")).toEqual({
      error: "No right exit",
    });
  });

  it("explains an exit with no usable target", () => {
    expect(exitDestination(state, "right")).toEqual({ error: "The right exit has no target level" });
    expect(exitDestination(state, "down")).toEqual({
      error: 'The down exit leads to "ghost", which is not in the route',
    });
  });

  it("picks the first usable exit when several face the same way", () => {
    const two = make("z", [down("exit-1", "ghost"), down("exit-2", "b")]);
    expect(exitDestination({ level: two, library: [two, levels[1]!] }, "down")).toEqual({ index: 1 });
  });
});
