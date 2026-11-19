import { describe, expect, it } from "vitest";
import {
  spawnNoteTail,
  stepNoteTail,
  TAIL_EIGHTH_ID,
} from "../modules/note-tail";
import { COLLECT_RADIUS, MAGNET_RANGE } from "../modules/borealis";
import { LAUNCH_BAND, restOn } from "../modules/sim";
import { repairForBeat } from "../modules/progress";

describe("Note-Tail pickup", () => {
  it("spawns only on launch-tail, above the Frequency Band", () => {
    expect(spawnNoteTail("zig-1")).toBeNull();
    const tail = spawnNoteTail("launch-tail");
    expect(tail?.id).toBe(TAIL_EIGHTH_ID);
    expect(tail?.kind).toBe("eighth");
    expect(tail?.collected).toBe(false);
    expect(tail!.y).toBeGreaterThan(LAUNCH_BAND.y);
    const seat = restOn(LAUNCH_BAND);
    const dist = Math.hypot(tail!.x - seat.x, tail!.y - seat.y);
    expect(dist).toBeGreaterThan(MAGNET_RANGE);
  });

  it("magnets in then collects within COLLECT_RADIUS", () => {
    const tail = spawnNoteTail("launch-tail")!;
    const body = {
      x: tail.x,
      y: tail.y - MAGNET_RANGE * 0.5,
      vx: 0,
      vy: 0,
      restingOn: null as string | null,
    };
    const pulled = stepNoteTail(tail, body, 0.05);
    expect(pulled.collected).toBeNull();
    expect(pulled.tail!.y).toBeLessThan(tail.y);

    const close = {
      ...body,
      x: pulled.tail!.x,
      y: pulled.tail!.y - COLLECT_RADIUS * 0.4,
    };
    const grabbed = stepNoteTail(pulled.tail, close, 0.02);
    expect(grabbed.collected?.id).toBe(TAIL_EIGHTH_ID);
    expect(grabbed.tail?.collected).toBe(true);
  });

  it("sandbox jump to launch-tail starts with Anachrometer and no tails", () => {
    const repair = repairForBeat("launch-tail");
    expect(repair.anachrometer).toBe(true);
    expect(repair.tails).toEqual([]);
  });
});
