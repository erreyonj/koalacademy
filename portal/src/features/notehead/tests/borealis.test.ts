import { describe, expect, it } from "vitest";
import {
  COLLECT_RADIUS,
  EXIT_BAND_ID,
  MAGNET_RANGE,
  exitBandFor,
  nextBorealisIndex,
  seedVisited,
  spawnBorealis,
  stepBorealis,
  tonationPitches,
} from "../modules/borealis";
import {
  NOTCH_BLOCK,
  NOTCH_POCKET,
  SHIP_R,
  STAIR_TREADS,
  ZIG_LEFT,
  ZIG_PEAK,
  ZIG_RIGHT,
} from "../modules/sim";

describe("Borealis", () => {
  it("spawns pocket and block for notch-calibrate with two goal tones", () => {
    const list = spawnBorealis("notch-calibrate");
    expect(list.map((entry) => entry.id)).toEqual([
      NOTCH_POCKET.id,
      NOTCH_BLOCK.id,
    ]);
    expect(list.map((entry) => entry.pitch)).toEqual(["E4", "A4"]);
    expect(list.every((entry) => !entry.collected)).toBe(true);
  });

  it("lists tonation pitches from Borealis (or the region fallback)", () => {
    expect(tonationPitches("notch-calibrate", "A4")).toEqual(["E4", "A4"]);
    expect(tonationPitches("stairs-anach", "G4")).toEqual(["C4", "E4", "G4"]);
    expect(tonationPitches("zig-1", "A4")).toEqual(["C4", "E4", "A4"]);
    expect(tonationPitches("launch-teach", "G4")).toEqual(["G4"]);
    expect(tonationPitches("launch-bridge", "G4")).toEqual(["G4"]);
    expect(tonationPitches("notch-crash", "A4")).toEqual(["A4"]);
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
    // Floating gem sits in the open shaft (not on the start seat).
    expect(floating.y).toBeGreaterThan(ZIG_PEAK.y + SHIP_R * 2);
    expect(left.y).toBeGreaterThan(ZIG_LEFT.y);
    expect(right.y).toBeGreaterThan(ZIG_RIGHT.y);
  });

  it("nextBorealisIndex tracks goal order", () => {
    const list = spawnBorealis("stairs-anach");
    expect(nextBorealisIndex(list)).toBe(0);
    list[0] = { ...list[0]!, collected: true };
    expect(nextBorealisIndex(list)).toBe(1);
  });

  it("magnetizes the active gem toward the ship then collects", () => {
    const [gem] = spawnBorealis("notch-calibrate");
    if (!gem) throw new Error("expected gem");
    const body = {
      x: gem.x + MAGNET_RANGE * 0.5,
      y: gem.y,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    };
    const pulled = stepBorealis([gem], body, 1 / 60);
    const next = pulled.list[0];
    if (!next) throw new Error("expected next");
    expect(next.collected).toBe(false);
    expect(Math.hypot(next.x - body.x, next.y - body.y)).toBeLessThan(
      Math.hypot(gem.x - body.x, gem.y - body.y),
    );

    const close = {
      ...body,
      x: gem.x + COLLECT_RADIUS * 0.4,
      y: gem.y,
    };
    const grab = stepBorealis([gem], close, 1 / 60);
    expect(grab.collected.map((entry) => entry.id)).toEqual([gem.id]);
    expect(grab.list[0]?.collected).toBe(true);
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

  it("plants an exit Frequency Band under the last gem's platform", () => {
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
