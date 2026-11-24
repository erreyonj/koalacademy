import { describe, expect, it } from "vitest";
import {
  planSandboxScroll,
  SANDBOX_SCROLL_PAD,
  type SandboxScrollGeometry,
} from "./sandboxScroll";

const tall: SandboxScrollGeometry = {
  scrollHeight: 1494,
  clientHeight: 1108,
  sandboxTop: 462,
};

describe("planSandboxScroll", () => {
  it("scrolls to the bottom of the scroller for bar 2", () => {
    expect(planSandboxScroll("bottom", tall)).toBe(386);
  });

  it("aligns the sandbox top (with padding) when returning to bar 1", () => {
    expect(planSandboxScroll("top", { ...tall, scrollHeight: 1800 })).toBe(
      462 - SANDBOX_SCROLL_PAD,
    );
  });

  it("clamps the top target to the scrollable range", () => {
    // Little scroll range: sandbox top is further down than we can scroll.
    expect(
      planSandboxScroll("top", {
        scrollHeight: 1206,
        clientHeight: 1108,
        sandboxTop: 462,
      }),
    ).toBe(98);
  });

  it("never returns a negative scrollTop", () => {
    expect(
      planSandboxScroll("top", {
        scrollHeight: 2000,
        clientHeight: 800,
        sandboxTop: 4,
      }),
    ).toBe(0);
    expect(
      planSandboxScroll("bottom", {
        scrollHeight: 500,
        clientHeight: 800,
        sandboxTop: 0,
      }),
    ).toBe(0);
  });
});
