import { describe, expect, it } from "vitest";
import { massFromShape, previewLevel, zoneFromExit } from "../adapter";
import { outerRect, terrainOutline, toView } from "../geometry";
import { hashSeed } from "../model";
import { insideMass } from "../../notehead/modules/terrain";
import type { LevelFile, TerrainShape } from "../types";

function shape(points: { x: number; y: number }[], closed = false): TerrainShape {
  return { id: "terrain-1", points, closed, tickSeed: hashSeed("terrain-1") };
}

describe("terrainOutline", () => {
  it("uses a closed shape exactly as drawn", () => {
    const s = shape(
      [
        { x: 200, y: 400 },
        { x: 600, y: 400 },
        { x: 400, y: 800 },
      ],
      true,
    );
    expect(terrainOutline("portrait", s)).toHaveLength(3);
  });

  it("closes a floor line off-frame with the rock below it", () => {
    // Left to right across the lower part of the frame: rock sits below.
    const s = shape([
      { x: 0, y: 300 },
      { x: 450, y: 340 },
      { x: 900, y: 300 },
    ]);
    const ring = terrainOutline("portrait", s);
    const rect = outerRect("portrait");

    // Both ends run to the outer border.
    const onBorder = (p: { x: number; y: number }) =>
      p.x === rect.x0 || p.x === rect.x1 || p.y === rect.y0 || p.y === rect.y1;
    expect(ring.filter(onBorder).length).toBeGreaterThanOrEqual(2);

    const below = toView("portrait", { x: 450, y: 100 });
    const above = toView("portrait", { x: 450, y: 900 });
    expect(insideMass(below, { outline: ring })).toBe(true);
    expect(insideMass(above, { outline: ring })).toBe(false);
  });

  it("puts the rock on the other side when the line is drawn the other way", () => {
    const s = shape([
      { x: 900, y: 300 },
      { x: 450, y: 340 },
      { x: 0, y: 300 },
    ]);
    const ring = terrainOutline("portrait", s);
    expect(insideMass(toView("portrait", { x: 450, y: 100 }), { outline: ring })).toBe(false);
    expect(insideMass(toView("portrait", { x: 450, y: 900 }), { outline: ring })).toBe(true);
  });

  it("closes a cliff drawn top to bottom with the rock on its left", () => {
    const s = shape([
      { x: 300, y: 1600 },
      { x: 280, y: 800 },
      { x: 320, y: 0 },
    ]);
    const ring = terrainOutline("portrait", s);
    expect(insideMass(toView("portrait", { x: 50, y: 800 }), { outline: ring })).toBe(true);
    expect(insideMass(toView("portrait", { x: 800, y: 800 }), { outline: ring })).toBe(false);
  });

  it("wraps corners when the ends sit on different edges", () => {
    // Ground rising from the left edge to the right edge, drawn left to right.
    const s = shape([
      { x: 0, y: 200 },
      { x: 900, y: 1000 },
    ]);
    const ring = terrainOutline("portrait", s);
    const corners = ring.slice(2, -1);
    expect(corners.length).toBeGreaterThanOrEqual(2);
    expect(insideMass(toView("portrait", { x: 600, y: 100 }), { outline: ring })).toBe(true);
  });
});

describe("previewLevel", () => {
  const level: LevelFile = {
    version: 1,
    id: "t",
    view: "portrait",
    terrain: [
      shape([
        { x: 0, y: 300 },
        { x: 900, y: 300 },
      ]),
    ],
    bands: [{ id: "band-1", x0: 100, x1: 300, y: 500, kind: "band" }],
    borealis: [{ id: "gem-1", x: 200, y: 700, pitch: "E4" }],
    enter: { x: 450, y: 100, vx: 10, vy: 900 },
    exits: [
      { id: "exit-1", facing: "up", x0: 300, x1: 600, y0: 1600, y1: 1600 },
      { id: "exit-2", facing: "right", x0: 900, x1: 900, y0: 400, y1: 800 },
      { id: "exit-3", facing: "down", x0: 100, x1: 300, y0: 0, y1: 0 },
    ],
  };

  it("maps every layer onto the game's shapes", () => {
    const preview = previewLevel(level);
    expect(preview.regionId).toBe("launch");
    expect(preview.masses).toHaveLength(1);
    expect(preview.masses[0]!.ticks.length).toBeGreaterThan(0);
    // The game's ledge needs a pitch; authored bands have none, so it is a fixed filler.
    expect(preview.ledges).toEqual([{ ...level.bands[0]!, pitch: "C4" }]);
    expect(preview.borealis[0]).toEqual({
      id: "gem-1",
      x: 200,
      y: 700,
      pitch: "E4",
      collected: false,
      homeX: 200,
    });
    expect(preview.enter).toEqual({ x: 450, y: 100, vx: 10, vy: 900, restingOn: null });
    expect(preview.openings.map((o) => o.facing)).toEqual(["up", "right", "down"]);
  });

  it("gives up and right exits a zone and down exits none", () => {
    const zones = previewLevel(level).exitZones;
    expect(zones[0]!.zone?.facing).toBe("up");
    expect(zones[1]!.zone?.facing).toBe("right");
    expect(zones[2]!.zone).toBeNull();
    expect(zoneFromExit("portrait", level.exits[0]!)!.ax).toBeCloseTo(100, 0);
  });

  it("renders rock marks identically on every call (seeded)", () => {
    const a = massFromShape("portrait", level.terrain[0]!);
    const b = massFromShape("portrait", level.terrain[0]!);
    expect(b.ticks).toEqual(a.ticks);

    const reseeded = massFromShape("portrait", { ...level.terrain[0]!, tickSeed: 7 });
    expect(reseeded.ticks).not.toEqual(a.ticks);
  });

  it("can skip marks while a drag is in flight", () => {
    expect(previewLevel(level, { ticks: false }).masses[0]!.ticks).toEqual([]);
  });

  it("uses the landscape region for landscape levels", () => {
    expect(previewLevel({ ...level, view: "landscape" }).regionId).toBe("landscape");
  });
});
