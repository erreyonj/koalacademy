import { describe, expect, it } from "vitest";
import { spawnBorealis, stepBorealis, COLLECT_RADIUS } from "../modules/borealis";
import {
  allBorealisCollected,
  applyBorealisHeal,
  applyExitBarrierHit,
  applyLandingHit,
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

  it("clearing Borealis restores 1 up to max when hull is on", () => {
    expect(applyBorealisHeal(3, "medium")).toBe(4);
    expect(applyBorealisHeal(8, "medium")).toBe(8);
    expect(applyBorealisHeal(3, "easy")).toBe(4);
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

describe("Borealis goal order", () => {
  it("only the next gem magnetizes and collects", () => {
    const list = spawnBorealis("notch-calibrate");
    const second = list[1];
    if (!second) throw new Error("expected second gem");
    const body = {
      x: second.x,
      y: second.y,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    };
    const blocked = stepBorealis(list, body, 1 / 60);
    expect(blocked.collected).toHaveLength(0);
    expect(blocked.list[1]?.collected).toBe(false);

    const first = list[0];
    if (!first) throw new Error("expected first gem");
    const nearFirst = {
      ...body,
      x: first.x + COLLECT_RADIUS * 0.3,
      y: first.y,
    };
    const grabbed = stepBorealis(list, nearFirst, 1 / 60);
    expect(grabbed.collected.map((gem) => gem.id)).toEqual([first.id]);
    expect(allBorealisCollected(grabbed.list)).toBe(false);

    const nearSecond = {
      ...body,
      x: second.x + COLLECT_RADIUS * 0.3,
      y: second.y,
    };
    const finish = stepBorealis(grabbed.list, nearSecond, 1 / 60);
    expect(finish.collected.map((gem) => gem.id)).toEqual([second.id]);
    expect(allBorealisCollected(finish.list)).toBe(true);
  });
});
