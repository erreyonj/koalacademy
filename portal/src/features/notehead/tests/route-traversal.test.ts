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
  LAUNCH_FLOOR_GAP,
  markCrashSeen,
  matchTouchRoute,
  matchTravelRoute,
  notchReturnEnter,
  PROGRESSION,
  repairForBeat,
  simulateFlight,
  STAIRS_FLOOR_GAP,
  stairsFallEnter,
  stepPolicyFor,
  travelRoutesFor,
  ZIG_FLOOR_GAP_LEFT,
  ZIG_FLOOR_GAP_RIGHT,
  zigFallEnter,
  zigJumpFromLeftEnter,
} from "../modules/progress";
import {
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

/** A falling ship whose hull is touching the frame floor at world x. */
const floorTouch = (x: number) => ({ x, y: SHIP_R * 0.5, vy: -400 });

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
    const route = matchTravelRoute("notch-calibrate", body);
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
    const route = matchTravelRoute("launch-bridge", body);
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

  it("6. stairs-right → zig-1 (same jump-in as the warp loop)", () => {
    const body = { x: WORLD_W + 140, y: 1100 };
    const route = matchTravelRoute("stairs-anach", body);
    expect(route?.id).toBe("stairs-right");
    expect(route?.to).toBe("zig-1");
    expect(route?.mode).toBe("forward");
    expect(PROGRESSION["zig-1"].enter(ANACH)).toEqual(zigJumpFromLeftEnter());
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

  it("7. zig-up → launch-tail through the top exit", () => {
    const zone = exitZoneFor("zig-1");
    expect(zone).not.toBeNull();
    const opening = openingFromExitZone(zone!);
    const body = {
      x: (opening.x0 + opening.x1) / 2,
      y: WORLD_H + 250,
    };
    const route = matchTravelRoute("zig-1", body);
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

const CATCH = { breakSpeed: 0, catchBands: true };

describe("v.04 route traversal — bottom-edge returns & warp", () => {
  it("8. bridge floor touch → notch-calibrate fall enter", () => {
    const route = matchTouchRoute("launch-bridge", floorTouch(450));
    expect(route?.id).toBe("bridge-return-notch");
    expect(route?.to).toBe("notch-calibrate");
    expect(route?.mode).toBe("return");
    expect(route?.fallIn).toBe(true);
    expect(route?.enterBody).toBe(notchReturnEnter);
    const enter = route!.enterBody!();
    expect(enter.vy).toBeLessThan(0);
    expect(enter.y).toBeGreaterThan(WORLD_H * 0.5);
  });

  it("9. stairs floor touch → launch-bridge, falls onto the band", () => {
    const route = matchTouchRoute("stairs-anach", floorTouch(200));
    expect(route?.id).toBe("stairs-return-bridge");
    expect(route?.to).toBe("launch-bridge");
    expect(route?.enterBody).toBe(bridgeFallEnter);
    const flight = simulateFlight({
      regionId: "launch",
      body: bridgeFallEnter(),
      policy: CATCH,
      beatId: "launch-bridge",
    });
    expect(flight.landedOn).toBe(LAUNCH_BAND.id);
  });

  it("10. zig lower-left floor touch → stairs, lands on the band's right edge", () => {
    const route = matchTouchRoute("zig-1", floorTouch(150));
    expect(route?.id).toBe("zig-return-stairs");
    expect(route?.to).toBe("stairs-anach");
    expect(route?.enterBody).toBe(stairsFallEnter);
    const enter = stairsFallEnter();
    expect(enter.x).toBeGreaterThan((STAIR_BAND.x0 + STAIR_BAND.x1) / 2);
    expect(enter.x).toBeLessThanOrEqual(STAIR_BAND.x1);
    const flight = simulateFlight({
      regionId: "stairs",
      body: enter,
      policy: CATCH,
      beatId: "stairs-anach",
    });
    expect(flight.landedOn).toBe(STAIR_BAND.id);
  });

  it("11. zig lower-right floor touch warps back in from the left gap onto the peak", () => {
    const route = matchTouchRoute("zig-1", floorTouch(780));
    expect(route?.id).toBe("zig-warp-loop");
    expect(route?.to).toBe("zig-1");
    expect(route?.mode).toBe("warp");
    expect(route?.softReentry).toBe(true);
    expect(route?.enterBody).toBe(zigJumpFromLeftEnter);
    const enter = zigJumpFromLeftEnter();
    // Emerges from the left floor gap, rising, so that gap's exit stays quiet.
    expect(enter.x).toBeGreaterThanOrEqual(ZIG_FLOOR_GAP_LEFT.x0);
    expect(enter.x).toBeLessThanOrEqual(ZIG_FLOOR_GAP_LEFT.x1);
    expect(matchTouchRoute("zig-1", enter)).toBeNull();
    const flight = simulateFlight({
      regionId: "zig",
      body: enter,
      policy: CATCH,
      beatId: "zig-1",
    });
    expect(flight.landedOn).toBe("zig-peak");
  });

  it("12. tail floor touch → zig-1, falls onto the peak", () => {
    const route = matchTouchRoute("launch-tail", floorTouch(450));
    expect(route?.id).toBe("tail-return-zig");
    expect(route?.to).toBe("zig-1");
    expect(route?.enterBody).toBe(zigFallEnter);
    const flight = simulateFlight({
      regionId: "zig",
      body: zigFallEnter(),
      policy: CATCH,
      beatId: "zig-1",
    });
    expect(flight.landedOn).toBe("zig-peak");
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
        "zig-1:zig-return-stairs->stairs-anach",
        "zig-1:zig-up->launch-tail",
        "zig-1:zig-warp-loop->zig-1",
      ].sort(),
    );
  });
});

describe("v.04 route traversal — negatives (sealed)", () => {
  it("rise-in enter bodies never fire a floor exit", () => {
    for (const beatId of ["launch-bridge", "stairs-anach", "zig-1"] as const) {
      const enter = PROGRESSION[beatId].enter(ANACH);
      expect(matchTouchRoute(beatId, enter)).toBeNull();
    }
  });

  it("rising at the floor does not travel", () => {
    expect(
      matchTouchRoute("launch-bridge", { x: 450, y: SHIP_R * 0.5, vy: 400 }),
    ).toBeNull();
  });

  it("falling at the floor outside a gap does not travel", () => {
    expect(
      matchTouchRoute("launch-bridge", floorTouch(LAUNCH_FLOOR_GAP.x1 + 60)),
    ).toBeNull();
    expect(
      matchTouchRoute("stairs-anach", floorTouch(STAIRS_FLOOR_GAP.x1 + 60)),
    ).toBeNull();
    // Under the Zig peak island, between the two floor gaps.
    expect(
      matchTouchRoute(
        "zig-1",
        floorTouch((ZIG_FLOOR_GAP_LEFT.x1 + ZIG_FLOOR_GAP_RIGHT.x0) / 2),
      ),
    ).toBeNull();
    // Notch has no floor exit.
    expect(matchTouchRoute("notch-calibrate", floorTouch(450))).toBeNull();
  });

  it("left / right edges no longer carry exits (except the Stairs right exit)", () => {
    expect(
      matchTravelRoute("launch-bridge", { x: -130, y: WORLD_H * 0.04 }),
    ).toBeNull();
    expect(
      matchTravelRoute("launch-tail", { x: -130, y: WORLD_H * 0.04 }),
    ).toBeNull();
    expect(matchTravelRoute("zig-1", { x: -130, y: WORLD_H * 0.05 })).toBeNull();
    expect(
      matchTravelRoute("zig-1", { x: WORLD_W + 140, y: WORLD_H * 0.05 }),
    ).toBeNull();
    expect(
      matchTravelRoute("stairs-anach", { x: -130, y: WORLD_H * 0.2 }),
    ).toBeNull();
  });

  it("off-gap OOB does not match a travel route", () => {
    // Off the top outside Notch exit shaft.
    expect(
      matchTravelRoute("notch-calibrate", { x: 40, y: WORLD_H + 250 }),
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
});

