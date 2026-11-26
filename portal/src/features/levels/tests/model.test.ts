import { describe, expect, it } from "vitest";
import {
  addBand,
  addBorealis,
  addExit,
  addTerrain,
  createLevel,
  flipTerrain,
  hashSeed,
  levelFileName,
  nextId,
  BOREALIS_PITCHES,
  DEFAULT_BOREALIS_PITCH,
  parseLevel,
  removeSelection,
  reorderBorealis,
  serializeLevel,
  setEnter,
  validateLevel,
} from "../model";
import {
  distToSegment,
  fromView,
  snapToGrid,
  toView,
} from "../geometry";
import type { LevelFile } from "../types";

function sample(): LevelFile {
  let level = createLevel("sample level", "portrait");
  level = addTerrain(level, {
    id: "terrain-1",
    points: [
      { x: 0, y: 300 },
      { x: 450, y: 320 },
      { x: 900, y: 280 },
    ],
    closed: false,
    tickSeed: hashSeed("terrain-1"),
  });
  level = addBand(level, {
    id: "band-1",
    x0: 200,
    x1: 400,
    y: 500,
    kind: "band",
  });
  level = addBorealis(level, { id: "gem-1", x: 300, y: 700, pitch: "E4" });
  level = setEnter(level, { x: 450, y: 100, vx: 0, vy: 1200 });
  level = addExit(level, {
    id: "exit-1",
    facing: "up",
    x0: 300,
    x1: 600,
    y0: 1600,
    y1: 1600,
  });
  return level;
}

describe("model", () => {
  it("creates an empty valid level", () => {
    expect(validateLevel(createLevel())).toEqual([]);
  });

  it("round-trips through JSON without loss", () => {
    const level = sample();
    const parsed = parseLevel(serializeLevel(level));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.level).toEqual(level);
  });

  it("serialization is stable", () => {
    const level = sample();
    const parsed = parseLevel(serializeLevel(level));
    expect(parsed.ok && serializeLevel(parsed.level)).toBe(serializeLevel(level));
  });

  it("derives ids and seeds deterministically", () => {
    expect(nextId("band", [])).toBe("band-1");
    expect(nextId("band", [{ id: "band-1" }, { id: "band-4" }, { id: "x-9" }])).toBe("band-5");
    expect(hashSeed("terrain-1")).toBe(hashSeed("terrain-1"));
    expect(hashSeed("terrain-1")).not.toBe(hashSeed("terrain-2"));
  });

  it("rejects malformed files with readable errors", () => {
    expect(parseLevel("nope")).toEqual({
      ok: false,
      errors: ["file is not valid JSON"],
    });
    const bad = { ...sample(), version: 2 };
    expect(validateLevel(bad)).toContain("version must be 1");

    const flat = sample();
    flat.bands[0]!.x0 = 500;
    expect(validateLevel(flat).join("\n")).toMatch(/x0 must be less than x1/);

    const dupes = sample();
    dupes.borealis.push({ id: "gem-1", x: 1, y: 1, pitch: "C4" });
    expect(validateLevel(dupes).join("\n")).toMatch(/duplicate id "gem-1"/);

    const thin = sample();
    thin.terrain[0]!.points = [{ x: 0, y: 0 }];
    expect(validateLevel(thin).join("\n")).toMatch(/at least 2 points/);
  });

  it("assigns Borealis pitches from A3 to E5 only", () => {
    expect(BOREALIS_PITCHES[0]).toBe("A3");
    expect(BOREALIS_PITCHES[BOREALIS_PITCHES.length - 1]).toBe("E5");
    expect(BOREALIS_PITCHES).toContain(DEFAULT_BOREALIS_PITCH);
    expect(validateLevel(sample())).toEqual([]);

    for (const pitch of ["A3", "E5"] as const) {
      const ok = sample();
      ok.borealis[0]!.pitch = pitch;
      expect(validateLevel(ok)).toEqual([]);
    }
    for (const pitch of ["G3", "F5", "C#4", "nope"]) {
      const bad = sample();
      bad.borealis[0]!.pitch = pitch as never;
      expect(validateLevel(bad).join("\n")).toMatch(/pitch must be one of A3 to E5/);
    }
  });

  it("bands carry no pitch: old files with one still load, without it", () => {
    const old = JSON.parse(JSON.stringify(sample()));
    old.bands[0].pitch = "G4";
    expect(validateLevel(old)).toEqual([]);
    const parsed = parseLevel(JSON.stringify(old));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect("pitch" in parsed.level.bands[0]!).toBe(false);
    expect(serializeLevel(sample())).not.toMatch(/"bands":[^\]]*pitch/);
  });

  it("strips unknown keys when parsing", () => {
    const text = JSON.stringify({ ...sample(), stray: true });
    const parsed = parseLevel(text);
    expect(parsed.ok && "stray" in parsed.level).toBe(false);
  });

  it("names files by slug", () => {
    expect(levelFileName(createLevel("Zig Run #2"))).toBe("zig-run-2.level.json");
  });

  it("flips terrain direction", () => {
    const level = flipTerrain(sample(), "terrain-1");
    expect(level.terrain[0]!.points[0]).toEqual({ x: 900, y: 280 });
  });

  it("reorders Borealis in goal order", () => {
    let level = sample();
    level = addBorealis(level, { id: "gem-2", x: 1, y: 1, pitch: "C4" });
    level = addBorealis(level, { id: "gem-3", x: 2, y: 2, pitch: "D4" });
    level = reorderBorealis(level, "gem-3", 0);
    expect(level.borealis.map((g) => g.id)).toEqual(["gem-3", "gem-1", "gem-2"]);
  });

  it("deletes a terrain vertex only while the shape stays valid", () => {
    const level = sample();
    const trimmed = removeSelection(level, { kind: "terrain", id: "terrain-1", vertex: 1 });
    expect(trimmed.terrain[0]!.points).toHaveLength(2);
    const gone = removeSelection(trimmed, { kind: "terrain", id: "terrain-1", vertex: 0 });
    expect(gone.terrain).toHaveLength(0);
  });

  it("removes each kind of item", () => {
    let level = sample();
    level = removeSelection(level, { kind: "band", id: "band-1" });
    level = removeSelection(level, { kind: "borealis", id: "gem-1" });
    level = removeSelection(level, { kind: "exit", id: "exit-1" });
    level = removeSelection(level, { kind: "enter", id: "enter" });
    expect(level.bands).toHaveLength(0);
    expect(level.borealis).toHaveLength(0);
    expect(level.exits).toHaveLength(0);
    expect(level.enter).toBeNull();
  });
});

describe("geometry", () => {
  it("round-trips logical and view space in both views", () => {
    for (const view of ["portrait", "landscape"] as const) {
      const p = { x: 123.5, y: 456.25 };
      const back = fromView(view, toView(view, p));
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it("snaps to a view-space grid", () => {
    const snapped = snapToGrid("portrait", { x: 452, y: 802 }, 4);
    const v = toView("portrait", snapped);
    expect(v.x % 4).toBeCloseTo(0, 1);
    expect(snapToGrid("portrait", { x: 1.234, y: 5.678 }, 0)).toEqual({ x: 1.23, y: 5.68 });
  });

  it("measures distance to a segment", () => {
    const hit = distToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(hit.dist).toBe(3);
    expect(hit.at).toEqual({ x: 5, y: 0 });
  });
});
