import { describe, expect, it } from "vitest";
import {
  type Aim,
  type RegionId,
  PROFILES,
  chartShot,
  ledgesFor,
  restBody,
  restOn,
  svgViewFor,
  toSvg,
} from "../modules/sim";
import { insideMass, massesFor } from "../modules/terrain";
import { getRoute } from "../routes/registry";

const route = getRoute();
const REGION_IDS: RegionId[] = route.levels.map((level) => level.id);

function covered(regionId: RegionId, x: number, y: number): string | null {
  const point = toSvg(x, y, regionId);
  const hit = massesFor(regionId).find((mass) => insideMass(point, mass));
  return hit?.id ?? null;
}

describe("terrain masses", () => {
  it("builds the same rock every time", () => {
    for (const id of REGION_IDS) {
      expect(massesFor(id)).toBe(massesFor(id));
    }
    for (const level of route.levels) {
      expect(massesFor(level.id)).toBe(route.scenes.get(level.id)!.masses);
    }
    // The bare launch pseudo-region (the editor's portrait frame) has no rock.
    expect(massesFor("launch")).toEqual([]);
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
    for (const level of route.levels) {
      for (const ledge of ledgesFor(level.id)) {
        const body = restOn(ledge);
        expect(covered(level.id, body.x, body.y), `${level.id} ${ledge.id}`).toBeNull();
      }
    }
  });

  it("leaves every Enter pose and every Borealis gem in open sky", () => {
    for (const level of route.levels) {
      const scene = route.scenes.get(level.id)!;
      // An Enter may sit just past the frame edge; only in-frame poses are checked.
      if (scene.start.y > 0 && scene.start.y < 1600) {
        expect(covered(level.id, scene.start.x, scene.start.y), `${level.id} enter`).toBeNull();
      }
      for (const spot of level.borealis) {
        expect(covered(level.id, spot.x, spot.y), `${level.id} ${spot.id}`).toBeNull();
      }
    }
  });

  it("keeps every bottom-edge exit gap in open sky", () => {
    for (const level of route.levels) {
      for (const exit of level.exits) {
        if (exit.facing !== "down") continue;
        for (let x = exit.x0 + 5; x < exit.x1; x += 15) {
          expect(covered(level.id, x, 10), `${level.id} ${exit.id} @${x}`).toBeNull();
        }
      }
    }
  });

  it("registers one ledge per authored band", () => {
    expect(ledgesFor("launch")).toHaveLength(1);
    for (const level of route.levels) {
      const scene = route.scenes.get(level.id)!;
      expect(ledgesFor(level.id)).toBe(scene.ledges);
      expect(ledgesFor(level.id).length).toBeGreaterThanOrEqual(level.bands.length);
    }
  });
});

describe("clearing shots fly through open sky", () => {
  const shots: [RegionId, Aim][] = [
    ["landing1", { power: 0.5, angle: 0 }],
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
