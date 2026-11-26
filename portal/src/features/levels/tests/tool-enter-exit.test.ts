import { describe, expect, it } from "vitest";
import { toView } from "../geometry";
import { WORLD_H, WORLD_W } from "../../notehead/modules/sim";
import { VELOCITY_PER_UNIT } from "../tools/gestures";
import { harness, v } from "./harness";

function exitMode(h: ReturnType<typeof harness>) {
  h.tool("enter-exit");
  h.key("e");
}

describe("enter/exit tool: enter mode", () => {
  it("click places the single enter point at rest", () => {
    const h = harness();
    h.tool("enter-exit");
    h.click(v(100, 300));
    expect(h.level.enter).not.toBeNull();
    const at = toView("portrait", h.level.enter!);
    expect(at.x).toBeCloseTo(100, 1);
    expect(at.y).toBeCloseTo(300, 1);
    expect(h.level.enter!.vx).toBe(0);
    expect(h.level.enter!.vy).toBe(0);
    expect(h.state.selection).toEqual({ kind: "enter", id: "enter" });
  });

  it("dragging out sets the launch velocity so the arrow tip follows the cursor", () => {
    const h = harness();
    h.tool("enter-exit");
    const from = v(100, 300);
    const to = v(140, 240);
    h.drag(from, to);
    const e = h.level.enter!;
    expect(e.x).toBeCloseTo(from.x, 1);
    expect(e.vx).toBeCloseTo((to.x - from.x) * VELOCITY_PER_UNIT, 0);
    expect(e.vy).toBeCloseTo((to.y - from.y) * VELOCITY_PER_UNIT, 0);
    expect(e.vy).toBeGreaterThan(0);
  });

  it("placing again replaces the enter point and keeps its velocity on a plain click", () => {
    const h = harness();
    h.tool("enter-exit");
    h.drag(v(100, 300), v(140, 240));
    const { vx, vy } = h.level.enter!;
    h.click(v(60, 320));
    const next = h.level.enter!;
    expect(toView("portrait", next).x).toBeCloseTo(60, 1);
    expect(next.vx).toBe(vx);
    expect(next.vy).toBe(vy);
  });

  it("dragging the marker moves it without changing velocity", () => {
    const h = harness();
    h.tool("enter-exit");
    h.drag(v(100, 300), v(140, 240));
    const { vx, vy } = h.level.enter!;
    const marker = { x: h.level.enter!.x, y: h.level.enter!.y };
    h.drag(marker, v(40, 280));
    const next = h.level.enter!;
    expect(toView("portrait", next).x).toBeCloseTo(40, 1);
    expect(next.vx).toBe(vx);
    expect(next.vy).toBe(vy);
  });

  it("is one undo step per placement", () => {
    const h = harness();
    h.tool("enter-exit");
    h.drag(v(100, 300), v(140, 240));
    expect(h.undoDepth).toBe(1);
    h.key("z", { ctrlKey: true });
    expect(h.level.enter).toBeNull();
  });
});

describe("enter/exit tool: exit mode", () => {
  it("E flips between enter and exit while the tool is active", () => {
    const h = harness();
    h.tool("enter-exit");
    expect(h.state.options.enterExit.mode).toBe("enter");
    h.key("e");
    expect(h.state.options.enterExit.mode).toBe("exit");
    h.key("e");
    expect(h.state.options.enterExit.mode).toBe("enter");
    expect(h.state.tool).toBe("enter-exit");
  });

  it("a click near the top edge opens a default span facing up", () => {
    const h = harness();
    exitMode(h);
    h.click(v(100, 6));
    expect(h.level.exits).toHaveLength(1);
    const e = h.level.exits[0]!;
    expect(e.facing).toBe("up");
    expect(e.y0).toBe(WORLD_H);
    expect(e.y1).toBe(WORLD_H);
    expect(e.x1 - e.x0).toBeGreaterThan(0);
    expect((e.x0 + e.x1) / 2).toBeCloseTo(v(100, 0).x, 0);
  });

  it("dragging along an edge sets the span", () => {
    const h = harness();
    exitMode(h);
    h.drag(v(60, 4), v(140, 4));
    const e = h.level.exits[0]!;
    expect(e.facing).toBe("up");
    expect(e.x0).toBeCloseTo(v(60, 0).x, 0);
    expect(e.x1).toBeCloseTo(v(140, 0).x, 0);
  });

  it("the right edge makes a right-facing opening on y", () => {
    const h = harness();
    exitMode(h);
    h.drag(v(196, 80), v(196, 160));
    const e = h.level.exits[0]!;
    expect(e.facing).toBe("right");
    expect(e.x0).toBe(WORLD_W);
    expect(e.x1).toBe(WORLD_W);
    expect(e.y0).toBeLessThan(e.y1);
    expect(e.y1 - e.y0).toBeGreaterThan(100);
  });

  it("the bottom edge makes a down-facing opening", () => {
    const h = harness();
    exitMode(h);
    h.click(v(100, 356));
    const e = h.level.exits[0]!;
    expect(e.facing).toBe("down");
    expect(e.y0).toBe(0);
    expect(e.y1).toBe(0);
  });

  it("ignores clicks far from every frame edge", () => {
    const h = harness();
    exitMode(h);
    h.click(v(100, 180));
    expect(h.level.exits).toHaveLength(0);
  });

  it("does not offer the left edge (the game has no left exits)", () => {
    const h = harness();
    exitMode(h);
    h.click(v(2, 180));
    expect(h.level.exits).toHaveLength(0);
  });

  it("dragging an existing exit slides it along its edge and clamps to the frame", () => {
    const h = harness();
    exitMode(h);
    h.drag(v(60, 4), v(100, 4));
    const first = h.level.exits[0]!;
    const width = first.x1 - first.x0;
    const mid = { x: (first.x0 + first.x1) / 2, y: WORLD_H };
    h.drag(mid, { x: mid.x + 5000, y: mid.y });
    const moved = h.level.exits[0]!;
    expect(moved.x1 - moved.x0).toBeCloseTo(width, 1);
    expect(moved.x1).toBeLessThanOrEqual(WORLD_W);
    expect(moved.x0).toBeGreaterThan(first.x0);
  });

  it("allows several exits with unique ids", () => {
    const h = harness();
    exitMode(h);
    h.drag(v(40, 4), v(80, 4));
    h.drag(v(196, 80), v(196, 120));
    expect(h.level.exits.map((e) => e.id)).toEqual(["exit-1", "exit-2"]);
  });

  it("is one undo step per exit", () => {
    const h = harness();
    exitMode(h);
    h.drag(v(60, 4), v(140, 4));
    expect(h.undoDepth).toBe(1);
  });
});
