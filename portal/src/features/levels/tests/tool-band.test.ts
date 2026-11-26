import { describe, expect, it } from "vitest";
import { scaleOf, toView } from "../geometry";
import { asLedge } from "../model";
import { ledgeYAt } from "../../notehead/modules/sim";
import { defaultOptions } from "../store";
import { harness, v } from "./harness";

function setOptions(h: ReturnType<typeof harness>, patch: Partial<ReturnType<typeof defaultOptions>>) {
  h.store.dispatch({ type: "options", options: { ...h.state.options, ...patch } });
}

function made(h: ReturnType<typeof harness>) {
  h.tool("band");
  h.drag(v(40, 200), v(100, 200));
  return h.level.bands[0]!;
}

describe("band tool", () => {
  it("drags out a ledge that snaps to the grid and carries no pitch", () => {
    const h = harness();
    const band = made(h);
    expect(band.id).toBe("band-1");
    expect(band.x0).toBeLessThan(band.x1);
    expect(toView("portrait", { x: band.x0, y: band.y }).y % 4).toBeCloseTo(0, 1);
    expect("pitch" in band).toBe(false);
    expect(band.kind).toBe("band");
    expect(band.slope).toBeUndefined();
    // Dragged from view x 40 to 100.
    expect(toView("portrait", { x: band.x0, y: band.y }).x).toBeCloseTo(40, 1);
    expect(toView("portrait", { x: band.x1, y: band.y }).x).toBeCloseTo(100, 1);
  });

  it("drags right to left into the same span", () => {
    const h = harness();
    h.tool("band");
    h.drag(v(100, 200), v(40, 200));
    const band = h.level.bands[0]!;
    expect(toView("portrait", { x: band.x0, y: band.y }).x).toBeCloseTo(40, 1);
    expect(toView("portrait", { x: band.x1, y: band.y }).x).toBeCloseTo(100, 1);
  });

  it("a plain click drops a default-width ledge centred on the click", () => {
    const h = harness();
    h.tool("band");
    h.click(v(100, 200));
    const band = h.level.bands[0]!;
    const { sx } = scaleOf("portrait");
    expect(band.x1 - band.x0).toBeCloseTo(24 * sx, 0);
    expect((band.x0 + band.x1) / 2).toBeCloseTo(v(100, 200).x, 0);
  });

  it("uses the kind from the tool options", () => {
    const h = harness();
    setOptions(h, { band: { kind: "step" } });
    const band = made(h);
    expect(band.kind).toBe("step");
    expect("pitch" in band).toBe(false);
  });

  it("snaps y to the view-space grid", () => {
    const h = harness();
    h.tool("band");
    h.drag(v(40, 202), v(100, 202));
    const band = h.level.bands[0]!;
    expect(toView("portrait", { x: band.x0, y: band.y }).y).toBeCloseTo(204, 1);
  });

  it("resizes by dragging an end, along the band's own line", () => {
    const h = harness();
    const band = made(h);
    const end = toView("portrait", { x: band.x1, y: band.y });
    h.drag(v(end.x, end.y), v(end.x + 20, end.y + 30));
    const next = h.level.bands[0]!;
    expect(next.x1).toBeGreaterThan(band.x1);
    expect(next.y).toBe(band.y);
    expect(next.slope).toBeUndefined();
    expect(next.x0).toBe(band.x0);
  });

  it("will not collapse a band below the minimum span", () => {
    const h = harness();
    const band = made(h);
    const end = toView("portrait", { x: band.x1, y: band.y });
    h.drag(v(end.x, end.y), v(0, end.y));
    const next = h.level.bands[0]!;
    expect(next.x1 - next.x0).toBeGreaterThanOrEqual(6 * scaleOf("portrait").sx - 0.01);
  });

  it("Shift-drag on an end tilts the band into a slope", () => {
    const h = harness();
    const band = made(h);
    const end = toView("portrait", { x: band.x1, y: band.y });
    // Drag the right end up two rows.
    const target = { x: end.x, y: end.y - 40 };
    h.drag(v(end.x, end.y), v(target.x, target.y), { shift: true });
    const next = h.level.bands[0]!;
    expect(next.slope).toBeGreaterThan(0);
    expect(next.x0).toBe(band.x0);
    // The left end stays where it was.
    expect(ledgeYAt(asLedge(next), next.x0)).toBeCloseTo(band.y, 1);
    expect(ledgeYAt(asLedge(next), next.x1)).toBeGreaterThan(band.y);
  });

  it("moves the whole band by its body and keeps its slope", () => {
    const h = harness();
    const band = made(h);
    const end = toView("portrait", { x: band.x1, y: band.y });
    h.drag(v(end.x, end.y), v(end.x, end.y - 40), { shift: true });
    const tilted = h.level.bands[0]!;

    const mid = { x: (tilted.x0 + tilted.x1) / 2, y: tilted.y };
    h.drag(mid, { x: mid.x + 90, y: mid.y });
    const moved = h.level.bands[0]!;
    expect(moved.x0).toBeGreaterThan(tilted.x0);
    expect(moved.x1 - moved.x0).toBeCloseTo(tilted.x1 - tilted.x0, 1);
    expect(moved.slope).toBe(tilted.slope);
  });

  it("selects the band it creates and each finished gesture is one undo step", () => {
    const h = harness();
    const band = made(h);
    expect(h.state.selection).toEqual({ kind: "band", id: band.id });
    expect(h.undoDepth).toBe(1);
    h.key("z", { ctrlKey: true });
    expect(h.level.bands).toHaveLength(0);
  });

  it("picks an existing band instead of stacking a new one on it", () => {
    const h = harness();
    const band = made(h);
    h.click({ x: (band.x0 + band.x1) / 2, y: band.y });
    expect(h.level.bands).toHaveLength(1);
    expect(h.state.selection).toEqual({ kind: "band", id: band.id });
  });

  it("numbers bands uniquely", () => {
    const h = harness();
    h.tool("band");
    h.drag(v(20, 200), v(60, 200));
    h.drag(v(100, 120), v(140, 120));
    expect(h.level.bands.map((b) => b.id)).toEqual(["band-1", "band-2"]);
  });
});
