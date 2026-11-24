import { describe, expect, it } from "vitest";
import {
  aimModeForBeat,
  bridgeFallEnter,
  bridgeReturnYMax,
  bridgeRiseEnter,
  BRIDGE_RETURN_Y_FRAC,
  emptyRouteMemory,
  leftThroughBridgeReturnExit,
  markCrashSeen,
  markStorySeen,
  matchTravelRoute,
  matchZigCornerIntent,
  openingsForBeat,
  PLAYABLE_BEATS,
  PROGRESSION,
  stairsFallEnter,
  stairsRiseEnter,
  travelRoutesFor,
  zigFallEnter,
  zigJumpFromLeftEnter,
  zigRiseEnter,
  ZIG_CORNER_Y_FRAC,
} from "../modules/progress";
import { SHIP_R, STAIR_BAND, WORLD_H, WORLD_W } from "../modules/sim";

describe("region travel", () => {
  it("keeps crash out of the playable region list", () => {
    expect(PLAYABLE_BEATS).not.toContain("notch-crash");
    expect(PLAYABLE_BEATS).toContain("launch-teach");
    expect(PLAYABLE_BEATS).toContain("notch-calibrate");
    expect(PLAYABLE_BEATS).toContain("launch-bridge");
    expect(PLAYABLE_BEATS).toContain("launch-tail");
  });

  it("uses vertical aim only on Launch teach; Bridge and Tail are free", () => {
    expect(aimModeForBeat("launch-teach")).toBe("vertical");
    expect(aimModeForBeat("launch-tail")).toBe("free");
    expect(aimModeForBeat("launch-bridge")).toBe("free");
    expect(aimModeForBeat("notch-calibrate")).toBe("free");
  });

  it("Bridge → Notch only through the lower-left gap (x left, y in bottom 8%)", () => {
    expect(BRIDGE_RETURN_Y_FRAC).toBe(0.08);
    expect(bridgeReturnYMax()).toBeCloseTo(WORLD_H * 0.08);

    // Rise-from-below enter must NOT count as a return exit.
    const enter = PROGRESSION["launch-bridge"].enter({
      anachrometer: true,
      tails: [],
    });
    expect(leftThroughBridgeReturnExit(enter)).toBe(false);

    expect(
      leftThroughBridgeReturnExit({ x: -130, y: WORLD_H * 0.04 }),
    ).toBe(true);
    expect(
      leftThroughBridgeReturnExit({ x: -130, y: 0 }),
    ).toBe(true);
    // Too high on the left edge.
    expect(
      leftThroughBridgeReturnExit({ x: -130, y: WORLD_H * 0.2 }),
    ).toBe(false);
    // Below the world (straight bottom OOB) — not the corner gap.
    expect(
      leftThroughBridgeReturnExit({ x: -130, y: -40 }),
    ).toBe(false);
    // Still on-screen left.
    expect(
      leftThroughBridgeReturnExit({ x: 20, y: WORLD_H * 0.04 }),
    ).toBe(false);
  });

  it("opens Bridge top + lower-left so return is not sealed shut", () => {
    const openings = openingsForBeat("launch-bridge");
    expect(openings.map((o) => o.facing).sort()).toEqual([
      "left-bottom",
      "up",
    ]);
    const seated = matchTravelRoute(
      "launch-bridge",
      { x: -130, y: WORLD_H * 0.04 },
      true,
    );
    expect(seated?.id).toBe("bridge-return-notch");
    expect(seated?.to).toBe("notch-calibrate");
    // Unarmed until the band is seated.
    expect(
      matchTravelRoute(
        "launch-bridge",
        { x: -130, y: WORLD_H * 0.04 },
        false,
      ),
    ).toBeNull();
  });

  it("Stairs left return → Launch Bridge with fall-from-above; right stays forward to Zig", () => {
    const routes = travelRoutesFor("stairs-anach");
    expect(routes.map((r) => r.id).sort()).toEqual([
      "stairs-return-bridge",
      "stairs-right",
      "stairs-warp-zig",
    ]);
    const left = matchTravelRoute(
      "stairs-anach",
      { x: -130, y: WORLD_H * 0.2 },
      false,
    );
    expect(left?.to).toBe("launch-bridge");
    expect(left?.mode).toBe("return");
    expect(left?.enterBody).toBe(bridgeFallEnter);
    const fall = left!.enterBody!();
    expect(fall.y).toBeGreaterThan(WORLD_H * 0.5);
    expect(fall.vy).toBeLessThan(0);
    // Forward Bridge enter still rises from below.
    expect(bridgeRiseEnter().vy).toBeGreaterThan(0);

    const right = matchTravelRoute(
      "stairs-anach",
      { x: WORLD_W + 140, y: 1100 },
      false,
    );
    expect(right?.to).toBe("zig-1");
    expect(right?.mode).toBe("forward");
  });

  it("Stairs lower-right warp → Zig jumps in from the left lower barrier", () => {
    expect(ZIG_CORNER_Y_FRAC).toBe(0.14);
    const warp = matchTravelRoute(
      "stairs-anach",
      { x: WORLD_W + 140, y: WORLD_H * 0.05 },
      false,
    );
    expect(warp?.id).toBe("stairs-warp-zig");
    expect(warp?.enterBody).toBe(zigJumpFromLeftEnter);
    const enter = warp!.enterBody!();
    expect(enter.x).toBeLessThan(WORLD_W * 0.2);
    expect(enter.vx).toBeGreaterThan(0);
    expect(enter.vy).toBeGreaterThan(0);
  });

  it("Zig lower-left falls onto Stairs band right edge; lower-right warps in from left", () => {
    const facings = openingsForBeat("zig-1")
      .map((o) => o.facing)
      .sort();
    expect(facings).toEqual(["left-bottom", "right-bottom", "up"]);

    const left = matchTravelRoute(
      "zig-1",
      { x: -130, y: WORLD_H * 0.05 },
      false,
    );
    expect(left?.id).toBe("zig-return-stairs-left");
    expect(left?.enterBody).toBe(stairsFallEnter);
    const fall = left!.enterBody!();
    expect(fall.x).toBeGreaterThan(STAIR_BAND.x0);
    expect(fall.x).toBeLessThanOrEqual(STAIR_BAND.x1);
    // Prefer the right edge of the approach band.
    expect(fall.x).toBeGreaterThan((STAIR_BAND.x0 + STAIR_BAND.x1) / 2);
    expect(fall.y).toBeGreaterThan(WORLD_H * 0.5);
    expect(fall.vy).toBeLessThan(0);
    expect(stairsRiseEnter().vy).toBeGreaterThan(0);

    const right = matchTravelRoute(
      "zig-1",
      { x: WORLD_W + 140, y: WORLD_H * 0.05 },
      false,
    );
    expect(right?.id).toBe("zig-warp-loop");
    expect(right?.softReentry).toBe(true);
    expect(right?.enterBody).toBe(zigJumpFromLeftEnter);
    const jump = right!.enterBody!();
    expect(jump.x).toBeLessThan(WORLD_W * 0.15);
    expect(jump.vx).toBeGreaterThan(0);
    expect(jump.vy).toBeGreaterThan(0);
  });

  it("fires Zig corner exits when pressed into the lower pockets", () => {
    const left = matchZigCornerIntent({
      x: SHIP_R,
      y: WORLD_H * 0.05,
      vx: -20,
      vy: 0,
    });
    expect(left?.id).toBe("zig-return-stairs-left");

    const right = matchZigCornerIntent({
      x: WORLD_W - SHIP_R,
      y: WORLD_H * 0.05,
      vx: 20,
      vy: 0,
    });
    expect(right?.id).toBe("zig-warp-loop");

    // Mid-height does not count.
    expect(
      matchZigCornerIntent({
        x: SHIP_R,
        y: WORLD_H * 0.5,
        vx: -20,
        vy: 0,
      }),
    ).toBeNull();
  });

  it("Tail free-aim return through lower-left falls into Zig", () => {
    const openings = openingsForBeat("launch-tail");
    expect(openings).toHaveLength(1);
    expect(openings[0]?.facing).toBe("left-bottom");
    const route = matchTravelRoute(
      "launch-tail",
      { x: -130, y: WORLD_H * 0.04 },
      true,
    );
    expect(route?.to).toBe("zig-1");
    expect(route?.enterBody).toBe(zigFallEnter);
    const fall = route!.enterBody!();
    expect(fall.y).toBeGreaterThan(WORLD_H * 0.5);
    expect(fall.vy).toBeLessThan(0);
    expect(zigRiseEnter().vy).toBeGreaterThan(0);
  });

  it("tracks crash and story visits in route memory", () => {
    let memory = emptyRouteMemory();
    memory = markCrashSeen(memory);
    expect(memory.crashSeen).toBe(true);
    memory = markStorySeen(memory, "notch-calibrate");
    memory = markStorySeen(memory, "notch-calibrate");
    expect(memory.storySeen).toEqual(["notch-calibrate"]);
  });
});
