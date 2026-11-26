import { describe, expect, it } from "vitest";
import {
  bottomOpening,
  containAgainstExitFrame,
  containAgainstOpenings,
  exitZoneFor,
  exitZoneReady,
  leftFrameThroughExit,
  openingFromExitZone,
  touchedOpening,
} from "../modules/exit-zone";
import { MASS_HIT_SPEED, SHIP_R, WORLD_H, WORLD_W } from "../modules/sim";

describe("exit zones", () => {
  it("defines exits for notch, launch-bridge, stairs, and zig", () => {
    expect(exitZoneFor("notch-calibrate")?.facing).toBe("up");
    expect(exitZoneFor("launch-bridge")?.facing).toBe("up");
    expect(exitZoneFor("stairs-anach")?.facing).toBe("right");
    expect(exitZoneFor("zig-1")?.facing).toBe("up");
    expect(exitZoneFor("launch-teach")).toBeNull();
  });

  it("lights every beat that has an exit zone", () => {
    expect(exitZoneReady("launch-bridge")).toBe(true);
    expect(exitZoneReady("notch-calibrate")).toBe(true);
    expect(exitZoneReady("stairs-anach")).toBe(true);
    expect(exitZoneReady("zig-1")).toBe(true);
    expect(exitZoneReady("launch-teach")).toBe(false);
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
    const slam = MASS_HIT_SPEED + 50;
    const soft = MASS_HIT_SPEED * 0.25;

    // Soft bump: still sealed, but not a hull-taxing hit.
    const softTop = containAgainstExitFrame(
      { x: 40, y: WORLD_H + 20, vx: 0, vy: soft, restingOn: null },
      notch,
    );
    expect(softTop.hit).toBe(false);
    expect(softTop.body.y).toBeLessThanOrEqual(WORLD_H - SHIP_R + 0.01);
    expect(softTop.body.vy).toBe(0);

    const offTop = containAgainstExitFrame(
      { x: 40, y: WORLD_H + 20, vx: 0, vy: slam, restingOn: null },
      notch,
    );
    expect(offTop.hit).toBe(true);
    expect(offTop.body.y).toBeLessThanOrEqual(WORLD_H - SHIP_R + 0.01);
    expect(offTop.body.vy).toBe(0);

    const throughGap = containAgainstExitFrame(
      { x: 450, y: WORLD_H + 20, vx: 0, vy: slam, restingOn: null },
      notch,
    );
    expect(throughGap.hit).toBe(false);
    expect(throughGap.body.y).toBe(WORLD_H + 20);

    const stairs = exitZoneFor("stairs-anach");
    if (!stairs) throw new Error("expected stairs exit");
    const offRight = containAgainstExitFrame(
      { x: WORLD_W + 20, y: 80, vx: slam, vy: 0, restingOn: null },
      stairs,
    );
    expect(offRight.hit).toBe(true);
    expect(offRight.body.x).toBeLessThanOrEqual(WORLD_W - SHIP_R + 0.01);

    const rightGap = containAgainstExitFrame(
      { x: WORLD_W + 20, y: 1100, vx: slam, vy: 0, restingOn: null },
      stairs,
    );
    expect(rightGap.hit).toBe(false);
    expect(rightGap.body.x).toBe(WORLD_W + 20);
  });

  it("leaves a bottom gap unsealed and seals the floor outside it", () => {
    const openings = [bottomOpening(0, 400)];
    const slam = MASS_HIT_SPEED + 50;

    const inGap = containAgainstOpenings(
      { x: 200, y: 4, vx: 0, vy: -slam, restingOn: null },
      openings,
    );
    expect(inGap.hit).toBe(false);
    expect(inGap.body.y).toBe(4);

    const outside = containAgainstOpenings(
      { x: 600, y: 4, vx: 0, vy: -slam, restingOn: null },
      openings,
    );
    expect(outside.hit).toBe(true);
    expect(outside.body.y).toBeGreaterThanOrEqual(SHIP_R - 0.01);

    // Left wall stays sealed even beside a bottom gap.
    const left = containAgainstOpenings(
      { x: -10, y: WORLD_H * 0.04, vx: -slam, vy: 0, restingOn: null },
      openings,
    );
    expect(left.hit).toBe(true);
    expect(left.body.x).toBeGreaterThanOrEqual(SHIP_R - 0.01);
  });

  it("fires a bottom gap only when a falling hull touches the floor inside it", () => {
    const gap = bottomOpening(0, 400);
    expect(touchedOpening(gap, { x: 200, y: SHIP_R, vy: -100 })).toBe(true);
    expect(touchedOpening(gap, { x: 200, y: SHIP_R * 0.2, vy: 0 })).toBe(true);
    // Rising through the floor (rise-in enter) does not fire.
    expect(touchedOpening(gap, { x: 200, y: 10, vy: 900 })).toBe(false);
    // Hull still above the floor.
    expect(touchedOpening(gap, { x: 200, y: SHIP_R + 5, vy: -100 })).toBe(false);
    // Outside the span.
    expect(touchedOpening(gap, { x: 450, y: 0, vy: -100 })).toBe(false);
    // Top / right exits never fire on touch.
    const notch = exitZoneFor("notch-calibrate");
    if (!notch) throw new Error("expected notch exit");
    expect(
      touchedOpening(openingFromExitZone(notch), { x: 450, y: 0, vy: -100 }),
    ).toBe(false);
  });
});

