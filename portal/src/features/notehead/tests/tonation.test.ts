import { describe, expect, it } from "vitest";
import { eventsFor } from "../routes/events";
import {
  applyCollect,
  awardIfNew,
  clampTonation,
  emptyAttempt,
  emptyRouteTonation,
  intervalHudPair,
  noteTailGateOk,
  tailHullRequired,
  tailTonationRequired,
  TONATION_CAP,
  wipeTonation,
} from "../modules/tonation";

const challengeFor = (levelId: string) => eventsFor("notch1", levelId).tonation;

describe("Tonation", () => {
  it("defines notch1 / stairs1 / zig1 payouts that sum to the cap", () => {
    const notch = challengeFor("notch1")!;
    const stairs = challengeFor("stairs1")!;
    const zig = challengeFor("zig1")!;
    expect(notch.pitches).toEqual(["E4", "A4"]);
    expect(notch.payout).toBe(5);
    expect(stairs.payout).toBe(9);
    expect(zig.payout).toBe(10);
    expect(notch.payout + stairs.payout + zig.payout).toBe(TONATION_CAP);
  });

  it("awards once per level and clamps to the cap", () => {
    const challenge = challengeFor("notch1")!;
    let route = emptyRouteTonation();
    route = awardIfNew(route, "notch1", challenge.payout);
    expect(route.value).toBe(5);
    route = awardIfNew(route, "notch1", challenge.payout);
    expect(route.value).toBe(5);
    expect(clampTonation(99)).toBe(TONATION_CAP);
  });

  it("progresses, succeeds, and fails interval attempts", () => {
    const challenge = challengeFor("notch1")!;
    const mid = applyCollect(challenge, emptyAttempt(), "E4");
    expect(mid.kind).toBe("progress");
    const win = applyCollect(challenge, mid.attempt, "A4");
    expect(win.kind).toBe("success");

    const fail = applyCollect(challenge, emptyAttempt(), "A4");
    expect(fail.kind).toBe("fail");
    expect(fail.attempt.failed).toBe(true);
  });

  it("shows progressive HUD pairs for multi-note challenges", () => {
    const stairs = challengeFor("stairs1")!;
    expect(intervalHudPair(stairs, emptyAttempt())).toEqual(["C4", "E4"]);
    const afterC = applyCollect(stairs, emptyAttempt(), "C4").attempt;
    expect(intervalHudPair(stairs, afterC)).toEqual(["E4", "G4"]);
  });

  it("hosts no interval on the levels in between", () => {
    expect(challengeFor("landing1")).toBeUndefined();
    expect(challengeFor("8thTail1")).toBeUndefined();
    expect(challengeFor("nowhere")).toBeUndefined();
  });

  it("gates the eighth Note-Tail by difficulty", () => {
    expect(tailTonationRequired("easy")).toBe(19);
    expect(tailTonationRequired("medium")).toBe(19);
    expect(tailTonationRequired("hard")).toBe(24);
    expect(tailHullRequired("easy")).toBe(0);
    expect(tailHullRequired("medium")).toBe(2);
    expect(tailHullRequired("hard")).toBe(3);

    expect(noteTailGateOk(19, 1, "easy").ok).toBe(true);
    expect(noteTailGateOk(18, 8, "easy").ok).toBe(false);
    expect(noteTailGateOk(19, 1, "medium").reason).toMatch(/Hull/i);
    expect(noteTailGateOk(19, 2, "medium").ok).toBe(true);
    expect(noteTailGateOk(24, 2, "hard").ok).toBe(false);
    expect(noteTailGateOk(24, 3, "hard").ok).toBe(true);
  });

  it("wipes the bank for Hard breach", () => {
    let route = awardIfNew(emptyRouteTonation(), "stairs1", 9);
    expect(route.value).toBe(9);
    route = wipeTonation();
    expect(route).toEqual(emptyRouteTonation());
  });
});
