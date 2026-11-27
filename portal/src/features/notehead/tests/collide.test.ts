import { describe, expect, it } from "vitest";
import { resolveMasses, stepSolid, surfaceBelow } from "../modules/collide";
import {
  FIXED_DT,
  MASS_HIT_SPEED,
  SHIP_R,
  restOn,
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
});
