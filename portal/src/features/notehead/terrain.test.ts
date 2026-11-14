import { describe, expect, it } from "vitest";
import {
  NOTCH_LEDGES,
  SHIP_R,
  STAIR_TREADS,
  launchVelocity,
  notchStart,
  stairStart,
} from "./levels";
import {
  dropOnto,
  lowerLedge,
  restOn,
  stepTerrain,
  TERRAIN_GRAVITY,
  type TerrainBody,
} from "./terrain";
import { STAIR_LEDGES } from "./levels";

function fly(
  start: ReturnType<typeof stairStart>,
  ledges: typeof STAIR_LEDGES,
  vx: number,
  vy: number,
) {
  let body: TerrainBody = { ...start, vx, vy, restingOn: null };
  for (let i = 0; i < 800 && !body.restingOn; i++) {
    const step = stepTerrain(body, ledges, 1 / 60, SHIP_R, TERRAIN_GRAVITY);
    body = step.body;
    if (body.y > 420 || body.x < -40 || body.x > 240) break;
  }
  return body;
}

describe("stepTerrain", () => {
  it("lands on a ledge the ship falls through", () => {
    const ledge = STAIR_TREADS[0]!;
    let body: TerrainBody = {
      x: 120,
      y: ledge.y - 40,
      vx: 0,
      vy: 0,
      restingOn: null,
    };
    for (let i = 0; i < 90 && !body.restingOn; i++) {
      body = stepTerrain(body, [ledge], 1 / 60, SHIP_R).body;
    }
    expect(body.restingOn).toBe(ledge.id);
    expect(body.y).toBeCloseTo(ledge.y - SHIP_R);
  });

  it("does not land while rising", () => {
    const ledge = STAIR_TREADS[2]!;
    const result = stepTerrain(
      { x: 160, y: ledge.y + 10, vx: 0, vy: -200, restingOn: null },
      [ledge],
      1 / 60,
      SHIP_R,
    );
    expect(result.landedId).toBeNull();
  });

  it("misses a ledge when x is outside it", () => {
    const ledge = STAIR_TREADS[4]!;
    const result = stepTerrain(
      { x: 40, y: ledge.y - 20, vx: 0, vy: 80, restingOn: null },
      [ledge],
      1 / 30,
      SHIP_R,
    );
    expect(result.landedId).toBeNull();
  });
});

describe("lowerLedge", () => {
  it("returns the next tread down, skipping nothing in between", () => {
    expect(lowerLedge(STAIR_TREADS, "s5")?.id).toBe("s4");
    expect(lowerLedge(STAIR_TREADS, "s1")).toBeNull();
  });
});

describe("prototype launches", () => {
  it("a full stair pull lands on the top tread", () => {
    const start = stairStart();
    const { vx, vy } = launchVelocity("stairs", "band", 1);
    const body = fly(start, STAIR_LEDGES, vx, vy);
    expect(body.restingOn).toBe("s5");
  });

  it("a step down from the top tread lands on the next step", () => {
    const top = STAIR_TREADS[4]!;
    const next = lowerLedge(STAIR_TREADS, top.id)!;
    let body = dropOnto(top, next, 182, SHIP_R);
    for (let i = 0; i < 400 && !body.restingOn; i++) {
      body = stepTerrain(body, STAIR_TREADS, 1 / 60, SHIP_R).body;
    }
    expect(body.restingOn).toBe("s4");
  });

  it("a short notch pull lands in the pocket", () => {
    const start = notchStart();
    const { vx, vy } = launchVelocity("notch", "floor", 0.15);
    const body = fly(start, NOTCH_LEDGES, vx, vy);
    expect(body.restingOn).toBe("pocket");
  });

  it("a hard notch pull lands on the block", () => {
    const start = notchStart();
    const { vx, vy } = launchVelocity("notch", "floor", 1);
    const body = fly(start, NOTCH_LEDGES, vx, vy);
    expect(body.restingOn).toBe("block");
  });
});
