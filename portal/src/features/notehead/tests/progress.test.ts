import { describe, expect, it } from "vitest";
import {
  BREAK_SPEED,
  FIXED_DT,
  LAUNCH_BAND,
  NOTCH_BLOCK,
  NOTCH_FLOOR,
  NOTCH_POCKET,
  PROFILES,
  STAIR_TREADS,
  flyShot,
  launchVelocity,
  pullForLaunchDegree,
  restOn,
  step,
} from "../modules/sim";
import {
  BRIDGE_POWER,
  PROGRESSION,
  applyWarp,
  bounceOffCrashBlock,
  createRoute,
  launchGoalY,
  liveLedges,
  repairForBeat,
  simulateFlight,
  stepPolicyFor,
} from "../modules/progress";
import { WARP_BAND_ID } from "../modules/anachrometer";

const easy = PROFILES.easy;

describe("route table", () => {
  it("starts on launch-teach with Anachrometer off", () => {
    const route = createRoute();
    expect(route.beatId).toBe("launch-teach");
    expect(route.repair.anachrometer).toBe(false);
    expect(route.body.restingOn).toBe(LAUNCH_BAND.id);
  });

  it("launch-teach clears when the guide is crossed and the band breaks", () => {
    const beat = PROGRESSION["launch-teach"];
    const body = beat.enter({ anachrometer: false, tails: [] });
    // One degree above the guide so discrete steps still cross goal height.
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
    expect(flight.apexY).toBeGreaterThan(launchGoalY());
    expect(flight.crossedGoal).toBe(true);
    expect(flight.brokeBand).toBe(true);
    const result = beat.evaluate(flight, { anachrometer: false, tails: [] });
    expect(result.cleared).toBe(true);
    expect(beat.next).toBe("notch-crash");
  });

  it("launch-teach soft-lands when the guide was never crossed", () => {
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
    expect(flight.restingOn).toBe(LAUNCH_BAND.id);
    expect(beat.evaluate(flight, { anachrometer: false, tails: [] }).cleared).toBe(
      false,
    );
  });

  it("a hard fall does not rest on a band when catchBands is false", () => {
    let body = {
      x: (LAUNCH_BAND.x0 + LAUNCH_BAND.x1) / 2,
      y: LAUNCH_BAND.y + 900,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    };
    let landed: string | null = null;
    for (let i = 0; i < 400; i++) {
      const result = step(body, [LAUNCH_BAND], FIXED_DT, undefined, {
        breakSpeed: BREAK_SPEED,
        catchBands: false,
      });
      body = result.body;
      if (result.landedId) {
        landed = result.landedId;
        break;
      }
      if (body.y < LAUNCH_BAND.y - 40) break;
    }
    expect(landed).toBeNull();
    expect(body.restingOn).toBeNull();
    expect(body.y).toBeLessThan(LAUNCH_BAND.y);
  });

  it("notch-crash hits the block, bounces, and unlocks Anachrometer on the floor", () => {
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
    expect(visited).toContain(NOTCH_BLOCK.id);
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
  });

  it("sandbox jumps after the crash start with Anachrometer on", () => {
    expect(repairForBeat("launch-teach").anachrometer).toBe(false);
    expect(repairForBeat("notch-crash").anachrometer).toBe(false);
    expect(repairForBeat("notch-calibrate").anachrometer).toBe(true);
    expect(repairForBeat("stairs-anach").anachrometer).toBe(true);
  });

  it("notch-calibrate clears only after Borealis and the exit gate", () => {
    const beat = PROGRESSION["notch-calibrate"];
    const repair = { anachrometer: true, tails: [] };
    const base = {
      apexY: 0,
      crossedGoal: false,
      brokeBand: false,
      visited: [NOTCH_FLOOR.id, NOTCH_POCKET.id, NOTCH_BLOCK.id],
      landedOn: null as string | null,
      restingOn: null as string | null,
    };
    const waiting = beat.evaluate({ ...base, crossedExit: false }, repair);
    expect(waiting.cleared).toBe(false);
    expect(waiting.hint).toMatch(/exit/i);
    const cleared = beat.evaluate({ ...base, crossedExit: true }, repair);
    expect(cleared.cleared).toBe(true);
    expect(beat.next).toBe("launch-bridge");
  });

  it("launch-bridge clears on a full-power shot through the exit", () => {
    const beat = PROGRESSION["launch-bridge"];
    const repair = { anachrometer: true, tails: [] };
    const waiting = beat.evaluate(
      {
        apexY: launchGoalY() + 40,
        crossedGoal: true,
        brokeBand: false,
        crossedExit: false,
        visited: [],
        landedOn: null,
        restingOn: null,
        power: BRIDGE_POWER,
      },
      repair,
    );
    expect(waiting.cleared).toBe(false);
    const result = beat.evaluate(
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
      repair,
    );
    expect(result.cleared).toBe(true);
    expect(beat.next).toBe("stairs-anach");
  });

  it("stairs-anach clears after Borealis and the right-side exit", () => {
    const beat = PROGRESSION["stairs-anach"];
    const ids = STAIR_TREADS.map((tread) => tread.id);
    const waiting = beat.evaluate(
      {
        apexY: 0,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: false,
        visited: ids,
        landedOn: "s1",
        restingOn: null,
      },
      { anachrometer: true, tails: [] },
    );
    expect(waiting.cleared).toBe(false);
    expect(waiting.hint).toMatch(/exit/i);
    const cleared = beat.evaluate(
      {
        apexY: 0,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: true,
        visited: ids,
        landedOn: "s1",
        restingOn: null,
      },
      { anachrometer: true, tails: [] },
    );
    expect(cleared.cleared).toBe(true);
    expect(beat.next).toBe("zig-1");
  });

  it("zig-1 clears after Borealis and the top exit", () => {
    const beat = PROGRESSION["zig-1"];
    expect(PROGRESSION["stairs-anach"].next).toBe("zig-1");
    const waiting = beat.evaluate(
      {
        apexY: 0,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: false,
        visited: ["zig-peak", "zig-left", "zig-right"],
        landedOn: "zig-right",
        restingOn: null,
      },
      { anachrometer: true, tails: [] },
    );
    expect(waiting.cleared).toBe(false);
    expect(waiting.hint).toMatch(/exit/i);
    const cleared = beat.evaluate(
      {
        apexY: 0,
        crossedGoal: false,
        brokeBand: false,
        crossedExit: true,
        visited: ["zig-peak", "zig-left", "zig-right"],
        landedOn: "zig-right",
        restingOn: null,
      },
      { anachrometer: true, tails: [] },
    );
    expect(cleared.cleared).toBe(true);
    expect(beat.next).toBeNull();
    expect(beat.regionId).toBe("zig");
  });

  it("a sloped tread visit lands then slides off without staying seated", () => {
    const shot = flyShot("stairs", easy, { power: 0.88, angle: 0.22 });
    expect(shot.visited.length).toBeGreaterThan(0);
    expect(shot.body.restingOn === null || shot.body.restingOn === "band").toBe(
      true,
    );
  });

  it("warp band is included in live ledges", () => {
    const { warp } = applyWarp(restOn(LAUNCH_BAND));
    const ledges = liveLedges("launch", warp);
    expect(ledges.some((ledge) => ledge.id === WARP_BAND_ID)).toBe(true);
  });
});
