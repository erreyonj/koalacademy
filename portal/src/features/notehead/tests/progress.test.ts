import { describe, expect, it } from "vitest";
import {
  BREAK_SPEED,
  FIXED_DT,
  SHIP_R,
  launchVelocity,
  restOn,
  step,
  type Body,
} from "../modules/sim";
import {
  aimModeFor,
  applyWarp,
  emptyRepair,
  emptyRouteMemory,
  evaluateSlingshot,
  guideY,
  liveLedges,
  markStorySeen,
  stepPolicyFor,
} from "../modules/progress";
import { WARP_BAND_ID } from "../modules/anachrometer";
import { eventsFor } from "../routes/events";
import { getRoute } from "../routes/registry";

const route = getRoute();
const lesson = eventsFor(route.id, route.origin).slingshot!;
const scene = route.scenes.get(route.origin)!;
const band = scene.ledges.find((ledge) => ledge.kind === "band")!;
const goalY = guideY(band, lesson.goal);

/** Fly one vertical pull from the lesson's band, as the game does. */
function flySlingshot(power: number) {
  const velocity = launchVelocity(route.origin, band.id, { power, angle: 0 }, 0, "vertical");
  let body: Body = { ...restOn(band), ...velocity, restingOn: null };
  let crossedGoal = false;
  let brokeBand = false;
  for (let frame = 0; frame < 1800; frame++) {
    const rising = body.vy > 0;
    const prevY = body.y;
    const prevBottom = body.y - SHIP_R;
    const result = step(
      body,
      liveLedges(route.origin, null),
      FIXED_DT,
      undefined,
      stepPolicyFor(true, crossedGoal),
    );
    body = result.body;
    if (rising && prevY < goalY && body.y >= goalY) crossedGoal = true;
    if (
      !result.landedId &&
      body.vy < 0 &&
      Math.abs(body.vy) > BREAK_SPEED &&
      prevBottom >= band.y &&
      body.y - SHIP_R < band.y
    ) {
      brokeBand = true;
    }
    if (result.landedId || brokeBand || body.y < band.y - 200) break;
  }
  return { body, crossedGoal, brokeBand };
}

describe("slingshot lesson", () => {
  it("aims straight up and keeps the band soft until the guide is crossed", () => {
    expect(aimModeFor(true)).toBe("vertical");
    expect(aimModeFor(false)).toBe("free");
    expect(stepPolicyFor(true, false).catchBands).toBe(true);
    expect(stepPolicyFor(true, true).catchBands).toBe(false);
    expect(stepPolicyFor(false, true).catchBands).toBe(true);
  });

  it("ignores sideways drag in vertical mode, on any level", () => {
    const side = launchVelocity("zig1", "band-1", { power: 0.6, angle: 0.8 }, 0, "vertical");
    expect(side.vx).toBe(0);
    expect(side.vy).toBeGreaterThan(0);
  });

  it("puts the guide above the band, inside the frame", () => {
    expect(goalY).toBeGreaterThan(band.y);
    expect(goalY).toBeLessThan(1600);
  });

  it("clears when the guide is crossed and the band breaks", () => {
    const flight = flySlingshot(0.9);
    expect(flight.crossedGoal).toBe(true);
    expect(flight.brokeBand).toBe(true);
    expect(evaluateSlingshot(flight).cleared).toBe(true);
  });

  it("soft-lands when the guide was never crossed", () => {
    const flight = flySlingshot(0.3);
    expect(flight.crossedGoal).toBe(false);
    expect(flight.brokeBand).toBe(false);
    expect(flight.body.restingOn).toBe(band.id);
    expect(evaluateSlingshot(flight).cleared).toBe(false);
  });

  it("explains each way to miss", () => {
    expect(evaluateSlingshot({ crossedGoal: false, brokeBand: false }).hint).toMatch(/guide/i);
    expect(evaluateSlingshot({ crossedGoal: true, brokeBand: false }).hint).toMatch(/band/i);
    expect(evaluateSlingshot({ crossedGoal: true, brokeBand: true }).cleared).toBe(true);
  });

  it("a hard fall does not rest on a band when catchBands is false", () => {
    let body: Body = {
      x: (band.x0 + band.x1) / 2,
      y: band.y + 900,
      vx: 0,
      vy: 0,
      restingOn: null,
    };
    let landed: string | null = null;
    for (let i = 0; i < 400; i++) {
      const result = step(body, [band], FIXED_DT, undefined, {
        breakSpeed: BREAK_SPEED,
        catchBands: false,
      });
      body = result.body;
      if (result.landedId) {
        landed = result.landedId;
        break;
      }
      if (body.y < band.y - 40) break;
    }
    expect(landed).toBeNull();
    expect(body.restingOn).toBeNull();
    expect(body.y).toBeLessThan(band.y);
  });
});

describe("run memory and repairs", () => {
  it("starts without repairs or stories", () => {
    expect(emptyRepair()).toEqual({ anachrometer: false, tails: [] });
    expect(emptyRouteMemory().storySeen).toEqual([]);
  });

  it("remembers a story once", () => {
    const once = markStorySeen(emptyRouteMemory(), "a");
    expect(markStorySeen(once, "a")).toBe(once);
    expect(markStorySeen(once, "b").storySeen).toEqual(["a", "b"]);
  });

  it("includes exit and warp bands in live ledges", () => {
    const { warp } = applyWarp({ x: 450, y: 900, vx: 0, vy: -100, restingOn: null });
    const ledges = liveLedges("notch1", warp);
    expect(ledges.some((ledge) => ledge.id === WARP_BAND_ID)).toBe(true);
    expect(liveLedges("notch1", null)).toHaveLength(ledges.length - 1);
    const exit = { ...warp, id: "exit-band" };
    expect(liveLedges("notch1", null, exit).some((ledge) => ledge.id === "exit-band")).toBe(
      true,
    );
  });
});
