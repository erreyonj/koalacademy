import { describe, expect, it } from "vitest";
import { resolveMasses, stepSolid } from "../modules/collide";
import {
  FIXED_DT,
  MASS_HIT_SPEED,
  NOTCH_FLOOR,
  SHIP_R,
  fromSvgPoint,
  restOn,
} from "../modules/sim";
import { massesFor } from "../modules/terrain";

describe("solid terrain", () => {
  it("pushes the ship out of the notch wall mass", () => {
    const wall = massesFor("notch").find((mass) => mass.id === "notch-wall-left");
    if (!wall) throw new Error("expected wall");
    // A point deep inside the classic left wall.
    const buried = fromSvgPoint(20, 120, "notch");
    const body = {
      x: buried.x,
      y: buried.y,
      vx: 200,
      vy: -100,
      restingOn: null as string | null,
    };
    const result = resolveMasses(body, "notch");
    expect(result.body.x).not.toBeCloseTo(body.x, 0);
    const again = resolveMasses(result.body, "notch");
    expect(again.body.x).toBeCloseTo(result.body.x, 0);
    expect(again.body.y).toBeCloseTo(result.body.y, 0);
  });

  it("keeps a floor seat without clearing restingOn", () => {
    const seated = restOn(NOTCH_FLOOR);
    const result = stepSolid(
      seated,
      [NOTCH_FLOOR],
      FIXED_DT,
      "notch",
    );
    expect(result.body.restingOn).toBe(NOTCH_FLOOR.id);
    expect(result.massHit).toBe(false);
  });

  it("stops a drive into the notch left wall", () => {
    const start = {
      x: fromSvgPoint(140, 120, "notch").x,
      y: fromSvgPoint(140, 120, "notch").y,
      vx: -2200,
      vy: 0,
      restingOn: null as string | null,
    };
    let body = start;
    let hitWall = false;
    for (let frame = 0; frame < 120; frame++) {
      const result = stepSolid(body, [], FIXED_DT, "notch", 0, {
        breakSpeed: 0,
        catchBands: true,
      });
      body = result.body;
      if (result.massHit) hitWall = true;
      if (body.x < 40) break;
    }
    expect(hitWall).toBe(true);
    expect(body.x).toBeGreaterThan(40);
    expect(body.vx).toBeGreaterThanOrEqual(start.vx);
  });

  it("short wall taps stay below the hard-hit bar; slams cross it", () => {
    const origin = fromSvgPoint(140, 120, "notch");
    const soft = resolveMasses(
      {
        x: origin.x,
        y: origin.y,
        vx: -(MASS_HIT_SPEED * 0.4),
        vy: 0,
        restingOn: null,
      },
      "notch",
    );
    // May or may not touch rock from this pose; if it does, it must not hard-hit.
    if (soft.into > 0) expect(soft.hit).toBe(false);

    const slam = resolveMasses(
      {
        x: origin.x,
        y: origin.y,
        vx: -(MASS_HIT_SPEED * 1.5),
        vy: 0,
        restingOn: null,
      },
      "notch",
    );
    // Drive toward the wall over a few frames so contact is guaranteed.
    let body = {
      x: origin.x,
      y: origin.y,
      vx: -MASS_HIT_SPEED * 1.8,
      vy: 0,
      restingOn: null as string | null,
    };
    let hard = slam.hit;
    for (let frame = 0; frame < 90; frame++) {
      const result = stepSolid(body, [], FIXED_DT, "notch", 0, {
        breakSpeed: 0,
        catchBands: true,
      });
      body = result.body;
      if (result.massHit) hard = true;
    }
    expect(hard).toBe(true);
  });

  it("ejects a ship buried in the stair stack", () => {
    const buried = fromSvgPoint(185, 180, "stairs");
    const body = {
      x: buried.x,
      y: buried.y,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    };
    const result = resolveMasses(body, "stairs");
    expect(Math.hypot(result.body.x - body.x, result.body.y - body.y)).toBeGreaterThan(
      SHIP_R * 0.25,
    );
  });

  it("pushes the ship out of a zig cliff", () => {
    const buried = fromSvgPoint(40, 60, "zig");
    const body = {
      x: buried.x,
      y: buried.y,
      vx: 100,
      vy: 0,
      restingOn: null as string | null,
    };
    const result = resolveMasses(body, "zig");
    expect(Math.hypot(result.body.x - body.x, result.body.y - body.y)).toBeGreaterThan(
      SHIP_R * 0.1,
    );
  });
});
