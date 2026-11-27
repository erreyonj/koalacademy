import { describe, expect, it } from "vitest";
import {
  type Aim,
  type Body,
  FIXED_DT,
  LAUNCH_BAND,
  PROFILES,
  chartShot,
  clampAim,
  dockOnBand,
  isDockableBand,
  pullForLaunchDegree,
  flyShot,
  restBody,
  step,
} from "../modules/sim";
import { getRoute } from "../routes/registry";

const easy = PROFILES.easy;
const medium = PROFILES.medium;

// Registers the tutorial route's levels with the sim.
getRoute();

describe("launch apex", () => {
  it("an overshoot that crosses the guide does not clear", () => {
    const shot = flyShot("launch", easy, 1);
    expect(shot.crossedUp).toContain("G4");
    expect(shot.apexPitch).not.toBe("G4");
    expect(shot.cleared).toBe(false);
  });

  it("easy allows one degree off the goal and medium does not", () => {
    const pull = pullForLaunchDegree(5);
    const easyShot = flyShot("launch", easy, pull);
    const mediumShot = flyShot("launch", medium, pull);
    expect(easyShot.apexPitch).toBe("A4");
    expect(easyShot.cleared).toBe(true);
    expect(mediumShot.cleared).toBe(false);

    const onGoal = flyShot("launch", medium, pullForLaunchDegree(4));
    expect(onGoal.apexPitch).toBe("G4");
    expect(onGoal.cleared).toBe(true);
  });
});

describe("route level shots", () => {
  it("a gentle straight-up pull on landing1 comes back down to its band", () => {
    const band = getRoute().scenes.get("landing1")!.ledges[0]!;
    const shot = flyShot("landing1", easy, { power: 0.4, angle: 0 });
    expect(shot.landedOn).toBe(band.id);
    expect(shot.body.restingOn).toBe(band.id);
  });

  it("charts the same landing the flight lands on", () => {
    const aim: Aim = { power: 0.4, angle: 0 };
    const shot = flyShot("landing1", easy, aim);
    const chart = chartShot("landing1", restBody("landing1"), aim, easy.aimInset);
    expect(chart.points.length).toBeGreaterThan(4);
    expect(chart.apex).not.toBeNull();
    expect(chart.landedOn).toBe(shot.landedOn);
  });

  it("a harder pull rises higher", () => {
    const low = chartShot("landing1", restBody("landing1"), { power: 0.3, angle: 0 }, 0);
    const high = chartShot("landing1", restBody("landing1"), { power: 0.6, angle: 0 }, 0);
    expect(high.apex!.y).toBeGreaterThan(low.apex!.y);
  });
});

describe("aim cone", () => {
  it("route levels share the editor's cone: portrait 0.95, landscape 1.0", () => {
    const wide: Aim = { power: 1, angle: 1.2 };
    expect(clampAim(wide, "notch1", "band-1").angle).toBeCloseTo(0.95);
    expect(clampAim(wide, "zig1", "band-1").angle).toBeCloseTo(1.0);
    expect(clampAim({ power: 1, angle: -1.2 }, "zig1", "band-1").angle).toBeCloseTo(-1.0);
  });

  it("hard shaves a wide aim back into the cone", () => {
    const wide: Aim = { power: 1, angle: 0.93 };
    expect(clampAim(wide, "notch1", "band-1", PROFILES.easy.aimInset).angle).toBeCloseTo(
      0.93,
    );
    expect(
      clampAim(wide, "notch1", "band-1", PROFILES.hard.aimInset).angle,
    ).toBeLessThan(0.9);
  });

  it("launch ignores sideways aim", () => {
    expect(clampAim({ power: 0.5, angle: 0.8 }, "launch", "launch-band").angle).toBe(
      0,
    );
  });
});

describe("Frequency Band dock", () => {
  it("eases a seated ship toward the band center", () => {
    expect(isDockableBand(LAUNCH_BAND)).toBe(true);
    expect(isDockableBand({ ...LAUNCH_BAND, id: "warp-band" })).toBe(false);

    const mid = (LAUNCH_BAND.x0 + LAUNCH_BAND.x1) / 2;
    let body: Body = {
      x: LAUNCH_BAND.x0 + 20,
      y: LAUNCH_BAND.y + 30,
      vx: 0,
      vy: 0,
      restingOn: LAUNCH_BAND.id,
    };
    for (let frame = 0; frame < 180; frame++) {
      body = dockOnBand(body, LAUNCH_BAND, FIXED_DT);
    }
    expect(body.x).toBeCloseTo(mid, 0);
    expect(body.vx).toBeCloseTo(0, 0);

    const seated = step(
      {
        x: LAUNCH_BAND.x0 + 40,
        y: LAUNCH_BAND.y + 30,
        vx: 0,
        vy: 0,
        restingOn: LAUNCH_BAND.id,
      },
      [LAUNCH_BAND],
      FIXED_DT,
    );
    expect(seated.body.x).toBeGreaterThan(LAUNCH_BAND.x0 + 40);
  });
});
