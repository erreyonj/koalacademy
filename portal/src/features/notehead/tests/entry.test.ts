import { describe, expect, it } from "vitest";
import {
  FIXED_DT,
  LAUNCH_BAND,
  STAIR_BAND,
  WORLD_H,
  ZIG_PEAK,
  step,
  type Body,
} from "../modules/sim";
import {
  PROGRESSION,
  liveLedges,
  repairForBeat,
  stepPolicyFor,
  type BeatId,
} from "../modules/progress";

function settle(beatId: BeatId): { landed: string | null; body: Body } {
  const beat = PROGRESSION[beatId];
  const repair = repairForBeat(beatId);
  const policy = stepPolicyFor(beat, repair);
  let body = beat.enter(repair);
  expect(body.restingOn).toBeNull();
  let landed: string | null = null;
  for (let i = 0; i < 1200; i++) {
    const result = step(
      body,
      liveLedges(beat.regionId, null),
      FIXED_DT,
      undefined,
      policy,
    );
    body = result.body;
    if (result.landedId && body.restingOn) {
      landed = result.landedId;
      break;
    }
    if (body.y < -200 || body.y > WORLD_H + 200) break;
  }
  return { landed, body };
}

describe("beat entry landings", () => {
  it("launch-bridge rises onto the launch Frequency Band", () => {
    const { landed, body } = settle("launch-bridge");
    expect(landed).toBe(LAUNCH_BAND.id);
    expect(body.restingOn).toBe(LAUNCH_BAND.id);
  });

  it("stairs-anach arrives on the approach Frequency Band", () => {
    const { landed, body } = settle("stairs-anach");
    expect(landed).toBe(STAIR_BAND.id);
    expect(body.restingOn).toBe(STAIR_BAND.id);
  });

  it("zig-1 rises onto the peak Frequency Band", () => {
    const { landed, body } = settle("zig-1");
    expect(landed).toBe(ZIG_PEAK.id);
    expect(body.restingOn).toBe(ZIG_PEAK.id);
  });
});
