import { describe, expect, it } from "vitest";
import {
  REST_GLOW,
  clearanceBelow,
  easeGlow,
  fallWarn,
  glowColor,
  glowTarget,
  trailStrength,
} from "./momentum";
import { LAUNCH_BAND, type Body } from "./sim";

const flying = (vx: number, vy: number): Body => ({
  x: 450,
  y: 800,
  vx,
  vy,
  restingOn: null,
});

const flight = {
  phase: "flight" as const,
  power: 0,
  angle: 0,
  clearance: 1e9,
  sting: 0,
};

describe("ship glow target", () => {
  it("rests with the bright edge on top, blue, with no trail", () => {
    const resting = { ...flying(0, 0), restingOn: "band" };
    const glow = glowTarget(resting, { ...flight, phase: "idle" }, 0);
    expect(glow).toEqual({ ...REST_GLOW, sting: 0 });
    expect(Math.sin(glow.angle)).toBeCloseTo(-1);
    expect(trailStrength(glow.energy)).toBe(0);
  });

  it("leads the velocity in view space, where up is -y", () => {
    const rising = glowTarget(flying(0, 2000), flight, 0);
    expect(Math.sin(rising.angle)).toBeCloseTo(-1);
    const falling = glowTarget(flying(0, -2000), flight, 0);
    expect(Math.sin(falling.angle)).toBeCloseTo(1);
    const right = glowTarget(flying(2000, 0), flight, 0);
    expect(Math.cos(right.angle)).toBeCloseTo(1);
  });

  it("is blue rising and yellow when falling hard near ground", () => {
    const rising = glowTarget(flying(300, 2000), flight, 0);
    expect(glowColor(rising)).toBe("rgb(79 193 246)");
    expect(rising.warn).toBe(0);

    const falling = glowTarget(
      flying(300, -2000),
      { ...flight, clearance: 40 },
      0,
    );
    expect(falling.warn).toBeGreaterThan(0.7);
    expect(glowColor(falling)).toBe("rgb(241 207 72)");
  });

  it("goes red on sting even while falling yellow", () => {
    const stung = glowTarget(
      flying(0, -1500),
      { ...flight, clearance: 30, sting: 1 },
      0,
    );
    expect(glowColor(stung)).toBe("rgb(238 79 74)");
  });

  it("leans into the pull while the player drags", () => {
    const resting = { ...flying(0, 0), restingOn: "band" };
    const down = glowTarget(
      resting,
      { phase: "pulling", power: 0.6, angle: 0, clearance: 0, sting: 0 },
      0,
    );
    expect(Math.sin(down.angle)).toBeCloseTo(1);
    const aimed = glowTarget(
      resting,
      { phase: "pulling", power: 0.6, angle: 0.8, clearance: 0, sting: 0 },
      0,
    );
    expect(Math.cos(aimed.angle)).toBeLessThan(0);
    expect(Math.sin(aimed.angle)).toBeGreaterThan(0);
    expect(down.lift).toBe(1);
  });
});

describe("fall warn", () => {
  it("ramps with fall speed and near clearance", () => {
    expect(fallWarn(flying(0, 100), 50)).toBe(0);
    expect(fallWarn(flying(0, -200), 800)).toBeLessThan(
      fallWarn(flying(0, -900), 40),
    );
    expect(clearanceBelow({ ...flying(450, 0), y: LAUNCH_BAND.y + 120 }, [
      LAUNCH_BAND,
    ])).toBeGreaterThan(50);
  });
});

describe("ship glow easing", () => {
  it("moves part of the way each frame and settles on the target", () => {
    const target = glowTarget(
      flying(0, -2000),
      { ...flight, clearance: 20 },
      0,
    );
    const first = easeGlow(REST_GLOW, target, 1 / 60);
    expect(first.warn).toBeGreaterThan(0);
    expect(first.warn).toBeLessThan(target.warn);

    let glow = REST_GLOW;
    for (let frame = 0; frame < 120; frame++) glow = easeGlow(glow, target, 1 / 60);
    expect(glow.warn).toBeCloseTo(target.warn, 2);
    expect(glow.energy).toBeCloseTo(target.energy, 3);
    expect(Math.sin(glow.angle)).toBeCloseTo(1, 3);
  });

  it("holds the trail back until the rim has swung round to the flight", () => {
    const pulled = { ...REST_GLOW, angle: Math.PI / 2, lift: 1, energy: 0 };
    const target = glowTarget(flying(0, 2600), flight, pulled.angle);
    const first = easeGlow(pulled, target, 1 / 60);
    expect(first.energy).toBe(0);

    let glow = pulled;
    for (let frame = 0; frame < 60; frame++) glow = easeGlow(glow, target, 1 / 60);
    expect(trailStrength(glow.energy)).toBeCloseTo(1, 2);
  });

  it("turns the short way across the ±π seam", () => {
    const from = { ...REST_GLOW, angle: Math.PI - 0.1 };
    const to = { ...REST_GLOW, angle: -Math.PI + 0.1 };
    const next = easeGlow(from, to, 1 / 60);
    const turned = Math.abs(
      Math.atan2(Math.sin(next.angle - from.angle), Math.cos(next.angle - from.angle)),
    );
    expect(turned).toBeLessThan(0.2);
    expect(turned).toBeGreaterThan(0);
  });
});
