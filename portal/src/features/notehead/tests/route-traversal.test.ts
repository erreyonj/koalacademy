/**
 * v.04 route traversal — edge coverage of the travel graph.
 * One case per legal edge + negatives that keep illegal exits sealed.
 */
import { describe, expect, it } from "vitest";
import {
  exitZoneFor,
  leftFrameThroughExit,
  openingFromExitZone,
} from "../modules/exit-zone";
import {
  bounceOffCrashBlock,
  BRIDGE_POWER,
  bridgeFallEnter,
  createRoute,
  emptyRouteMemory,
  launchGoalY,
  liveLedges,
  markCrashSeen,
  matchTravelRoute,
  matchZigCornerIntent,
  notchReturnEnter,
  PROGRESSION,
  repairForBeat,
  simulateFlight,
  stairsFallEnter,
  stepPolicyFor,
  travelRoutesFor,
  zigFallEnter,
  zigJumpFromLeftEnter,
  zigRiseEnter,
  ZIG_CORNER_Y_FRAC,
} from "../modules/progress";
import {
  BREAK_SPEED,
  FIXED_DT,
  LAUNCH_BAND,
  NOTCH_BLOCK,
  NOTCH_FLOOR,
  SHIP_R,
  STAIR_BAND,
  WORLD_H,
  WORLD_W,
  launchVelocity,
  pullForLaunchDegree,
  step,
} from "../modules/sim";

const ANACH = { anachrometer: true, tails: [] as const };

describe("v.04 route traversal — forward spine", () => {
  it("1. starts on launch-teach with Anachrometer off", () => {
    const route = createRoute();
    expect(route.beatId).toBe("launch-teach");
    expect(route.repair.anachrometer).toBe(false);
    expect(route.body.restingOn).toBe(LAUNCH_BAND.id);
  });

  it("2. launch-teach → notch-crash when guide crosses and band breaks", () => {
    const beat = PROGRESSION["launch-teach"];
    const body = beat.enter({ anachrometer: false, tails: [] });
    const power = pullForLaunchDegree(5);
    const velocity = launchVelocity("launch", LAUNCH_BAND.id, {
      power,
      angle: 0,
    });
    const flight = simulateFlight({
      regionId: "launch",
      body: { ...body, ...velocity, restingOn: null },
      policy: stepPolicyFor(beat, { anachrometer: false, tails: [] }),
      beatId: "launch-teach",
      power,
    });
    expect(flight.crossedGoal).toBe(true);
    expect(flight.brokeBand).toBe(true);
    expect(beat.evaluate(flight, { anachrometer: false, tails: [] }).cleared).toBe(
      true,
    );
    expect(beat.next).toBe("notch-crash");
  });

  it("3. notch-crash → notch-calibrate unlocks Anachrometer and marks crashSeen", () => {
    const beat = PROGRESSION["notch-crash"];
    const repair = { anachrometer: false, tails: [] };
    let body = beat.enter(repair);
    const visited: string[] = [];
    let landedOn: string | null = null;
    for (let frame = 0; frame < 2000; frame++) {
      const result = step(
        body,
        liveLedges("notch", null),
        FIXED_DT,
        undefined,
        stepPolicyFor(beat, repair),
      );
      body = result.body;
      if (!result.landedId) {
        if (body.y < -240) break;
        continue;
      }
      if (!visited.includes(result.landedId)) visited.push(result.landedId);
      if (result.landedId === NOTCH_BLOCK.id && body.restingOn) {
        body = bounceOffCrashBlock(body);
        continue;
      }
      if (body.restingOn) {
        landedOn = result.landedId;
        break;
      }
    }
    expect(landedOn).toBe(NOTCH_FLOOR.id);
    const result = beat.evaluate(
      {
        apexY: body.y,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: false,
        visited,
        landedOn,
        restingOn: body.restingOn,
      },
      repair,
    );
    expect(result.cleared).toBe(true);
    expect(result.repair.anachrometer).toBe(true);
    expect(beat.next).toBe("notch-calibrate");
    expect(markCrashSeen(emptyRouteMemory()).crashSeen).toBe(true);
    expect(repairForBeat("notch-calibrate").anachrometer).toBe(true);
  });

  it("4. notch-up → launch-bridge through the top exit", () => {
    const zone = exitZoneFor("notch-calibrate");
    expect(zone).not.toBeNull();
    const body = { x: 450, y: WORLD_H + 250 };
    expect(leftFrameThroughExit(zone!, body)).toBe(true);
    const route = matchTravelRoute("notch-calibrate", body, false);
    expect(route?.id).toBe("notch-up");
    expect(route?.to).toBe("launch-bridge");
    expect(route?.mode).toBe("forward");
    const cleared = PROGRESSION["notch-calibrate"].evaluate(
      {
        apexY: 0,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: true,
        visited: [NOTCH_FLOOR.id],
        landedOn: null,
        restingOn: null,
      },
      ANACH,
    );
    expect(cleared.cleared).toBe(true);
    expect(PROGRESSION["notch-calibrate"].next).toBe("launch-bridge");
  });

  it("5. bridge-up → stairs-anach on full-power top exit", () => {
    const zone = exitZoneFor("launch-bridge");
    expect(zone).not.toBeNull();
    const body = { x: 450, y: WORLD_H + 250 };
    expect(leftFrameThroughExit(zone!, body)).toBe(true);
    const route = matchTravelRoute("launch-bridge", body, true);
    expect(route?.id).toBe("bridge-up");
    expect(route?.to).toBe("stairs-anach");
    expect(route?.mode).toBe("forward");
    const cleared = PROGRESSION["launch-bridge"].evaluate(
      {
        apexY: launchGoalY() + 40,
        crossedGoal: true,
        brokeBand: false,
        crossedExit: true,
        visited: [],
        landedOn: null,
        restingOn: null,
        power: BRIDGE_POWER,
      },
      ANACH,
    );
    expect(cleared.cleared).toBe(true);
    expect(PROGRESSION["launch-bridge"].next).toBe("stairs-anach");
  });

  it("6. stairs-right → zig-1 (rise enter)", () => {
    const body = { x: WORLD_W + 140, y: 1100 };
    const route = matchTravelRoute("stairs-anach", body, false);
    expect(route?.id).toBe("stairs-right");
    expect(route?.to).toBe("zig-1");
    expect(route?.mode).toBe("forward");
    expect(zigRiseEnter().vy).toBeGreaterThan(0);
    const cleared = PROGRESSION["stairs-anach"].evaluate(
      {
        apexY: 0,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: true,
        visited: [],
        landedOn: "s1",
        restingOn: null,
      },
      ANACH,
    );
    expect(cleared.cleared).toBe(true);
    expect(PROGRESSION["stairs-anach"].next).toBe("zig-1");
  });

  it("7. stairs-warp-zig → zig-1 (jump-in from left barrier)", () => {
    const body = { x: WORLD_W + 140, y: WORLD_H * 0.05 };
    const route = matchTravelRoute("stairs-anach", body, false);
    expect(route?.id).toBe("stairs-warp-zig");
    expect(route?.to).toBe("zig-1");
    expect(route?.mode).toBe("forward");
    expect(route?.enterBody).toBe(zigJumpFromLeftEnter);
    const enter = route!.enterBody!();
    expect(enter.x).toBeLessThan(WORLD_W * 0.2);
    expect(enter.vx).toBeGreaterThan(0);
    expect(enter.vy).toBeGreaterThan(0);
  });

  it("8. zig-up → launch-tail through the top exit", () => {
    const zone = exitZoneFor("zig-1");
    expect(zone).not.toBeNull();
    const opening = openingFromExitZone(zone!);
    const body = {
      x: (opening.x0 + opening.x1) / 2,
      y: WORLD_H + 250,
    };
    const route = matchTravelRoute("zig-1", body, false);
    expect(route?.id).toBe("zig-up");
    expect(route?.to).toBe("launch-tail");
    expect(route?.mode).toBe("forward");
    const cleared = PROGRESSION["zig-1"].evaluate(
      {
        apexY: 0,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: true,
        visited: ["zig-peak"],
        landedOn: null,
        restingOn: null,
      },
      ANACH,
    );
    expect(cleared.cleared).toBe(true);
    expect(PROGRESSION["zig-1"].next).toBe("launch-tail");
  });
});

describe("v.04 route traversal — returns & warp", () => {
  it("9. bridge-return-notch (seated) → notch-calibrate fall enter", () => {
    const body = { x: -130, y: WORLD_H * 0.04 };
    const route = matchTravelRoute("launch-bridge", body, true);
    expect(route?.id).toBe("bridge-return-notch");
    expect(route?.to).toBe("notch-calibrate");
    expect(route?.mode).toBe("return");
    expect(route?.requireSeated).toBe(true);
    expect(route?.enterBody).toBe(notchReturnEnter);
    const enter = route!.enterBody!();
    expect(enter.vy).toBeLessThan(0);
    expect(enter.y).toBeGreaterThan(WORLD_H * 0.5);
  });

  it("10. stairs-return-bridge → launch-bridge fall enter", () => {
    const body = { x: -130, y: WORLD_H * 0.2 };
    const route = matchTravelRoute("stairs-anach", body, false);
    expect(route?.id).toBe("stairs-return-bridge");
    expect(route?.to).toBe("launch-bridge");
    expect(route?.mode).toBe("return");
    expect(route?.enterBody).toBe(bridgeFallEnter);
    const fall = route!.enterBody!();
    expect(fall.vy).toBeLessThan(0);
    expect(Math.abs(fall.vy)).toBeLessThan(BREAK_SPEED);
  });

  it("11. zig-return-stairs-left → stairs-anach onto band right edge", () => {
    const body = { x: -130, y: WORLD_H * 0.05 };
    const route = matchTravelRoute("zig-1", body, false);
    expect(route?.id).toBe("zig-return-stairs-left");
    expect(route?.to).toBe("stairs-anach");
    expect(route?.mode).toBe("return");
    expect(route?.enterBody).toBe(stairsFallEnter);
    const fall = route!.enterBody!();
    expect(fall.x).toBeGreaterThan((STAIR_BAND.x0 + STAIR_BAND.x1) / 2);
    expect(fall.x).toBeLessThanOrEqual(STAIR_BAND.x1);
    expect(fall.vy).toBeLessThan(0);
  });

  it("12. zig-warp-loop soft-reenters zig-1 from the left barrier", () => {
    const body = { x: WORLD_W + 140, y: WORLD_H * 0.05 };
    const route = matchTravelRoute("zig-1", body, false);
    expect(route?.id).toBe("zig-warp-loop");
    expect(route?.to).toBe("zig-1");
    expect(route?.mode).toBe("warp");
    expect(route?.softReentry).toBe(true);
    expect(route?.enterBody).toBe(zigJumpFromLeftEnter);
  });

  it("13. tail-return-zig (seated) → zig-1 fall enter", () => {
    const body = { x: -130, y: WORLD_H * 0.04 };
    const route = matchTravelRoute("launch-tail", body, true);
    expect(route?.id).toBe("tail-return-zig");
    expect(route?.to).toBe("zig-1");
    expect(route?.mode).toBe("return");
    expect(route?.requireSeated).toBe(true);
    expect(route?.enterBody).toBe(zigFallEnter);
    const fall = route!.enterBody!();
    expect(fall.vy).toBeLessThan(0);
    expect(fall.y).toBeGreaterThan(WORLD_H * 0.5);
  });

  it("enumerates every travel edge on the graph", () => {
    const edges = (
      [
        "notch-calibrate",
        "launch-bridge",
        "stairs-anach",
        "zig-1",
        "launch-tail",
      ] as const
    ).flatMap((beatId) =>
      travelRoutesFor(beatId).map((r) => `${beatId}:${r.id}->${r.to}`),
    );
    expect(edges.sort()).toEqual(
      [
        "launch-bridge:bridge-return-notch->notch-calibrate",
        "launch-bridge:bridge-up->stairs-anach",
        "launch-tail:tail-return-zig->zig-1",
        "notch-calibrate:notch-up->launch-bridge",
        "stairs-anach:stairs-return-bridge->launch-bridge",
        "stairs-anach:stairs-right->zig-1",
        "stairs-anach:stairs-warp-zig->zig-1",
        "zig-1:zig-return-stairs-left->stairs-anach",
        "zig-1:zig-up->launch-tail",
        "zig-1:zig-warp-loop->zig-1",
      ].sort(),
    );
  });
});

describe("v.04 route traversal — negatives (sealed)", () => {
  it("unseated Bridge / Tail lower-left does not travel", () => {
    const left = { x: -130, y: WORLD_H * 0.04 };
    expect(matchTravelRoute("launch-bridge", left, false)).toBeNull();
    expect(matchTravelRoute("launch-tail", left, false)).toBeNull();
  });

  it("Zig mid-height left / mid corner intent stay sealed", () => {
    expect(
      matchTravelRoute("zig-1", { x: -130, y: WORLD_H * 0.5 }, false),
    ).toBeNull();
    expect(
      matchZigCornerIntent({
        x: SHIP_R,
        y: WORLD_H * 0.5,
        vx: -20,
        vy: 0,
      }),
    ).toBeNull();
  });

  it("off-gap OOB does not match a travel route", () => {
    // Off the top outside Notch exit shaft.
    expect(
      matchTravelRoute(
        "notch-calibrate",
        { x: 40, y: WORLD_H + 250 },
        false,
      ),
    ).toBeNull();
    // Below world on Bridge left — not the corner gap.
    expect(
      matchTravelRoute("launch-bridge", { x: -130, y: -40 }, true),
    ).toBeNull();
    // Stairs left above the return corridor (~40% H).
    expect(
      matchTravelRoute(
        "stairs-anach",
        { x: -130, y: WORLD_H * 0.8 },
        false,
      ),
    ).toBeNull();
  });

  it("launch-teach soft-land (no goal cross) does not advance", () => {
    const beat = PROGRESSION["launch-teach"];
    const body = beat.enter({ anachrometer: false, tails: [] });
    const power = pullForLaunchDegree(1);
    const velocity = launchVelocity("launch", LAUNCH_BAND.id, {
      power,
      angle: 0,
    });
    const flight = simulateFlight({
      regionId: "launch",
      body: { ...body, ...velocity, restingOn: null },
      policy: stepPolicyFor(beat, { anachrometer: false, tails: [] }, false),
      beatId: "launch-teach",
      power,
    });
    expect(flight.crossedGoal).toBe(false);
    expect(flight.brokeBand).toBe(false);
    expect(beat.evaluate(flight, { anachrometer: false, tails: [] }).cleared).toBe(
      false,
    );
  });

  it("Zig corner Y band stays at the documented fraction", () => {
    expect(ZIG_CORNER_Y_FRAC).toBe(0.14);
  });
});
