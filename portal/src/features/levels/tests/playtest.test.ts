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
import {
  STALL_FRAMES,
  advance,
  buildScene,
  chartShot,
  createState,
  fire,
  playBlocker,
  type PlaytestScene,
  type PlaytestState,
} from "../playtest/runtime";
import { resolveMasses, resolveMassesAgainst } from "../../notehead/modules/collide";
import { massesFor } from "../../notehead/modules/terrain";
import { getRoute } from "../../notehead/routes/registry";
import { fromSvgPoint, type Body, type RegionId } from "../../notehead/modules/sim";
import { createEditorStore } from "../store";
import { handleKey } from "../tools";
import type { EnterPoint, LevelFile } from "../types";

/** A floor, one band over it, an exit through the top. */
function level(opts: {
  enter?: EnterPoint;
  gems?: { id: string; x: number; y: number }[];
  exit?: boolean;
} = {}): LevelFile {
  let lv = createLevel("playtest", "portrait");
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
  for (const gem of opts.gems ?? []) {
    lv = addBorealis(lv, { ...gem, pitch: "E4" });
  }
  lv = setEnter(lv, opts.enter ?? { x: 450, y: 800, vx: 0, vy: 0 });
  if (opts.exit !== false) {
    lv = addExit(lv, { id: "exit-1", facing: "up", x0: 300, x1: 600, y0: 1600, y1: 1600 });
  }
  return lv;
}

function sceneOf(lv: LevelFile): PlaytestScene {
  const scene = buildScene(lv);
  if (!scene) throw new Error("level should be playable");
  return scene;
}

/** Advance until `done` (or the frame cap). Returns the last state. */
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

describe("playBlocker / buildScene", () => {
  it("needs an enter point and an exit", () => {
    expect(playBlocker(createLevel())).toBe("Place an enter point first.");
    expect(playBlocker(level({ exit: false }))).toBe("Add an exit first.");
    expect(playBlocker(level())).toBeNull();
    expect(buildScene(level({ exit: false }))).toBeNull();
  });

  it("refuses a level whose ship flies out an exit before landing", () => {
    // Floor-skimming enter under a floor-wide down exit (the reported level).
    let lv = level({ enter: { x: 18, y: 35.56, vx: 1848.72, vy: 3.8 } });
    lv = addExit(lv, { id: "exit-2", facing: "down", x0: 18, x1: 774, y0: 0, y1: 0 });
    expect(playBlocker(lv)).toMatch(/flies out an exit/);
    // Starting exactly on the floor is the same problem.
    expect(playBlocker({ ...lv, enter: { x: 18, y: 17.78, vx: 1848.72, vy: 3.8 } })).toMatch(
      /flies out an exit/,
    );
    // Dropping onto the band first is a playable level, even with that exit.
    expect(playBlocker({ ...lv, enter: { x: 450, y: 800, vx: 0, vy: 0 } })).toBeNull();
    // The static checks still come first.
    expect(playBlocker(level({ exit: false }))).toBe("Add an exit first.");
  });

  it("builds logical-space masses, ledges, gems, openings and the start body", () => {
    const scene = sceneOf(level({ gems: [{ id: "gem-1", x: 450, y: 650 }] }));
    expect(scene.regionId).toBe("launch");
    expect(scene.masses).toHaveLength(1);
    expect(scene.ledges.map((l) => l.id)).toEqual(["band-1"]);
    expect(scene.borealis).toHaveLength(1);
    expect(scene.openings).toEqual([
      { facing: "up", x0: 300, x1: 600, y0: 1600, y1: 1600 },
    ]);
    expect(scene.start).toEqual({ x: 450, y: 800, vx: 0, vy: 0, restingOn: null });
    // Rock is below the drawn floor: a point under it is inside, one above is not.
    const [mass] = scene.masses;
    const ys = mass!.outline.map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(150);
  });

  it("uses the landscape region for landscape levels", () => {
    const lv = { ...level(), view: "landscape" as const };
    expect(buildScene(lv)?.regionId).toBe("landscape");
  });
});

describe("flight", () => {
  it("lands on a band and seats there", () => {
    const scene = sceneOf(level());
    const state = run(scene, createState(scene), (s) => s.body.restingOn === "band-1");
    expect(state.body.restingOn).toBe("band-1");
    expect(state.resets).toBe(0);
  });

  it("collects a Borealis on the way down", () => {
    const scene = sceneOf(level({ gems: [{ id: "gem-1", x: 450, y: 650 }] }));
    const state = run(scene, createState(scene), (s) => s.collected === 1);
    expect(state.collected).toBe(1);
    expect(state.borealis[0]!.collected).toBe(true);
  });

  it("clears when every Borealis is collected and the ship leaves through the exit", () => {
    const scene = sceneOf(
      level({
        enter: { x: 450, y: 400, vx: 0, vy: 3400 },
        gems: [{ id: "gem-1", x: 450, y: 900 }],
      }),
    );
    const state = run(scene, createState(scene), (s) => s.cleared);
    expect(state.cleared).toBe(true);
    expect(state.collected).toBe(1);
    expect(state.resets).toBe(0);
  });

  it("resets when the ship leaves before collecting everything", () => {
    const scene = sceneOf(
      level({
        enter: { x: 450, y: 400, vx: 0, vy: 3400 },
        gems: [{ id: "gem-1", x: 100, y: 900 }],
      }),
    );
    const state = run(scene, createState(scene), (s) => s.resets > 0 || s.cleared);
    expect(state.cleared).toBe(false);
    expect(state.resets).toBe(1);
    expect(state.notice).toMatch(/early/i);
    expect(state.body).toEqual(scene.start);
    expect(state.collected).toBe(0);
  });

  it("resets a ship stuck on rock", () => {
    const scene = sceneOf(level({ enter: { x: 450, y: 100, vx: 0, vy: 0 } }));
    const state = run(scene, createState(scene), (s) => s.resets > 0, STALL_FRAMES * 3);
    expect(state.resets).toBe(1);
    expect(state.notice).toBe("Stuck on rock.");
  });

  it("keeps the ship inside sealed frame edges", () => {
    const scene = sceneOf(level({ enter: { x: 450, y: 800, vx: -4000, vy: 0 } }));
    let state = createState(scene);
    for (let i = 0; i < 120; i++) state = advance(scene, state);
    expect(state.body.x).toBeGreaterThanOrEqual(0);
    expect(state.resets).toBe(0);
  });
});

describe("shots", () => {
  function seated(): { scene: PlaytestScene; state: PlaytestState } {
    const scene = sceneOf(level());
    const state = run(scene, createState(scene), (s) => s.body.restingOn === "band-1");
    return { scene, state };
  }

  it("fires from a ledge and ignores a pull in flight", () => {
    const { scene, state } = seated();
    const fired = fire(scene, state, { x: 0, y: -300 });
    expect(fired.body.restingOn).toBeNull();
    expect(fired.body.vy).toBeGreaterThan(0);
    expect(fired.shots).toBe(1);
    expect(fire(scene, fired, { x: 0, y: -300 })).toBe(fired);
  });

  it("ignores a tiny pull", () => {
    const { scene, state } = seated();
    expect(fire(scene, state, { x: 0, y: -2 })).toBe(state);
  });

  it("charts a flight that rises and lands back on the band", () => {
    const { scene, state } = seated();
    const chart = chartShot(scene, state.body, { x: 0, y: -300 });
    expect(chart.points.length).toBeGreaterThan(4);
    expect(chart.apex!.y).toBeGreaterThan(state.body.y);
    expect(chart.landedOn).toBe("band-1");
  });

  it("charts nothing in flight", () => {
    const scene = sceneOf(level());
    expect(chartShot(scene, scene.start, { x: 0, y: -300 }).points).toEqual([]);
  });
});

/** The built-in launch site plus every level of the shipped route. */
function gameRegions(): RegionId[] {
  return ["launch", ...getRoute().levels.map((entry) => entry.id)];
}

describe("sandbox isolation", () => {
  it("never touches the game's region registry", () => {
    const before = JSON.stringify(
      gameRegions().map((id) => massesFor(id)),
    );
    const scene = sceneOf(level({ gems: [{ id: "gem-1", x: 450, y: 650 }] }));
    run(scene, createState(scene), (s) => s.collected === 1);
    const after = JSON.stringify(
      gameRegions().map((id) => massesFor(id)),
    );
    expect(after).toBe(before);
  });
});

describe("resolveMassesAgainst", () => {
  it("matches resolveMasses for every registry region", () => {
    let checked = 0;
    for (const id of gameRegions()) {
      const masses = massesFor(id).map((mass) => ({
        id: mass.id,
        outline: mass.outline.map((p) => fromSvgPoint(p.x, p.y, id)),
      }));
      for (let x = 0; x <= 900; x += 60) {
        for (let y = 0; y <= 1600; y += 80) {
          const body: Body = { x, y, vx: 120, vy: -400, restingOn: null };
          expect(resolveMassesAgainst(body, masses)).toEqual(resolveMasses(body, id));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("editor wiring", () => {
  const env = { tolerance: 3 };
  const key = (k: string) => ({ key: k, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false });

  it("P starts a playtest only when the level is playable, and Esc stops it", () => {
    const empty = createEditorStore(createLevel());
    handleKey(empty, env, key("p"));
    expect(empty.getState().playing).toBe(false);

    const store = createEditorStore(level());
    expect(handleKey(store, env, key("p"))).toBe(true);
    expect(store.getState().playing).toBe(true);
    expect(handleKey(store, env, key("Escape"))).toBe(true);
    expect(store.getState().playing).toBe(false);
  });

  it("freezes the level while playing", () => {
    const store = createEditorStore(level());
    store.dispatch({ type: "play", on: true });
    const before = store.getState().level;
    store.dispatch({ type: "edit", level: createLevel("other") });
    store.dispatch({ type: "undo" });
    store.dispatch({ type: "setTool", tool: "terrain" });
    expect(store.getState().level).toBe(before);
    expect(store.getState().tool).toBe("select");
    // Tool hotkeys and Delete are ignored too.
    expect(handleKey(store, env, key("t"))).toBe(false);
    expect(handleKey(store, env, key("Delete"))).toBe(false);
  });

  it("loading a level stops the playtest", () => {
    const store = createEditorStore(level());
    store.dispatch({ type: "play", on: true });
    store.dispatch({ type: "load", level: createLevel("next") });
    expect(store.getState().playing).toBe(false);
  });
});
