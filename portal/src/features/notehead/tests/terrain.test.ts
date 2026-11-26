import { describe, expect, it } from "vitest";
import {
  type Aim,
  type RegionId,
  LAUNCH_BAND,
  NOTCH_BLOCK,
  NOTCH_FLOOR,
  NOTCH_POCKET,
  PROFILES,
  SHIP_R,
  STAIR_BAND,
  WORLD_W,
  STAIR_TREADS,
  ZIG_LEFT,
  ZIG_PEAK,
  ZIG_RIGHT,
  svgViewFor,
  chartShot,
  ledgesFor,
  restBody,
  restOn,
  toSvg,
} from "../modules/sim";
import {
  LAUNCH_FLOOR_GAP,
  STAIRS_FLOOR_GAP,
  ZIG_FLOOR_GAP_LEFT,
  ZIG_FLOOR_GAP_RIGHT,
} from "../modules/progress";
import { INK, insideMass, massesFor } from "../modules/terrain";

const REGION_IDS: RegionId[] = ["launch", "stairs", "notch", "zig"];

function covered(regionId: RegionId, x: number, y: number): string | null {
  const point = toSvg(x, y, regionId);
  const hit = massesFor(regionId).find((mass) => insideMass(point, mass));
  return hit?.id ?? null;
}

describe("terrain masses", () => {
  it("builds the same rock every time", () => {
    for (const id of REGION_IDS) {
      expect(massesFor(id)).toBe(massesFor(id));
      expect(massesFor(id).length).toBeGreaterThan(0);
    }
  });

  it("keeps score marks inside their own rock and inside the frame", () => {
    for (const id of REGION_IDS) {
      const view = svgViewFor(id);
      for (const mass of massesFor(id)) {
        for (const point of mass.ticks.flat()) {
          expect(insideMass(point, mass)).toBe(true);
          expect(point.x).toBeGreaterThan(0);
          expect(point.x).toBeLessThan(view.w);
          expect(point.y).toBeGreaterThan(0);
          expect(point.y).toBeLessThan(view.h);
        }
      }
    }
  });

  it("leaves every rest spot in open sky", () => {
    const spots: [RegionId, typeof LAUNCH_BAND][] = [
      ["launch", LAUNCH_BAND],
      ["stairs", STAIR_BAND],
      ["notch", NOTCH_POCKET],
      ["notch", NOTCH_FLOOR],
      ["notch", NOTCH_BLOCK],
      ["zig", ZIG_PEAK],
      ["zig", ZIG_LEFT],
      ["zig", ZIG_RIGHT],
    ];
    for (const [regionId, ledge] of spots) {
      const body = restOn(ledge);
      expect(covered(regionId, body.x, body.y)).toBeNull();
    }
    STAIR_TREADS.forEach((tread, index) => {
      const next = STAIR_TREADS[index + 1];
      const open = next ? (tread.x0 + next.x0) / 2 : undefined;
      const body = restOn(tread, open);
      expect(covered("stairs", body.x, body.y)).toBeNull();
    });
  });

  it("puts rock right under stair treads, the notch block, and zig shelves", () => {
    const under = (regionId: RegionId, ledge: typeof LAUNCH_BAND) => {
      const top = toSvg((ledge.x0 + ledge.x1) / 2, ledge.y, regionId);
      const probe = { x: top.x, y: top.y + INK };
      return massesFor(regionId).some((mass) => insideMass(probe, mass));
    };
    for (const tread of STAIR_TREADS) expect(under("stairs", tread)).toBe(true);
    expect(under("notch", NOTCH_BLOCK)).toBe(true);
    expect(under("zig", ZIG_PEAK)).toBe(true);
    expect(under("zig", ZIG_LEFT)).toBe(true);
    expect(under("zig", ZIG_RIGHT)).toBe(true);
  });

  it("keeps every bottom-edge exit gap in open sky", () => {
    const gaps: [RegionId, { x0: number; x1: number }][] = [
      ["launch", LAUNCH_FLOOR_GAP],
      ["stairs", STAIRS_FLOOR_GAP],
      ["zig", ZIG_FLOOR_GAP_LEFT],
      ["zig", ZIG_FLOOR_GAP_RIGHT],
    ];
    for (const [regionId, gap] of gaps) {
      for (let x = gap.x0 + 5; x < gap.x1; x += 15) {
        expect(covered(regionId, x, SHIP_R * 0.5)).toBeNull();
      }
    }
    // The Zig peak island fills the floor between the two gaps.
    const mid = (ZIG_FLOOR_GAP_LEFT.x1 + ZIG_FLOOR_GAP_RIGHT.x0) / 2;
    expect(covered("zig", mid, SHIP_R * 0.5)).toBe("zig-peak");
  });

  it("keeps the Zig cliff bodies whole down to the frame", () => {
    // Deep in each cliff's lower body: guards the outline-closing bug that
    // sliced a diagonal out of both cliffs.
    expect(covered("zig", 30, 400)).toBe("zig-cliff-left");
    expect(covered("zig", 40, 700)).toBe("zig-cliff-left");
    expect(covered("zig", WORLD_W - 30, 600)).toBe("zig-cliff-right");
    expect(covered("zig", WORLD_W - 30, 400)).toBe("zig-cliff-right");
  });

  it("does not turn rock into ledges", () => {
    expect(ledgesFor("launch")).toHaveLength(1);
    expect(ledgesFor("stairs")).toHaveLength(4);
    expect(ledgesFor("notch")).toHaveLength(3);
    expect(ledgesFor("zig")).toHaveLength(3);
  });
});

describe("clearing shots fly through open sky", () => {
  // Portrait corridors with verified open paths. Zig/notch lip shots skim
  // near rock; rest-spot coverage above already guards those lips.
  const shots: [RegionId, Aim][] = [
    ["launch", { power: 1, angle: 0 }],
    ["stairs", { power: 0.88, angle: 0.22 }],
  ];

  for (const [regionId, aim] of shots) {
    it(`${regionId} shot stays out of the rock`, () => {
      const chart = chartShot(regionId, restBody(regionId), aim, PROFILES.easy.aimInset);
      expect(chart.points.length).toBeGreaterThan(4);
      for (const point of chart.points) {
        expect(covered(regionId, point.x, point.y)).toBeNull();
      }
    });
  }
});
