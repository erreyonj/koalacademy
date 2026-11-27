import { describe, expect, it } from "vitest";
import {
  chartShotSolid,
  previewSubstepSolid,
  resolveMasses,
  stepSolid,
  surfaceBelow,
} from "../modules/collide";
import {
  FIXED_DT,
  MASS_HIT_SPEED,
  SHIP_R,
  restOn,
  step,
} from "../modules/sim";
import { insideMass } from "../modules/terrain";
import { getRoute } from "../routes/registry";

const route = getRoute();

/** A point deep inside a level's rock (logical space), found by scanning. */
function buried(levelId: string): { x: number; y: number } {
  const scene = route.scenes.get(levelId)!;
  for (let y = 40; y < 1600; y += 40) {
    for (let x = 20; x < 900; x += 20) {
      const point = { x, y };
      if (scene.logical.some((mass) => insideMass(point, mass))) return point;
    }
  }
  throw new Error(`no rock in ${levelId}`);
}

describe("solid terrain", () => {
  it("pushes the ship out of buried rock and then leaves it alone", () => {
    for (const id of ["notch1", "stairs1", "zig1"]) {
      const spot = buried(id);
      const body = { ...spot, vx: 200, vy: -100, restingOn: null as string | null };
      const result = resolveMasses(body, id);
      expect(Math.hypot(result.body.x - body.x, result.body.y - body.y)).toBeGreaterThan(
        SHIP_R * 0.1,
      );
      const again = resolveMasses(result.body, id);
      expect(again.body.x).toBeCloseTo(result.body.x, 0);
      expect(again.body.y).toBeCloseTo(result.body.y, 0);
    }
  });

  it("keeps a floor seat without clearing restingOn", () => {
    const scene = route.scenes.get("landing1")!;
    const band = scene.ledges[0]!;
    const result = stepSolid(restOn(band), [band], FIXED_DT, "landing1");
    expect(result.body.restingOn).toBe(band.id);
    expect(result.massHit).toBe(false);
  });

  it("stops a drive into a wall; short taps stay below the hard-hit bar, slams cross it", () => {
    const scene = route.scenes.get("landing1")!;
    // Drive left along the band's height until rock stops the ship.
    const band = scene.ledges[0]!;
    const start = restOn(band);
    const run = (speed: number) => {
      let body = { ...start, y: start.y + SHIP_R * 3, vx: -speed, restingOn: null as string | null };
      let hard = false;
      for (let frame = 0; frame < 240; frame++) {
        const result = stepSolid(body, [], FIXED_DT, "landing1", 0, {
          breakSpeed: 0,
          catchBands: true,
        });
        body = { ...result.body, vy: 0 };
        if (result.massHit) hard = true;
      }
      return { body, hard };
    };
    const slam = run(MASS_HIT_SPEED * 1.8);
    expect(slam.hard).toBe(true);
    expect(slam.body.x).toBeGreaterThan(0);
    const tap = run(MASS_HIT_SPEED * 0.4);
    expect(tap.hard).toBe(false);
  });

  it("finds the rock surface directly below a point", () => {
    const scene = route.scenes.get("stairs1")!;
    const spot = buried("stairs1");
    // Straight above buried rock there is a surface at or below the point.
    const surface = surfaceBelow(scene.logical, spot.x, 1599);
    expect(surface).not.toBeNull();
    expect(surfaceBelow(scene.logical, spot.x, -50)).toBeNull();
  });

  it("terminates chartShotSolid without rock-stalling across zig1perspective aims", () => {
    const zigRoute = getRoute("zig1perspective");
    const scene = zigRoute.scenes.get("zig1perspective")!;
    const band = scene.ledges[0]!;
    const start = restOn(band);
    for (const power of [0.25, 0.55, 0.85, 1]) {
      for (let deg = -160; deg <= 160; deg += 20) {
        const angle = (deg * Math.PI) / 180;
        const chart = chartShotSolid(
          "zig1perspective",
          start,
          { power, angle },
          0,
          "free",
          scene.openings,
        );
        // Sampled every 2 frames + start/end: a 600-frame cap keeps points <= 303,
        // and rock-wedged shots cut off much earlier instead of burning 1500 frames.
        expect(chart.points.length).toBeGreaterThan(1);
        expect(chart.points.length).toBeLessThanOrEqual(304);
      }
    }
  });

  it("interpolates fractional sub-steps smoothly up to FIXED_DT", () => {
    const scene = route.scenes.get("notch1")!;
    const fly = {
      x: 450,
      y: 700,
      vx: 180,
      vy: 420,
      restingOn: null as string | null,
    };
    const zero = previewSubstepSolid(fly, scene.ledges, 0, "notch1", scene.openings);
    expect(zero).toEqual(fly);

    const half = previewSubstepSolid(
      fly,
      scene.ledges,
      FIXED_DT * 0.5,
      "notch1",
      scene.openings,
    );
    const full = previewSubstepSolid(
      fly,
      scene.ledges,
      FIXED_DT,
      "notch1",
      scene.openings,
    );
    const expected = step(fly, scene.ledges, FIXED_DT).body;

    expect(half.x).toBeGreaterThan(fly.x);
    expect(half.x).toBeLessThan(full.x);
    expect(half.y).toBeGreaterThan(fly.y);
    expect(half.y).toBeLessThan(full.y);
    expect(full.x).toBeCloseTo(expected.x, 5);
    expect(full.y).toBeCloseTo(expected.y, 5);
  });
});
