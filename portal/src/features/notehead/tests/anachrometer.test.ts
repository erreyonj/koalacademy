import { describe, expect, it } from "vitest";
import {
  WARP_BAND_ID,
  canWarp,
  engageWarp,
  followWarpBand,
  makeWarpBand,
} from "../modules/anachrometer";
import {
  FIXED_DT,
  PROFILES,
  SHIP_R,
  aimFromPull,
  launchVelocity,
  step,
} from "../modules/sim";
import { applyWarp, liveLedges } from "../modules/progress";

describe("Anachrometer mid-flight pull", () => {
  it("can warp only while airborne with Anachrometer on and no active warp", () => {
    expect(canWarp(false, null, false)).toBe(false);
    expect(canWarp(true, "floor", false)).toBe(false);
    expect(canWarp(true, null, true)).toBe(false);
    expect(canWarp(true, null, false)).toBe(true);
  });

  it("engages a warp under the ship without killing velocity", () => {
    const airborne = {
      x: 450,
      y: 900,
      vx: 120,
      vy: -500,
      restingOn: null as string | null,
    };
    const { body, warp } = applyWarp(airborne);
    expect(warp.id).toBe(WARP_BAND_ID);
    expect(body.restingOn).toBeNull();
    expect(body.vx).toBe(120);
    expect(body.vy).toBe(-500);
    expect(warp.x0).toBeCloseTo(450 - 90);
    expect(warp.y).toBeCloseTo(900 - SHIP_R);
  });

  it("followWarpBand keeps the band under a drifting ship", () => {
    const body = {
      x: 400,
      y: 800,
      vx: 80,
      vy: 40,
      restingOn: null as string | null,
    };
    const first = engageWarp(body).warp;
    const next = { ...body, x: 460, y: 760 };
    const followed = followWarpBand(next, first.pitch);
    expect(followed.id).toBe(WARP_BAND_ID);
    expect(followed.x0).toBeCloseTo(460 - 90);
    expect(followed.y).toBeCloseTo(760 - SHIP_R);
  });

  it("release from an air-pull relaunches from the live pose", () => {
    const engaged = applyWarp({
      x: 400,
      y: 800,
      vx: 60,
      vy: -200,
      restingOn: null,
    });
    const aim = aimFromPull("notch", WARP_BAND_ID, -40, -200, 0);
    expect(aim.power).toBeGreaterThan(0.08);
    const velocity = launchVelocity(
      "notch",
      WARP_BAND_ID,
      aim,
      PROFILES.easy.aimInset,
    );
    // New shot replaces current velocity from the live pose.
    const body = {
      ...engaged.body,
      ...velocity,
      restingOn: null as string | null,
    };
    const ledges = liveLedges("notch", null);
    const first = step(body, ledges, FIXED_DT, undefined, {
      breakSpeed: 0,
      catchBands: true,
    });
    expect(first.body.restingOn).toBeNull();
    expect(first.body.vy).toBeGreaterThan(0);
  });

  it("makeWarpBand stays centered on the ship", () => {
    const body = { x: 510, y: 700, vx: 0, vy: -100, restingOn: null };
    const band = makeWarpBand(body, "E4");
    expect(band.pitch).toBe("E4");
    expect(band.id).toBe(WARP_BAND_ID);
    expect(body.x).toBeGreaterThanOrEqual(band.x0);
    expect(body.x).toBeLessThanOrEqual(band.x1);
  });
});
