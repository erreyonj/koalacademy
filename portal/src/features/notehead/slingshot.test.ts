import { describe, expect, it } from "vitest";
import {
  analyticApexY,
  beginFlight,
  evaluateLaunch,
  pullToLaunchSpeed,
  stepFlight,
} from "./slingshot";
import { C_MAJOR_OCTAVE } from "./world";

const SCALE_LEN = C_MAJOR_OCTAVE.length;
const GRAVITY = 18;

function flyUntilLanded(launchSpeed: number) {
  let state = beginFlight(launchSpeed);
  const dt = 1 / 120;
  for (let i = 0; i < 5000 && state.phase === "flight"; i++) {
    state = stepFlight(state, dt, GRAVITY, SCALE_LEN);
  }
  return state;
}

describe("pullToLaunchSpeed", () => {
  it("maps empty pull to zero and full pull to max", () => {
    expect(pullToLaunchSpeed(0, 1.6, 14)).toBe(0);
    expect(pullToLaunchSpeed(1.6, 1.6, 14)).toBe(14);
    expect(pullToLaunchSpeed(0.8, 1.6, 14)).toBe(7);
  });
});

describe("evaluateLaunch / apex hit", () => {
  it("scores an apex hit when the peak lands on the target degree", () => {
    const target = 4;
    const speed = Math.sqrt(2 * GRAVITY * target);
    const apexY = analyticApexY(speed, GRAVITY);
    expect(apexY).toBeCloseTo(target, 5);
    const result = evaluateLaunch(apexY, target, SCALE_LEN);
    expect(result.apexDegree).toBe(target);
    expect(result.hit).toBe(true);
  });

  it("undershoot misses when the apex stays below the target", () => {
    const target = 5;
    const apexY = 2.2;
    const result = evaluateLaunch(apexY, target, SCALE_LEN);
    expect(result.apexDegree).toBe(2);
    expect(result.hit).toBe(false);
  });

  it("overshoot crosses the target on the way up but still misses", () => {
    const target = 3;
    const speed = Math.sqrt(2 * GRAVITY * 6);
    const state = flyUntilLanded(speed);
    expect(state.phase).toBe("landed");
    expect(state.apexY).toBeGreaterThan(target);

    const crossed = new Set<number>();
    let probe = beginFlight(speed);
    const dt = 1 / 120;
    while (probe.phase === "flight") {
      probe = stepFlight(probe, dt, GRAVITY, SCALE_LEN);
      for (const d of probe.crossedUp) crossed.add(d);
    }
    expect(crossed.has(target)).toBe(true);

    const result = evaluateLaunch(state.apexY, target, SCALE_LEN);
    expect(result.apexDegree).toBeGreaterThan(target);
    expect(result.hit).toBe(false);
  });
});
