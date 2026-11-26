import { describe, expect, it } from "vitest";
import {
  COLLECT_RADIUS,
  EXIT_BAND_ID,
  MAGNET_RANGE,
  exitBandFor,
  seedVisited,
  spawnBorealis,
  stepBorealis,
} from "../modules/borealis";
import { resolveMasses } from "../modules/collide";
import { liveLedges, zigJumpFromLeftEnter } from "../modules/progress";
import { applyCollect, challengeFor, emptyAttempt } from "../modules/tonation";
import {
  FIXED_DT,
  NOTCH_BLOCK,
  NOTCH_POCKET,
  SHIP_R,
  STAIR_TREADS,
  ZIG_LEFT,
  ZIG_PEAK,
  ZIG_RIGHT,
  step,
} from "../modules/sim";

describe("Borealis", () => {
  it("Zig jump-in arc reaches the peak without collecting or pulling any orb", () => {
    let body = zigJumpFromLeftEnter();
    const orbs = spawnBorealis("zig-1");
    let landed: string | null = null;
    for (let frame = 0; frame < 600 && !landed; frame++) {
      const result = step(body, liveLedges("zig", null), FIXED_DT, undefined, {
        breakSpeed: 0,
        catchBands: true,
      });
      body = result.body;
      if (!body.restingOn) body = resolveMasses(body, "zig").body;
      for (const orb of orbs) {
        expect(Math.hypot(body.x - orb.x, body.y - orb.y)).toBeGreaterThan(
          MAGNET_RANGE,
        );
      }
      landed = result.landedId ?? null;
    }
    expect(landed).toBe(ZIG_PEAK.id);
  });

  it("spawns pocket and block for notch-calibrate with two goal tones", () => {
    const list = spawnBorealis("notch-calibrate");
    expect(list.map((entry) => entry.id)).toEqual([
      NOTCH_POCKET.id,
      NOTCH_BLOCK.id,
    ]);
    // Lower shelf A4, higher block E4 (Ascending 4th still gathers E → A).
    expect(list.map((entry) => entry.pitch)).toEqual(["A4", "E4"]);
    expect(list.every((entry) => !entry.collected)).toBe(true);
  });

  it("spawns one gem over each tread's open face with tread goal tones", () => {
    const list = spawnBorealis("stairs-anach");
    expect(list.map((entry) => entry.id)).toEqual(
      STAIR_TREADS.map((tread) => tread.id),
    );
    expect(list.map((entry) => entry.pitch)).toEqual(["C4", "E4", "G4"]);
    const bottom = list[0];
    const top = list[list.length - 1];
    const s1 = STAIR_TREADS[0];
    const s3 = STAIR_TREADS[STAIR_TREADS.length - 1];
    if (!bottom || !top || !s1 || !s3) throw new Error("expected gems");
    expect(bottom.x).toBeLessThan((s1.x0 + s1.x1) / 2);
    expect(top.y).toBeGreaterThan(s3.y);
    expect(list).toHaveLength(3);
  });

  it("seeds floor visited on calibrate enter", () => {
    expect(seedVisited("notch-calibrate")).toEqual(["floor"]);
    expect(seedVisited("stairs-anach")).toEqual([]);
    expect(seedVisited("zig-1")).toEqual([ZIG_PEAK.id]);
  });

  it("spawns zig-1 Borealis float → left → right shelf with goal tones", () => {
    const list = spawnBorealis("zig-1");
    expect(list).toHaveLength(3);
    expect(list.map((entry) => entry.id)).toEqual([
      ZIG_PEAK.id,
      ZIG_LEFT.id,
      ZIG_RIGHT.id,
    ]);
    expect(list.map((entry) => entry.pitch)).toEqual(["C4", "E4", "A4"]);
    const floating = list[0]!;
    const left = list[1]!;
    const right = list[2]!;
    expect(floating.y).toBeGreaterThan(ZIG_PEAK.y + SHIP_R * 2);
    expect(left.y).toBeGreaterThan(ZIG_LEFT.y);
    expect(right.y).toBeGreaterThan(ZIG_RIGHT.y);
  });

  it("magnetizes any uncollected gem toward the ship then collects", () => {
    const list = spawnBorealis("notch-calibrate");
    const second = list[1];
    if (!second) throw new Error("expected second gem");
    // Second gem first — any-order collect is allowed.
    const body = {
      x: second.x + MAGNET_RANGE * 0.5,
      y: second.y,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    };
    const pulled = stepBorealis(list, body, 1 / 60);
    const next = pulled.list[1];
    if (!next) throw new Error("expected next");
    expect(next.collected).toBe(false);
    expect(Math.hypot(next.x - body.x, next.y - body.y)).toBeLessThan(
      Math.hypot(second.x - body.x, second.y - body.y),
    );

    const close = {
      ...body,
      x: second.x + COLLECT_RADIUS * 0.4,
      y: second.y,
    };
    const grab = stepBorealis(list, close, 1 / 60);
    expect(grab.collected.map((entry) => entry.id)).toEqual([second.id]);
    expect(grab.list[1]?.collected).toBe(true);
  });

  it("keeps collecting after a wrong-order pick fails the interval", () => {
    const challenge = challengeFor("notch-calibrate");
    if (!challenge) throw new Error("expected notch challenge");
    let list = spawnBorealis("notch-calibrate");
    const pocket = list.find((entry) => entry.id === NOTCH_POCKET.id);
    const block = list.find((entry) => entry.id === NOTCH_BLOCK.id);
    if (!pocket || !block) throw new Error("expected notch gems");
    const at = (gem: typeof pocket) => ({
      x: gem.x,
      y: gem.y,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    });

    // A4 pocket first is out of order (E4 → A4 required).
    const first = stepBorealis(list, at(pocket), 1 / 60);
    list = first.list;
    const attempt = applyCollect(challenge, emptyAttempt(), "A4").attempt;
    expect(attempt.failed).toBe(true);

    // The block gem stays live and still collects.
    const second = stepBorealis(list, at(block), 1 / 60);
    expect(second.collected.map((entry) => entry.id)).toEqual([NOTCH_BLOCK.id]);
    expect(applyCollect(challenge, attempt, "E4").kind).toBe("fail");
  });

  it("ignores already-collected gems", () => {
    const [gem] = spawnBorealis("notch-calibrate");
    if (!gem) throw new Error("expected gem");
    const taken = { ...gem, collected: true };
    const body = {
      x: gem.x,
      y: gem.y + SHIP_R,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    };
    const result = stepBorealis([taken], body, 1 / 60);
    expect(result.collected).toHaveLength(0);
  });

  it("plants an exit Frequency Band under a gem's platform", () => {
    const list = spawnBorealis("notch-calibrate");
    const last = list[list.length - 1];
    if (!last) throw new Error("expected last gem");
    const band = exitBandFor(last);
    expect(band?.id).toBe(EXIT_BAND_ID);
    expect(band?.kind).toBe("band");
    expect(band?.y).toBeLessThan(last.y);
    expect(band!.y).toBeGreaterThan(NOTCH_BLOCK.y);
    expect(last.homeX).toBeGreaterThanOrEqual(band!.x0);
    expect(last.homeX).toBeLessThanOrEqual(band!.x1);

    const top = spawnBorealis("stairs-anach").at(-1);
    if (!top) throw new Error("expected top tread gem");
    const stairBand = exitBandFor(top);
    expect(stairBand?.id).toBe(EXIT_BAND_ID);
    expect(stairBand?.y).toBeLessThan(top.y);
  });
});
