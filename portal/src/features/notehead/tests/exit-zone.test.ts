import { describe, expect, it } from "vitest";
import {
  containAgainstExitFrame,
  exitZoneFor,
  exitZoneReady,
  leftFrameThroughExit,
} from "../modules/exit-zone";
import { spawnBorealis } from "../modules/borealis";
import { SHIP_R, WORLD_H, WORLD_W } from "../modules/sim";

describe("exit zones", () => {
  it("defines exits for notch, launch-bridge, stairs, and zig", () => {
    expect(exitZoneFor("notch-calibrate")?.facing).toBe("up");
    expect(exitZoneFor("launch-bridge")?.facing).toBe("up");
    expect(exitZoneFor("stairs-anach")?.facing).toBe("right");
    expect(exitZoneFor("zig-1")?.facing).toBe("up");
    expect(exitZoneFor("launch-teach")).toBeNull();
  });

  it("lights launch-bridge always and Borealis beats only when gathered", () => {
    expect(exitZoneReady("launch-bridge", [])).toBe(true);
    const gems = spawnBorealis("notch-calibrate");
    expect(exitZoneReady("notch-calibrate", gems)).toBe(false);
    const done = gems.map((gem) => ({ ...gem, collected: true }));
    expect(exitZoneReady("notch-calibrate", done)).toBe(true);
  });

  it("clears only when leaving the frame through an upward exit", () => {
    const zone = exitZoneFor("notch-calibrate");
    if (!zone) throw new Error("expected notch exit");
    // Mid-shaft, past the top of the world.
    expect(
      leftFrameThroughExit(zone, { x: 450, y: WORLD_H + 250 }),
    ).toBe(true);
    // Still on-screen above the barrier.
    expect(leftFrameThroughExit(zone, { x: 450, y: WORLD_H - 40 })).toBe(
      false,
    );
    // Off the top but outside the exit opening.
    expect(leftFrameThroughExit(zone, { x: 40, y: WORLD_H + 250 })).toBe(
      false,
    );
    // Off the bottom does not count.
    expect(leftFrameThroughExit(zone, { x: 450, y: -300 })).toBe(false);
  });

  it("clears only when leaving the frame through a rightward exit", () => {
    const zone = exitZoneFor("stairs-anach");
    if (!zone) throw new Error("expected stairs exit");
    expect(
      leftFrameThroughExit(zone, { x: WORLD_W + 140, y: 1100 }),
    ).toBe(true);
    expect(leftFrameThroughExit(zone, { x: WORLD_W - 20, y: 1100 })).toBe(
      false,
    );
    expect(
      leftFrameThroughExit(zone, { x: WORLD_W + 140, y: 80 }),
    ).toBe(false);
  });

  it("seals every edge except the exit gap", () => {
    const notch = exitZoneFor("notch-calibrate");
    if (!notch) throw new Error("expected notch exit");
    const offTop = containAgainstExitFrame(
      { x: 40, y: WORLD_H + 20, vx: 0, vy: 200, restingOn: null },
      notch,
    );
    expect(offTop.hit).toBe(true);
    expect(offTop.body.y).toBeLessThanOrEqual(WORLD_H - SHIP_R + 0.01);
    expect(offTop.body.vy).toBe(0);

    const throughGap = containAgainstExitFrame(
      { x: 450, y: WORLD_H + 20, vx: 0, vy: 200, restingOn: null },
      notch,
    );
    expect(throughGap.hit).toBe(false);
    expect(throughGap.body.y).toBe(WORLD_H + 20);

    const stairs = exitZoneFor("stairs-anach");
    if (!stairs) throw new Error("expected stairs exit");
    const offRight = containAgainstExitFrame(
      { x: WORLD_W + 20, y: 80, vx: 200, vy: 0, restingOn: null },
      stairs,
    );
    expect(offRight.hit).toBe(true);
    expect(offRight.body.x).toBeLessThanOrEqual(WORLD_W - SHIP_R + 0.01);

    const rightGap = containAgainstExitFrame(
      { x: WORLD_W + 20, y: 1100, vx: 200, vy: 0, restingOn: null },
      stairs,
    );
    expect(rightGap.hit).toBe(false);
    expect(rightGap.body.x).toBe(WORLD_W + 20);
  });
});
