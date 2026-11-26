import { describe, expect, it } from "vitest";
import { toView } from "../geometry";
import { DEFAULT_BOREALIS_PITCH } from "../model";
import { defaultOptions } from "../store";
import { harness, v } from "./harness";

function place(h: ReturnType<typeof harness>, points: [number, number][]) {
  h.tool("borealis");
  for (const [x, y] of points) h.click(v(x, y));
}

describe("borealis tool", () => {
  it("places gems in goal order with unique ids", () => {
    const h = harness();
    place(h, [
      [40, 280],
      [100, 200],
      [60, 120],
    ]);
    expect(h.level.borealis.map((g) => g.id)).toEqual(["gem-1", "gem-2", "gem-3"]);
    const first = toView("portrait", h.level.borealis[0]!);
    expect(first.x).toBeCloseTo(40, 1);
  });

  it("gives every gem the tool's pitch, wherever it is placed", () => {
    const h = harness();
    place(h, [
      [100, 150],
      [100, 300],
    ]);
    expect(h.level.borealis.map((g) => g.pitch)).toEqual([
      DEFAULT_BOREALIS_PITCH,
      DEFAULT_BOREALIS_PITCH,
    ]);
  });

  it("uses the pitch chosen in the tool options", () => {
    const h = harness();
    h.store.dispatch({
      type: "options",
      options: { ...defaultOptions(), borealis: { pitch: "A4" } },
    });
    place(h, [[100, 280]]);
    expect(h.level.borealis[0]!.pitch).toBe("A4");
  });

  it("selects the new gem and makes each placement one undo step", () => {
    const h = harness();
    place(h, [[100, 200]]);
    expect(h.state.selection).toEqual({ kind: "borealis", id: "gem-1" });
    expect(h.undoDepth).toBe(1);
    h.key("z", { ctrlKey: true });
    expect(h.level.borealis).toHaveLength(0);
  });

  it("dragging a gem moves it and keeps its pitch", () => {
    const h = harness();
    place(h, [[100, 280]]);
    const before = h.level.borealis[0]!;
    h.drag({ x: before.x, y: before.y }, v(100, 120));
    const gem = h.level.borealis[0]!;
    expect(toView("portrait", gem).y).toBeCloseTo(120, 1);
    expect(gem.pitch).toBe(before.pitch);
    expect(h.level.borealis).toHaveLength(1);
    expect(h.undoDepth).toBe(2);
  });

  it("keeps a chosen pitch when the gem moves", () => {
    const h = harness();
    h.store.dispatch({
      type: "options",
      options: { ...defaultOptions(), borealis: { pitch: "B4" } },
    });
    place(h, [[100, 280]]);
    const before = h.level.borealis[0]!;
    h.drag({ x: before.x, y: before.y }, v(100, 120));
    expect(h.level.borealis[0]!.pitch).toBe("B4");
  });

  it("Shift-dragging a gem onto another reorders the chain without moving it", () => {
    const h = harness();
    place(h, [
      [40, 280],
      [100, 200],
      [60, 120],
    ]);
    const [a, , c] = h.level.borealis;
    h.drag({ x: c!.x, y: c!.y }, { x: a!.x, y: a!.y }, { shift: true });
    expect(h.level.borealis.map((g) => g.id)).toEqual(["gem-3", "gem-1", "gem-2"]);
    const moved = h.level.borealis[0]!;
    expect(moved.x).toBe(c!.x);
    expect(moved.y).toBe(c!.y);
  });

  it("a Shift-drag released over empty space changes nothing", () => {
    const h = harness();
    place(h, [
      [40, 280],
      [100, 200],
    ]);
    const before = h.level;
    const gem = h.level.borealis[1]!;
    h.drag({ x: gem.x, y: gem.y }, v(150, 50), { shift: true });
    expect(h.level.borealis).toEqual(before.borealis);
  });

  it("picks an existing gem instead of stacking a new one on it", () => {
    const h = harness();
    place(h, [[100, 200]]);
    const gem = h.level.borealis[0]!;
    h.click({ x: gem.x, y: gem.y });
    expect(h.level.borealis).toHaveLength(1);
  });

  it("does nothing while the layer is locked", () => {
    const h = harness();
    h.store.dispatch({ type: "layer", layer: "borealis", patch: { locked: true } });
    place(h, [[100, 200]]);
    expect(h.level.borealis).toHaveLength(0);
  });
});
