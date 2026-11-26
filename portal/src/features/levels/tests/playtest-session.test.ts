import { describe, expect, it } from "vitest";
import {
  addBand,
  addBorealis,
  addExit,
  addTerrain,
  createLevel,
  hashSeed,
  setEnter,
} from "../model";
import { cursorAction, gemAt } from "../playtest/cursor";
import {
  advance,
  buildScene,
  canEngageWarp,
  cancelWarp,
  chartShot,
  createState,
  engageWarpState,
  fire,
  resetState,
  syncExtras,
  tickBorealis,
  withExtras,
  type PlaytestScene,
  type PlaytestState,
} from "../playtest/runtime";
import { fromView, toView } from "../geometry";
import { HULL_MAX, TONATION_CAP, createEditorStore } from "../store";
import {
  WARP_BAND_ID,
  WARP_HALF,
} from "../../notehead/modules/anachrometer";
import type { BorealisSpot, LevelFile } from "../types";

function level(gems: { id: string; x: number; y: number }[] = []): LevelFile {
  let lv = createLevel("session", "portrait");
  lv = addTerrain(lv, {
    id: "terrain-1",
    closed: false,
    tickSeed: hashSeed("terrain-1"),
    points: [
      { x: 0, y: 150 },
      { x: 900, y: 150 },
    ],
  });
  lv = addBand(lv, { id: "band-1", x0: 300, x1: 600, y: 500, kind: "band" });
  for (const gem of gems) lv = addBorealis(lv, { ...gem, pitch: "E4" });
  lv = setEnter(lv, { x: 450, y: 800, vx: 0, vy: 0 });
  return addExit(lv, { id: "exit-1", facing: "up", x0: 300, x1: 600, y0: 1600, y1: 1600 });
}

function sceneOf(lv: LevelFile): PlaytestScene {
  const scene = buildScene(lv);
  if (!scene) throw new Error("level should be playable");
  return scene;
}

function run(
  scene: PlaytestScene,
  from: PlaytestState,
  done: (s: PlaytestState) => boolean,
  cap = 1200,
): PlaytestState {
  let state = from;
  for (let i = 0; i < cap && !done(state); i++) state = advance(scene, state);
  return state;
}

/** A few frames into the fall, so the ship is airborne above the band. */
function airborne(scene: PlaytestScene): PlaytestState {
  let state = createState(scene);
  for (let i = 0; i < 10; i++) state = advance(scene, state);
  expect(state.body.restingOn).toBeNull();
  return state;
}

describe("anachrometer warp", () => {
  it("only opens in flight, with the toggle on, and not twice", () => {
    const scene = sceneOf(level());
    const flying = airborne(scene);
    expect(canEngageWarp(flying, true)).toBe(true);
    expect(canEngageWarp(flying, false)).toBe(false);
    expect(engageWarpState(flying, false)).toBe(flying);

    const seated = run(scene, flying, (s) => s.body.restingOn === "band-1");
    expect(canEngageWarp(seated, true)).toBe(false);
    expect(engageWarpState(seated, true)).toBe(seated);

    const warping = engageWarpState(flying, true);
    expect(canEngageWarp(warping, true)).toBe(false);
    expect(canEngageWarp({ ...flying, cleared: true }, true)).toBe(false);
  });

  it("holds a band under the ship without stopping it", () => {
    const scene = sceneOf(level());
    const flying = airborne(scene);
    const warping = engageWarpState(flying, true);
    expect(warping.warp?.id).toBe(WARP_BAND_ID);
    expect(warping.body).toEqual(flying.body);

    const next = advance(scene, warping);
    // The band is a cue, not a surface: the ship keeps falling through it.
    expect(next.body.vy).toBeLessThan(flying.body.vy);
    expect(next.body.restingOn).toBeNull();
    expect(next.warp).not.toBeNull();
    expect(next.warp!.x0).toBeCloseTo(next.body.x - WARP_HALF);
    expect(next.warp!.x1).toBeCloseTo(next.body.x + WARP_HALF);
  });

  it("drops the warp when a real surface catches the ship", () => {
    const scene = sceneOf(level());
    const warping = engageWarpState(airborne(scene), true);
    const landed = run(scene, warping, (s) => s.body.restingOn !== null);
    expect(landed.body.restingOn).toBe("band-1");
    expect(landed.warp).toBeNull();
  });

  it("launches from the warp band, keeping the position", () => {
    const scene = sceneOf(level());
    const warping = engageWarpState(airborne(scene), true);
    const fired = fire(scene, warping, { x: 120, y: -260 });
    expect(fired.warp).toBeNull();
    expect(fired.shots).toBe(1);
    expect(fired.body.x).toBe(warping.body.x);
    expect(fired.body.y).toBe(warping.body.y);
    expect(fired.body.vy).toBeGreaterThan(0);
    // A slingshot: pulling right and down launches left and up.
    expect(fired.body.vx).toBeLessThan(0);
  });

  it("a tiny pull lets go without a shot", () => {
    const scene = sceneOf(level());
    const warping = engageWarpState(airborne(scene), true);
    const let_go = fire(scene, warping, { x: 1, y: -1 });
    expect(let_go.warp).toBeNull();
    expect(let_go.shots).toBe(0);
    expect(let_go.body).toEqual(warping.body);
    expect(cancelWarp(let_go)).toBe(let_go);
  });

  it("charts from the warp band, and nothing without a seat", () => {
    const scene = sceneOf(level());
    const warping = engageWarpState(airborne(scene), true);
    expect(chartShot(scene, warping.body, { x: 0, y: -300 }).points).toEqual([]);
    const chart = chartShot(scene, warping.body, { x: 0, y: -300 }, WARP_BAND_ID);
    expect(chart.points.length).toBeGreaterThan(4);
    expect(chart.apex!.y).toBeGreaterThan(warping.body.y);
  });

  it("collects Borealis in real time while the ship is slowed", () => {
    const scene = sceneOf(level([{ id: "gem-1", x: 450, y: 800 }]));
    const start = createState(scene);
    // The slowed step leaves Borealis alone ...
    const slowed = advance(scene, start, { gems: false });
    expect(slowed.collected).toBe(0);
    // ... the real-time tick gathers it.
    const ticked = tickBorealis(slowed, 1 / 60);
    expect(ticked.collected).toBe(1);
    expect(ticked.borealis[0]!.collected).toBe(true);
    expect(tickBorealis({ ...ticked, cleared: true }, 1 / 60).collected).toBe(1);
  });
});

describe("added Borealis in the running flight", () => {
  const extra = (id: string, x: number, y: number): BorealisSpot => ({ id, x, y, pitch: "G4" });

  it("withExtras folds them into the scene so resets keep them", () => {
    const scene = sceneOf(level([{ id: "gem-1", x: 450, y: 650 }]));
    expect(withExtras(scene, [])).toBe(scene);
    const full = withExtras(scene, [extra("pt-gem-1", 100, 700)]);
    expect(full.borealis.map((g) => g.id)).toEqual(["gem-1", "pt-gem-1"]);
    expect(scene.borealis).toHaveLength(1);

    const reset = resetState(full, createState(full));
    expect(reset.total).toBe(2);
  });

  it("adds, moves and removes them without touching the ship", () => {
    const scene = sceneOf(level([{ id: "gem-1", x: 450, y: 650 }]));
    const state = airborne(scene);

    const added = syncExtras(state, [extra("pt-gem-1", 100, 700)]);
    expect(added.total).toBe(2);
    expect(added.body).toBe(state.body);
    expect(added.borealis.find((g) => g.id === "pt-gem-1")?.collected).toBe(false);

    const moved = syncExtras(added, [{ ...extra("pt-gem-1", 120, 720), pitch: "A4" }]);
    const gem = moved.borealis.find((g) => g.id === "pt-gem-1")!;
    expect([gem.x, gem.y, gem.homeX, gem.pitch]).toEqual([120, 720, 120, "A4"]);

    const removed = syncExtras(moved, []);
    expect(removed.borealis.map((g) => g.id)).toEqual(["gem-1"]);
    expect(removed.total).toBe(1);
  });

  it("keeps collected ones collected and never touches the level's own", () => {
    const scene = sceneOf(level([{ id: "gem-1", x: 450, y: 800 }]));
    const collectedOwn = tickBorealis(createState(scene), 1 / 60);
    expect(collectedOwn.collected).toBe(1);

    const withGem = syncExtras(collectedOwn, [extra("pt-gem-1", 450, 800)]);
    const gathered = tickBorealis(withGem, 1 / 60);
    expect(gathered.collected).toBe(2);
    const moved = syncExtras(gathered, [extra("pt-gem-1", 10, 10)]);
    expect(moved.borealis.find((g) => g.id === "pt-gem-1")!.x).toBe(450);
    expect(moved.collected).toBe(2);

    // Removing a collected extra drops it from the count.
    const removed = syncExtras(moved, []);
    expect(removed.collected).toBe(1);
    expect(removed.total).toBe(1);
  });

  it("returns the same state when nothing changed", () => {
    const scene = sceneOf(level());
    const state = syncExtras(createState(scene), [extra("pt-gem-1", 100, 700)]);
    expect(syncExtras(state, [extra("pt-gem-1", 100, 700)])).toBe(state);
    expect(syncExtras(createState(scene), [])).toBeDefined();
  });
});

describe("play session in the store", () => {
  function playing() {
    const store = createEditorStore(level());
    store.dispatch({ type: "play", on: true });
    expect(store.getState().playing).toBe(true);
    return store;
  }

  it("starts from defaults: anachrometer off, full hull, no tonation", () => {
    const { play } = playing().getState();
    expect(play).toEqual({
      anachrometer: false,
      hull: HULL_MAX,
      tonation: 0,
      borealisTool: false,
      gemPitch: "C4",
      extraBorealis: [],
      selectedGem: null,
    });
    expect(HULL_MAX).toBe(10);
  });

  it("accepts session changes while playing, and keeps the level frozen", () => {
    const store = playing();
    const before = store.getState().level;
    store.dispatch({ type: "session", patch: { anachrometer: true, borealisTool: true } });
    expect(store.getState().play.anachrometer).toBe(true);
    expect(store.getState().play.borealisTool).toBe(true);

    store.dispatch({ type: "edit", level: { ...before, id: "changed" } });
    expect(store.getState().level).toBe(before);
  });

  it("ignores session changes when not playing", () => {
    const store = createEditorStore(level());
    store.dispatch({ type: "session", patch: { anachrometer: true, hull: 2 } });
    store.dispatch({ type: "gem", op: "add", x: 100, y: 100 });
    expect(store.getState().play.anachrometer).toBe(false);
    expect(store.getState().play.extraBorealis).toEqual([]);
  });

  it("clamps hull to 0..max and tonation to 0..cap", () => {
    const store = playing();
    store.dispatch({ type: "session", patch: { hull: -3 } });
    expect(store.getState().play.hull).toBe(0);
    store.dispatch({ type: "session", patch: { hull: 99 } });
    expect(store.getState().play.hull).toBe(HULL_MAX);
    store.dispatch({ type: "session", patch: { hull: 4.6 } });
    expect(store.getState().play.hull).toBe(5);
    store.dispatch({ type: "session", patch: { tonation: 99 } });
    expect(store.getState().play.tonation).toBe(TONATION_CAP);
    store.dispatch({ type: "session", patch: { tonation: -5 } });
    expect(store.getState().play.tonation).toBe(0);
  });

  it("resets on every Play and when stopping", () => {
    const store = playing();
    store.dispatch({ type: "session", patch: { hull: 3, tonation: 7, anachrometer: true } });
    store.dispatch({ type: "gem", op: "add", x: 100, y: 700 });
    store.dispatch({ type: "play", on: false });
    expect(store.getState().play.hull).toBe(HULL_MAX);
    expect(store.getState().play.extraBorealis).toEqual([]);
    store.dispatch({ type: "play", on: true });
    expect(store.getState().play.anachrometer).toBe(false);
    expect(store.getState().play.tonation).toBe(0);
  });

  it("gives new gems the session's pitch unless one is passed", () => {
    const store = playing();
    store.dispatch({ type: "session", patch: { gemPitch: "E5" } });
    store.dispatch({ type: "gem", op: "add", x: 100, y: 100 });
    // Where it is placed makes no difference.
    store.dispatch({ type: "gem", op: "add", x: 100, y: 1500 });
    store.dispatch({ type: "gem", op: "add", x: 100, y: 800, pitch: "A3" });
    expect(store.getState().play.extraBorealis.map((g) => g.pitch)).toEqual(["E5", "E5", "A3"]);
  });

  it("adds, patches, removes and clears Borealis, never touching the level file", () => {
    const store = playing();
    const lv = store.getState().level;
    store.dispatch({ type: "gem", op: "add", x: 123.456, y: 700 });
    store.dispatch({ type: "gem", op: "add", x: 300, y: 900, pitch: "A4" });
    let play = store.getState().play;
    expect(play.extraBorealis.map((g) => g.id)).toEqual(["pt-gem-1", "pt-gem-2"]);
    expect(play.extraBorealis[0]!.x).toBe(123.46);
    expect(play.extraBorealis[0]!.pitch).toBeTruthy();
    expect(play.extraBorealis[1]!.pitch).toBe("A4");
    expect(play.selectedGem).toBe("pt-gem-2");

    store.dispatch({ type: "gem", op: "patch", id: "pt-gem-1", patch: { x: -50, y: 99999, pitch: "C4" } });
    play = store.getState().play;
    expect(play.extraBorealis[0]).toMatchObject({ x: 0, y: 1600, pitch: "C4" });

    store.dispatch({ type: "gem", op: "remove", id: "pt-gem-2" });
    play = store.getState().play;
    expect(play.extraBorealis.map((g) => g.id)).toEqual(["pt-gem-1"]);
    expect(play.selectedGem).toBeNull();

    // Ids never repeat while one is live.
    store.dispatch({ type: "gem", op: "add", x: 10, y: 10 });
    expect(store.getState().play.extraBorealis.map((g) => g.id)).toEqual(["pt-gem-1", "pt-gem-2"]);

    store.dispatch({ type: "gem", op: "clear" });
    expect(store.getState().play.extraBorealis).toEqual([]);
    expect(store.getState().play.selectedGem).toBeNull();
    expect(store.getState().level).toBe(lv);
  });
});

describe("borealis cursor rules", () => {
  const view = "portrait" as const;
  const gem = (id: string, x: number, y: number): BorealisSpot => ({ id, x, y, pitch: "E4" });

  it("a single click on empty space adds a gem there", () => {
    const p = toView(view, { x: 300, y: 700 });
    const action = cursorAction(view, [], p, 1);
    expect(action.kind).toBe("add");
    if (action.kind !== "add") return;
    const back = fromView(view, p);
    expect(action.x).toBeCloseTo(back.x);
    expect(action.y).toBeCloseTo(back.y);
  });

  it("a click outside the frame does nothing", () => {
    expect(cursorAction(view, [], { x: -10, y: 10 }, 1)).toEqual({ kind: "none" });
    expect(cursorAction(view, [], { x: 10, y: 9999 }, 1)).toEqual({ kind: "none" });
  });

  it("a single click on a gem selects it, a double-click removes it", () => {
    const extras = [gem("pt-gem-1", 300, 700)];
    const p = toView(view, extras[0]!);
    expect(cursorAction(view, extras, p, 1)).toEqual({ kind: "select", id: "pt-gem-1" });
    expect(cursorAction(view, extras, p, 2)).toEqual({ kind: "remove", id: "pt-gem-1" });
    expect(cursorAction(view, extras, p, 3)).toEqual({ kind: "remove", id: "pt-gem-1" });
  });

  it("picks the nearest gem and misses ones out of reach", () => {
    const extras = [gem("pt-gem-1", 300, 700), gem("pt-gem-2", 330, 700)];
    const near = toView(view, { x: 326, y: 700 });
    expect(gemAt(view, extras, near)?.id).toBe("pt-gem-2");
    expect(gemAt(view, extras, toView(view, { x: 600, y: 300 }))).toBeNull();
  });

  it("a double-click on empty space nets to nothing", () => {
    const store = createEditorStore(level());
    store.dispatch({ type: "play", on: true });
    const p = toView(view, { x: 300, y: 700 });
    for (const clicks of [1, 2]) {
      const action = cursorAction(view, store.getState().play.extraBorealis, p, clicks);
      if (action.kind === "add") store.dispatch({ type: "gem", op: "add", x: action.x, y: action.y });
      if (action.kind === "remove") store.dispatch({ type: "gem", op: "remove", id: action.id });
    }
    expect(store.getState().play.extraBorealis).toEqual([]);
  });
});
