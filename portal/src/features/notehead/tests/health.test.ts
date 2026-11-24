import { describe, expect, it } from "vitest";
import {
  applyExitBarrierHit,
  applyLandingHit,
  applyRegionClearHeal,
  breachWipesTonation,
  clampHp,
  isHardLanding,
  isHardMassHit,
  isSoftMassBump,
  maxHp,
} from "../modules/health";
import {
  LANDING_HIT_SPEED,
  MASS_BUMP_SPEED,
  MASS_HIT_SPEED,
} from "../modules/sim";

describe("hull HP", () => {
  it("starts at 10 / 8 / 5 by difficulty", () => {
    expect(maxHp("easy")).toBe(10);
    expect(maxHp("medium")).toBe(8);
    expect(maxHp("hard")).toBe(5);
  });

  it("landings cost 1 and floor at 0", () => {
    expect(applyLandingHit(5)).toBe(4);
    expect(applyLandingHit(1)).toBe(0);
    expect(applyLandingHit(0)).toBe(0);
    expect(applyLandingHit(5, "easy")).toBe(4);
  });

  it("region clear heals Easy/Med +3 and Hard +1", () => {
    expect(applyRegionClearHeal(3, "easy")).toBe(6);
    expect(applyRegionClearHeal(7, "medium")).toBe(8);
    expect(applyRegionClearHeal(3, "hard")).toBe(4);
  });

  it("only Hard breach wipes Tonation", () => {
    expect(breachWipesTonation("easy")).toBe(false);
    expect(breachWipesTonation("medium")).toBe(false);
    expect(breachWipesTonation("hard")).toBe(true);
  });

  it("clampHp respects the difficulty max", () => {
    expect(clampHp(11, "easy")).toBe(10);
    expect(clampHp(9, "hard")).toBe(5);
  });

  it("exit barriers only tax hull on hard", () => {
    expect(applyExitBarrierHit(5, "easy")).toBe(5);
    expect(applyExitBarrierHit(5, "medium")).toBe(5);
    expect(applyExitBarrierHit(3, "hard")).toBe(2);
    expect(applyExitBarrierHit(1, "hard")).toBe(0);
  });

  it("soft landings stay free; hard falls tax hull", () => {
    expect(isHardLanding(0)).toBe(false);
    expect(isHardLanding(LANDING_HIT_SPEED - 1)).toBe(false);
    expect(isHardLanding(LANDING_HIT_SPEED)).toBe(true);
    expect(isHardLanding(LANDING_HIT_SPEED * 2)).toBe(true);
  });

  it("rock hits share the landing hard-hit bar; softer bumps stay free", () => {
    expect(MASS_HIT_SPEED).toBe(LANDING_HIT_SPEED);
    expect(isHardMassHit(MASS_HIT_SPEED - 1)).toBe(false);
    expect(isHardMassHit(MASS_HIT_SPEED)).toBe(true);
    expect(isSoftMassBump(MASS_BUMP_SPEED)).toBe(true);
    expect(isSoftMassBump(MASS_HIT_SPEED)).toBe(false);
    expect(isSoftMassBump(MASS_BUMP_SPEED - 1)).toBe(false);
  });
});
