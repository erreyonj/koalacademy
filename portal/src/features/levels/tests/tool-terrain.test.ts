import { describe, expect, it } from "vitest";
import { toView } from "../geometry";
import { hashSeed } from "../model";
import { harness, v } from "./harness";

function triangle(h: ReturnType<typeof harness>) {
  h.tool("terrain");
  h.click(v(40, 200));
  h.click(v(120, 200));
  h.click(v(80, 120));
}

describe("terrain tool", () => {
  it("builds a draft vertex by vertex without touching the level", () => {
    const h = harness();
    h.tool("terrain");
    h.click(v(40, 200));
    h.click(v(120, 200));
    expect(h.state.draft?.points).toHaveLength(2);
    expect(h.level.terrain).toHaveLength(0);
    expect(h.undoDepth).toBe(0);
  });

  it("snaps vertices to the view grid", () => {
    const h = harness();
    h.tool("terrain");
    h.click(v(41.3, 198.9));
    const p = toView("portrait", h.state.draft!.points[0]!);
    expect(p.x).toBeCloseTo(40, 1);
    expect(p.y).toBeCloseTo(200, 1);
  });

  it("closes the ring by clicking the first vertex", () => {
    const h = harness();
    triangle(h);
    h.click(v(40, 200));
    expect(h.level.terrain).toHaveLength(1);
    const shape = h.level.terrain[0]!;
    expect(shape.closed).toBe(true);
    expect(shape.points).toHaveLength(3);
    expect(shape.tickSeed).toBe(hashSeed(shape.id));
    expect(h.state.draft).toBeNull();
    expect(h.state.selection).toEqual({ kind: "terrain", id: shape.id });
    expect(h.undoDepth).toBe(1);
  });

  it("Enter finishes an open line", () => {
    const h = harness();
    h.tool("terrain");
    h.click(v(0, 280));
    h.click(v(100, 260));
    expect(h.key("Enter")).toBe(true);
    expect(h.level.terrain[0]!.closed).toBe(false);
    expect(h.level.terrain[0]!.points).toHaveLength(2);
    expect(h.state.draft).toBeNull();
  });

  it("Enter with a single point does nothing", () => {
    const h = harness();
    h.tool("terrain");
    h.click(v(40, 200));
    h.key("Enter");
    expect(h.level.terrain).toHaveLength(0);
    expect(h.state.draft?.points).toHaveLength(1);
  });

  it("clicking the first vertex of a two-point draft adds a point instead of closing", () => {
    const h = harness();
    h.tool("terrain");
    h.click(v(40, 200));
    h.click(v(120, 200));
    h.click(v(40, 200));
    expect(h.level.terrain).toHaveLength(0);
    expect(h.state.draft?.points).toHaveLength(3);
  });

  it("Backspace pops the last draft point", () => {
    const h = harness();
    h.tool("terrain");
    h.click(v(40, 200));
    h.click(v(120, 200));
    h.key("Backspace");
    expect(h.state.draft?.points).toHaveLength(1);
    h.key("Backspace");
    expect(h.state.draft).toBeNull();
  });

  it("Esc discards the draft but a tool switch keeps it", () => {
    const h = harness();
    h.tool("terrain");
    h.click(v(40, 200));
    h.click(v(120, 200));
    h.tool("select");
    expect(h.state.draft?.points).toHaveLength(2);
    h.tool("terrain");
    h.click(v(80, 120));
    expect(h.state.draft?.points).toHaveLength(3);
    h.key("Escape");
    expect(h.state.draft).toBeNull();
    expect(h.level.terrain).toHaveLength(0);
  });

  it("drags a vertex of finished terrain as one undo step", () => {
    const h = harness();
    triangle(h);
    h.click(v(40, 200));
    const before = h.undoDepth;
    h.drag(v(80, 120), v(80, 60));
    const moved = toView("portrait", h.level.terrain[0]!.points[2]!);
    expect(moved.y).toBeCloseTo(60, 1);
    expect(h.undoDepth).toBe(before + 1);
    h.key("z", { ctrlKey: true });
    expect(toView("portrait", h.level.terrain[0]!.points[2]!).y).toBeCloseTo(120, 1);
  });

  it("clicking a segment inserts a vertex", () => {
    const h = harness();
    triangle(h);
    h.click(v(40, 200));
    h.click(v(80, 200));
    const shape = h.level.terrain[0]!;
    expect(shape.points).toHaveLength(4);
    expect(toView("portrait", shape.points[1]!).x).toBeCloseTo(80, 1);
    expect(h.state.draft).toBeNull();
    expect(h.state.selection).toEqual({ kind: "terrain", id: shape.id, vertex: 1 });
  });

  it("Alt starts a new line on top of existing terrain", () => {
    const h = harness();
    triangle(h);
    h.click(v(40, 200));
    h.click(v(80, 200), { alt: true });
    expect(h.level.terrain[0]!.points).toHaveLength(3);
    expect(h.state.draft?.points).toHaveLength(1);
  });

  it("gives each shape a unique id and its own seed", () => {
    const h = harness();
    triangle(h);
    h.click(v(40, 200));
    h.click(v(40, 320));
    h.click(v(140, 320));
    h.click(v(100, 260));
    h.click(v(40, 320));
    const [a, b] = h.level.terrain;
    expect(a!.id).not.toBe(b!.id);
    expect(a!.tickSeed).not.toBe(b!.tickSeed);
  });

  it("does nothing while the terrain layer is locked", () => {
    const h = harness();
    h.store.dispatch({ type: "layer", layer: "terrain", patch: { locked: true } });
    h.tool("terrain");
    h.click(v(40, 200));
    expect(h.state.draft).toBeNull();
  });
});
