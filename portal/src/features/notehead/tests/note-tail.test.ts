import { describe, expect, it } from "vitest";
import {
  spawnNoteTail,
  stepNoteTail,
  TAIL_EIGHTH_ID,
} from "../modules/note-tail";
import { COLLECT_RADIUS, MAGNET_RANGE } from "../modules/borealis";
import { eventsFor } from "../routes/events";
import { getRoute } from "../routes/registry";

const spot = eventsFor("notch1", "8thTail1").noteTail!;

describe("Note-Tail pickup", () => {
  it("is authored only on the last level, above its Frequency Band", () => {
    for (const level of getRoute().levels) {
      const tail = eventsFor("notch1", level.id).noteTail;
      expect(Boolean(tail)).toBe(level.id === "8thTail1");
    }
    const tail = spawnNoteTail(spot);
    expect(tail.id).toBe(TAIL_EIGHTH_ID);
    expect(tail.kind).toBe("eighth");
    expect(tail.collected).toBe(false);

    const level = getRoute().scenes.get("8thTail1")!;
    const band = level.ledges[0]!;
    expect(tail.y).toBeGreaterThan(band.y);
    expect(tail.x).toBeGreaterThanOrEqual(band.x0);
    expect(tail.x).toBeLessThanOrEqual(band.x1);
    // Outside the magnet range of a ship seated on the band.
    const seat = { x: (band.x0 + band.x1) / 2, y: band.y };
    expect(Math.hypot(tail.x - seat.x, tail.y - seat.y)).toBeGreaterThan(
      MAGNET_RANGE,
    );
  });

  it("magnets in then collects within COLLECT_RADIUS", () => {
    const tail = spawnNoteTail(spot);
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
});
