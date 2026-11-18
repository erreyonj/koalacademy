import { describe, expect, it } from "vitest";
import { spawnBorealis, stepBorealis, COLLECT_RADIUS } from "../modules/borealis";
import {
  allBorealisCollected,
  applyBorealisHeal,
  applyLandingHit,
  clampHp,
  maxHp,
} from "../modules/health";

describe("hull HP", () => {
  it("easy has hull off for now", () => {
    expect(maxHp("easy")).toBe(0);
  });

  it("landings cost 1 and floor at 0", () => {
    expect(applyLandingHit(5)).toBe(4);
    expect(applyLandingHit(1)).toBe(0);
    expect(applyLandingHit(0)).toBe(0);
    expect(applyLandingHit(5, "easy")).toBe(5);
  });

  it("clearing Borealis restores 1 up to max when hull is on", () => {
    expect(applyBorealisHeal(3, "medium")).toBe(4);
    expect(applyBorealisHeal(5, "medium")).toBe(5);
    expect(applyBorealisHeal(3, "easy")).toBe(3);
  });

  it("clampHp respects the difficulty max", () => {
    expect(clampHp(9, "easy")).toBe(0);
    expect(clampHp(9, "hard")).toBe(4);
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
