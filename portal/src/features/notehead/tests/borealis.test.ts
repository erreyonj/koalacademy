import { describe, expect, it } from "vitest";
import {
  COLLECT_RADIUS,
  EXIT_BAND_ID,
  MAGNET_RANGE,
  exitBandFor,
  spawnBorealis,
  stepBorealis,
} from "../modules/borealis";
import { applyCollect, emptyAttempt } from "../modules/tonation";
import { eventsFor } from "../routes/events";
import { getRoute } from "../routes/registry";

const route = getRoute();
const scene = (id: string) => route.scenes.get(id)!;
const gems = (id: string) => spawnBorealis(scene(id).borealis);
const at = (gem: { x: number; y: number }) => ({
  x: gem.x,
  y: gem.y,
  vx: 0,
  vy: 0,
  restingOn: null as string | null,
});

describe("Borealis", () => {
  it("spawns exactly the level's authored spots, uncollected", () => {
    for (const level of route.levels) {
      const list = gems(level.id);
      expect(list.map((gem) => gem.id)).toEqual(level.borealis.map((spot) => spot.id));
      expect(list.map((gem) => gem.pitch)).toEqual(level.borealis.map((spot) => spot.pitch));
      expect(list.every((gem) => !gem.collected && gem.homeX === gem.x)).toBe(true);
    }
    expect(gems("landing1")).toEqual([]);
    expect(gems("8thTail1")).toEqual([]);
  });

  it("gives every interval level the pitches its challenge needs", () => {
    for (const level of route.levels) {
      const challenge = eventsFor(route.id, level.id).tonation;
      if (!challenge) continue;
      const have = gems(level.id).map((gem) => gem.pitch);
      for (const pitch of challenge.pitches) expect(have).toContain(pitch);
    }
  });

  it("starts the ship out of every gem's magnet range", () => {
    for (const level of route.levels) {
      const start = scene(level.id).start;
      for (const gem of gems(level.id)) {
        expect(Math.hypot(start.x - gem.x, start.y - gem.y)).toBeGreaterThan(MAGNET_RANGE);
      }
    }
  });

  it("magnetizes any uncollected gem toward the ship then collects", () => {
    const list = gems("stairs1");
    const second = list[1]!;
    // Second gem first: any-order collect is allowed.
    const body = { ...at(second), x: second.x + MAGNET_RANGE * 0.5 };
    const pulled = stepBorealis(list, body, 1 / 60);
    const next = pulled.list[1]!;
    expect(next.collected).toBe(false);
    expect(Math.hypot(next.x - body.x, next.y - body.y)).toBeLessThan(
      Math.hypot(second.x - body.x, second.y - body.y),
    );

    const close = { ...body, x: second.x + COLLECT_RADIUS * 0.4, y: second.y };
    const grab = stepBorealis(list, close, 1 / 60);
    expect(grab.collected.map((gem) => gem.id)).toEqual([second.id]);
    expect(grab.list[1]?.collected).toBe(true);
  });

  it("keeps collecting after a wrong-order pick fails the interval", () => {
    const challenge = eventsFor(route.id, "notch1").tonation!;
    const list = gems("notch1");
    const high = list.find((gem) => gem.pitch === "A4")!;
    const low = list.find((gem) => gem.pitch === "E4")!;

    // A4 first is out of order (E4 then A4 required).
    const first = stepBorealis(list, at(high), 1 / 60);
    const attempt = applyCollect(challenge, emptyAttempt(), "A4").attempt;
    expect(attempt.failed).toBe(true);

    // The other gem stays live and still collects.
    const second = stepBorealis(first.list, at(low), 1 / 60);
    expect(second.collected.map((gem) => gem.id)).toEqual([low.id]);
    expect(applyCollect(challenge, attempt, "E4").kind).toBe("fail");
  });

  it("ignores already-collected gems", () => {
    const [gem] = gems("notch1");
    const taken = { ...gem!, collected: true };
    const result = stepBorealis([taken], at(gem!), 1 / 60);
    expect(result.collected).toHaveLength(0);
  });

  it("plants an exit Frequency Band on the rock under a gem", () => {
    for (const id of ["notch1", "stairs1", "zig1"]) {
      const s = scene(id);
      for (const gem of gems(id)) {
        const band = exitBandFor(gem, s.logical, s.ledges);
        // Open sky under a gem plants nothing; otherwise the band sits below it.
        if (!band) continue;
        expect(band.id).toBe(EXIT_BAND_ID);
        expect(band.kind).toBe("band");
        expect(band.y).toBeLessThan(gem.y);
        expect(gem.homeX).toBeGreaterThanOrEqual(band.x0);
        expect(gem.homeX).toBeLessThanOrEqual(band.x1);
      }
    }
    // At least the stairs and notch gems have rock beneath them.
    const stairs = scene("stairs1");
    const planted = gems("stairs1").filter((gem) =>
      exitBandFor(gem, stairs.logical, stairs.ledges),
    );
    expect(planted.length).toBeGreaterThan(0);
  });

  it("prefers a ledge that sits above the rock", () => {
    const ledge = { id: "l", x0: 0, x1: 900, y: 500, pitch: "C4" as const, kind: "band" as const };
    const gem = { ...gems("stairs1")[0]!, x: 450, y: 800, homeX: 450 };
    const band = exitBandFor(gem, [], [ledge]);
    expect(band?.y).toBeGreaterThan(500);
    expect(band?.y).toBeLessThan(800);
    expect(exitBandFor(gem, [], [])).toBeNull();
  });
});
