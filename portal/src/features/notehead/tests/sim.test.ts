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

/** Up and toward the stack. Power clears the top; a shorter pull falls short. */
const STAIR_AIM = 0.22;
/** From the classic right-side floor band up into the pocket / block. */
const POCKET_AIM: Aim = { power: 0.75, angle: -0.2 };
const BLOCK_AIM: Aim = { power: 1, angle: 0 };

const easy = PROFILES.easy;
const medium = PROFILES.medium;

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

describe("stairs", () => {
  it("a strong up-right aim touches the top tread then slides off", () => {
    const shot = flyShot("stairs", medium, { power: 0.88, angle: STAIR_AIM });
    expect(shot.visited).toContain("s3");
    // Sloped treads no longer chain-drop; may settle on the stair band below.
    expect(shot.body.restingOn === null || shot.body.restingOn === "band").toBe(
      true,
    );
  });

  it("the same aim with less power misses the top", () => {
    const shot = flyShot("stairs", easy, { power: 0.45, angle: STAIR_AIM });
    expect(shot.visited).not.toContain("s3");
    expect(shot.cleared).toBe(false);
  });
});

describe("notch", () => {
  it("an aim toward the pocket lands there", () => {
    const shot = flyShot("notch", easy, POCKET_AIM);
    expect(shot.landedOn).toBe("pocket");
  });

  it("an aim straight up at full power lands on the block", () => {
    const shot = flyShot("notch", medium, BLOCK_AIM);
    expect(shot.landedOn).toBe("block");
  });

  it("easy clears the pocket and medium does not", () => {
    const shotEasy = flyShot("notch", easy, POCKET_AIM);
    const shotMedium = flyShot("notch", medium, POCKET_AIM);
    expect(shotEasy.cleared).toBe(true);
    expect(shotMedium.cleared).toBe(false);
    expect(flyShot("notch", medium, BLOCK_AIM).cleared).toBe(true);
  });
});

describe("shot chart", () => {
  it("traces a stair shot that touches the top tread", () => {
    const aim: Aim = { power: 0.88, angle: STAIR_AIM };
    const shot = flyShot("stairs", medium, aim);
    const chart = chartShot("stairs", restBody("stairs"), aim, medium.aimInset);
    expect(shot.visited).toContain("s3");
    expect(chart.points.length).toBeGreaterThan(4);
    expect(chart.apex).not.toBeNull();
  });

  it("lands where the pocket aim lands", () => {
    const shot = flyShot("notch", easy, POCKET_AIM);
    const chart = chartShot("notch", restBody("notch"), POCKET_AIM, easy.aimInset);
    expect(chart.landedOn).toBe("pocket");
    expect(chart.landedOn).toBe(shot.landedOn);
  });
});

describe("aim cone", () => {
  it("hard shaves a wide stair aim back into the cone", () => {
    const wide: Aim = { power: 1, angle: 1.02 };
    expect(clampAim(wide, "stairs", "band", PROFILES.easy.aimInset).angle).toBeCloseTo(
      1.02,
    );
    expect(
      clampAim(wide, "stairs", "band", PROFILES.hard.aimInset).angle,
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
