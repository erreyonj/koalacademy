import { describe, expect, it } from "vitest";
import { applyDetentSwipe } from "./detent-swipe";

describe("applyDetentSwipe", () => {
  it("accumulate: one upward step keeps remainder", () => {
    const result = applyDetentSwipe(0, -40, 36, "accumulate");
    expect(result.steps).toBe(1);
    expect(result.accum).toBe(-4);
  });

  it("accumulate: multi-step swipe keeps remainder", () => {
    const result = applyDetentSwipe(0, -80, 36, "accumulate");
    expect(result.steps).toBe(2);
    expect(result.accum).toBe(-8);
  });

  it("accumulate: downward steps are negative", () => {
    const result = applyDetentSwipe(0, 72, 36, "accumulate");
    expect(result.steps).toBe(-2);
    expect(result.accum).toBe(0);
  });

  it("accumulate: below threshold only updates accum", () => {
    const result = applyDetentSwipe(10, 20, 36, "accumulate");
    expect(result.steps).toBe(0);
    expect(result.accum).toBe(30);
  });

  it("single: one step discards leftover pixels", () => {
    const result = applyDetentSwipe(0, -50, 28, "single");
    expect(result.steps).toBe(1);
    expect(result.accum).toBe(0);
  });

  it("single: large swipe still fires only one step", () => {
    const result = applyDetentSwipe(0, 100, 28, "single");
    expect(result.steps).toBe(-1);
    expect(result.accum).toBe(0);
  });

  it("single: below threshold keeps accum", () => {
    const result = applyDetentSwipe(0, -20, 28, "single");
    expect(result.steps).toBe(0);
    expect(result.accum).toBe(-20);
  });
});
