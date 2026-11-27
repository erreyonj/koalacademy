import { describe, expect, it } from "vitest";
import {
  bottomOpening,
  containAgainstOpenings,
  leftFrameThroughOpening,
  touchedOpening,
  type FrameOpening,
} from "../modules/exit-zone";
import { MASS_HIT_SPEED, SHIP_R, WORLD_H, WORLD_W } from "../modules/sim";
import { getRoute } from "../routes/registry";

const route = getRoute();

const up: FrameOpening = { facing: "up", x0: 300, x1: 600, y0: WORLD_H, y1: WORLD_H };
const right: FrameOpening = { facing: "right", x0: WORLD_W, x1: WORLD_W, y0: 900, y1: 1500 };

describe("exit openings", () => {
  it("builds one opening and one door per authored exit", () => {
    for (const level of route.levels) {
      const scene = route.scenes.get(level.id)!;
      expect(scene.openings).toHaveLength(level.exits.length);
      expect(scene.doors).toHaveLength(level.exits.length);
      level.exits.forEach((exit, index) => {
        expect(scene.openings[index]!.facing).toBe(exit.facing);
        expect(scene.doors[index]?.to ?? null).toBe(exit.to ?? null);
      });
    }
  });

  it("clears only when leaving the frame through an upward opening", () => {
    expect(leftFrameThroughOpening(up, { x: 450, y: WORLD_H + 250 })).toBe(true);
    // Still on-screen below the barrier.
    expect(leftFrameThroughOpening(up, { x: 450, y: WORLD_H - 40 })).toBe(false);
    // Off the top but outside the gap.
    expect(leftFrameThroughOpening(up, { x: 40, y: WORLD_H + 250 })).toBe(false);
    // Off the bottom does not count.
    expect(leftFrameThroughOpening(up, { x: 450, y: -300 })).toBe(false);
  });

  it("clears only when leaving the frame through a rightward opening", () => {
    expect(leftFrameThroughOpening(right, { x: WORLD_W + 140, y: 1100 })).toBe(true);
    expect(leftFrameThroughOpening(right, { x: WORLD_W - 20, y: 1100 })).toBe(false);
    expect(leftFrameThroughOpening(right, { x: WORLD_W + 140, y: 80 })).toBe(false);
  });

  it("seals every edge except the opening", () => {
    const slam = MASS_HIT_SPEED + 50;
    const soft = MASS_HIT_SPEED * 0.25;
    const openings = [up, right];

    // Soft bump: still sealed, but not a hull-taxing hit.
    const softTop = containAgainstOpenings(
      { x: 40, y: WORLD_H + 20, vx: 0, vy: soft, restingOn: null },
      openings,
    );
    expect(softTop.hit).toBe(false);
    expect(softTop.body.y).toBeLessThanOrEqual(WORLD_H - SHIP_R + 0.01);
    expect(softTop.body.vy).toBe(0);

    const offTop = containAgainstOpenings(
      { x: 40, y: WORLD_H + 20, vx: 0, vy: slam, restingOn: null },
      openings,
    );
    expect(offTop.hit).toBe(true);
    expect(offTop.body.y).toBeLessThanOrEqual(WORLD_H - SHIP_R + 0.01);

    const throughGap = containAgainstOpenings(
      { x: 450, y: WORLD_H + 20, vx: 0, vy: slam, restingOn: null },
      openings,
    );
    expect(throughGap.hit).toBe(false);
    expect(throughGap.body.y).toBe(WORLD_H + 20);

    const offRight = containAgainstOpenings(
      { x: WORLD_W + 20, y: 80, vx: slam, vy: 0, restingOn: null },
      openings,
    );
    expect(offRight.hit).toBe(true);
    expect(offRight.body.x).toBeLessThanOrEqual(WORLD_W - SHIP_R + 0.01);

    const rightGap = containAgainstOpenings(
      { x: WORLD_W + 20, y: 1100, vx: slam, vy: 0, restingOn: null },
      openings,
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
    expect(touchedOpening(up, { x: 450, y: 0, vy: -100 })).toBe(false);
    expect(touchedOpening(right, { x: 450, y: 0, vy: -100 })).toBe(false);
  });
});

