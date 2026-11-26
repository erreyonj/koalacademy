import { describe, expect, it } from "vitest";
import {
  aimModeForBeat,
  emptyRouteMemory,
  markCrashSeen,
  markStorySeen,
  openingsForBeat,
  PLAYABLE_BEATS,
  stairsFallEnter,
  zigJumpFromLeftEnter,
} from "../modules/progress";
import { STAIR_BAND, WORLD_W } from "../modules/sim";

describe("region travel", () => {
  it("keeps crash out of the playable region list", () => {
    expect(PLAYABLE_BEATS).not.toContain("notch-crash");
    expect(PLAYABLE_BEATS).toContain("launch-teach");
    expect(PLAYABLE_BEATS).toContain("notch-calibrate");
    expect(PLAYABLE_BEATS).toContain("launch-bridge");
    expect(PLAYABLE_BEATS).toContain("launch-tail");
  });

  it("uses vertical aim only on Launch teach; Bridge and Tail are free", () => {
    expect(aimModeForBeat("launch-teach")).toBe("vertical");
    expect(aimModeForBeat("launch-tail")).toBe("free");
    expect(aimModeForBeat("launch-bridge")).toBe("free");
    expect(aimModeForBeat("notch-calibrate")).toBe("free");
  });

  it("leaves exactly the forward exits and bottom gaps unsealed", () => {
    const facings = (id: Parameters<typeof openingsForBeat>[0]) =>
      openingsForBeat(id)
        .map((opening) => opening.facing)
        .sort();
    expect(facings("notch-calibrate")).toEqual(["up"]);
    expect(facings("launch-bridge")).toEqual(["down", "up"]);
    expect(facings("stairs-anach")).toEqual(["down", "right"]);
    expect(facings("zig-1")).toEqual(["down", "down", "up"]);
    expect(facings("launch-tail")).toEqual(["down"]);
    expect(openingsForBeat("launch-teach")).toEqual([]);
  });

  it("Zig floor gaps sit left and right of the peak island", () => {
    const [left, right] = openingsForBeat("zig-1")
      .filter((opening) => opening.facing === "down")
      .sort((a, b) => a.x0 - b.x0);
    expect(left!.x1).toBeLessThan(right!.x0);
    expect(left!.x0).toBe(0);
    expect(right!.x1).toBe(WORLD_W);
  });

  it("reverse enters: Stairs lands on the band's right edge, Zig warp starts left", () => {
    const fall = stairsFallEnter();
    expect(fall.x).toBeGreaterThan((STAIR_BAND.x0 + STAIR_BAND.x1) / 2);
    expect(fall.vy).toBeLessThan(0);
    const jump = zigJumpFromLeftEnter();
    expect(jump.x).toBeLessThan(WORLD_W * 0.3);
    expect(jump.vx).toBeGreaterThan(0);
    expect(jump.vy).toBeGreaterThan(0);
  });

  it("tracks crash and story visits in route memory", () => {
    let memory = emptyRouteMemory();
    memory = markCrashSeen(memory);
    expect(memory.crashSeen).toBe(true);
    memory = markStorySeen(memory, "notch-calibrate");
    memory = markStorySeen(memory, "notch-calibrate");
    expect(memory.storySeen).toEqual(["notch-calibrate"]);
  });
});
