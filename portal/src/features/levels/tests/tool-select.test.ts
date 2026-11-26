import { describe, expect, it } from "vitest";
import { toView } from "../geometry";
import { addBand, addBorealis, addExit, addTerrain, createLevel, hashSeed, setEnter } from "../model";
import { WORLD_H } from "../../notehead/modules/sim";
import { harness, v } from "./harness";

/** A level with one item of every kind, well apart from each other. */
function populated() {
  let level = createLevel("select");
  level = addTerrain(level, {
    id: "terrain-1",
    points: [
      v(20, 300),
      v(100, 300),
      v(100, 340),
      v(20, 340),
    ],
    closed: true,
    tickSeed: hashSeed("terrain-1"),
  });
  level = addBand(level, {
    id: "band-1",
    x0: v(60, 0).x,
    x1: v(120, 0).x,
    y: v(0, 200).y,
    kind: "band",
  });
  level = addBorealis(level, { id: "gem-1", ...v(148, 120), pitch: "E4" });
  level = setEnter(level, { ...v(40, 60), vx: 0, vy: 0 });
  level = addExit(level, {
    id: "exit-1",
    facing: "up",
    x0: v(100, 0).x,
    x1: v(160, 0).x,
    y0: WORLD_H,
    y1: WORLD_H,
  });
  return harness(level);
}

describe("select tool", () => {
  it("picks an item from every layer", () => {
    const h = populated();
    h.click(v(40, 60));
    expect(h.state.selection).toEqual({ kind: "enter", id: "enter" });
    h.click(v(148, 120));
    expect(h.state.selection).toEqual({ kind: "borealis", id: "gem-1" });
    h.click({ x: (h.level.bands[0]!.x0 + h.level.bands[0]!.x1) / 2, y: h.level.bands[0]!.y });
    expect(h.state.selection).toEqual({ kind: "band", id: "band-1" });
    h.click(v(130, 1));
    expect(h.state.selection).toEqual({ kind: "exit", id: "exit-1" });
    h.click(v(20, 300));
    expect(h.state.selection).toEqual({ kind: "terrain", id: "terrain-1", vertex: 0 });
    h.click(v(60, 320));
    expect(h.state.selection).toEqual({ kind: "terrain", id: "terrain-1" });
  });

  it("clicking empty space clears the selection", () => {
    const h = populated();
    h.click(v(148, 120));
    h.click(v(180, 240));
    expect(h.state.selection).toBeNull();
  });

  it("small targets win over the rock fill underneath", () => {
    let level = populated().level;
    level = addBorealis(level, { id: "gem-2", ...v(60, 320), pitch: "C4" });
    const h = harness(level);
    h.click(v(60, 320));
    expect(h.state.selection).toEqual({ kind: "borealis", id: "gem-2" });
  });

  it("drags each kind of item", () => {
    const h = populated();

    h.drag(v(40, 60), v(60, 80));
    expect(toView("portrait", h.level.enter!).x).toBeCloseTo(60, 1);

    h.drag(v(148, 120), v(168, 140));
    expect(toView("portrait", h.level.borealis[0]!).x).toBeCloseTo(168, 1);

    const band = h.level.bands[0]!;
    h.drag({ x: (band.x0 + band.x1) / 2, y: band.y }, { x: (band.x0 + band.x1) / 2 + 100, y: band.y });
    expect(h.level.bands[0]!.x0).toBeGreaterThan(band.x0);

    const exit = h.level.exits[0]!;
    h.drag({ x: (exit.x0 + exit.x1) / 2, y: WORLD_H }, { x: (exit.x0 + exit.x1) / 2 - 100, y: WORLD_H });
    expect(h.level.exits[0]!.x0).toBeLessThan(exit.x0);
  });

  it("moves a whole terrain shape by its edge or fill, and one vertex by its handle", () => {
    const h = populated();
    const before = h.level.terrain[0]!.points.map((p) => toView("portrait", p));

    h.drag(v(60, 320), v(80, 300));
    const moved = h.level.terrain[0]!.points.map((p) => toView("portrait", p));
    moved.forEach((p, i) => {
      expect(p.x).toBeCloseTo(before[i]!.x + 20, 1);
      expect(p.y).toBeCloseTo(before[i]!.y - 20, 1);
    });

    h.drag(v(40, 280), v(52, 280));
    const vertex = toView("portrait", h.level.terrain[0]!.points[0]!);
    expect(vertex.x).toBeCloseTo(52, 1);
    expect(toView("portrait", h.level.terrain[0]!.points[1]!).x).toBeCloseTo(
      before[1]!.x + 20,
      1,
    );
  });

  it("Delete removes the selection as one undo step", () => {
    const h = populated();
    h.click(v(148, 120));
    const depth = h.undoDepth;
    expect(h.key("Delete")).toBe(true);
    expect(h.level.borealis).toHaveLength(0);
    expect(h.state.selection).toBeNull();
    expect(h.undoDepth).toBe(depth + 1);
    h.key("z", { ctrlKey: true });
    expect(h.level.borealis).toHaveLength(1);
  });

  it("Delete removes the enter point, an exit, a band, and a terrain shape", () => {
    const h = populated();
    h.click(v(40, 60));
    h.key("Delete");
    expect(h.level.enter).toBeNull();

    h.click(v(130, 1));
    h.key("Backspace");
    expect(h.level.exits).toHaveLength(0);

    const band = h.level.bands[0]!;
    h.click({ x: (band.x0 + band.x1) / 2, y: band.y });
    h.key("Delete");
    expect(h.level.bands).toHaveLength(0);

    h.click(v(60, 320));
    h.key("Delete");
    expect(h.level.terrain).toHaveLength(0);
  });

  it("Delete on a selected vertex trims it while the shape stays valid", () => {
    const h = populated();
    h.click(v(20, 300));
    h.key("Delete");
    expect(h.level.terrain[0]!.points).toHaveLength(3);
    h.click(v(100, 300));
    h.key("Delete");
    // A triangle cannot lose another vertex, so the whole shape goes.
    h.click(v(100, 340));
    h.key("Delete");
    expect(h.level.terrain).toHaveLength(0);
  });

  it("F flips the selected terrain line", () => {
    const h = populated();
    h.click(v(60, 320));
    const first = h.level.terrain[0]!.points[0]!;
    const last = h.level.terrain[0]!.points[3]!;
    expect(h.key("f")).toBe(true);
    expect(h.level.terrain[0]!.points[0]).toEqual(last);
    expect(h.level.terrain[0]!.points[3]).toEqual(first);
  });

  it("works from any tool for keys, but Delete skips a locked layer", () => {
    const h = populated();
    h.click(v(148, 120));
    h.store.dispatch({ type: "layer", layer: "borealis", patch: { locked: true } });
    expect(h.key("Delete")).toBe(false);
    expect(h.level.borealis).toHaveLength(1);
  });

  it("locked layers cannot be picked", () => {
    const h = populated();
    h.store.dispatch({ type: "layer", layer: "borealis", patch: { locked: true } });
    h.click(v(148, 120));
    expect(h.state.selection).toBeNull();
  });

  it("pointer-up without moving adds no undo step", () => {
    const h = populated();
    h.click(v(148, 120));
    expect(h.undoDepth).toBe(0);
  });
});
