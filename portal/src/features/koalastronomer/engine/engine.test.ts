import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "../data/destinations";
import {
  validateChallengeDefinition,
  WORD_CHALLENGES,
} from "../data/word-challenges";
import { completeChallenge, validateWordChallenge } from "./archive-engine";
import {
  getAvailableDestinations,
  getRevealedRegions,
  isDestinationUnlocked,
} from "./atlas-engine";
import {
  createInitialState,
  type DialConfiguration,
  type GameState,
  parseSavedGameState,
  serializeGameState,
  type WordChallenge,
} from "./game-state";
import {
  ascendingIntervalPitches,
  calculateInterval,
  isValidNoteLetter,
  stepNoteLetter,
} from "./intervals";
import {
  applyDialMovement,
  calculateResetRefund,
  completeObservation,
  dialDistanceFromTarget,
  findOptimalSolution,
  isTargetMatched,
  moveDial,
  openTelescopeBriefing,
  resetCurrentObservation,
  startObservation,
} from "./telescope-engine";

describe("calculateInterval & ascendingIntervalPitches", () => {
  it("calculates unison (1) for identical notes", () => {
    expect(calculateInterval("A", "A")).toBe(1);
    expect(calculateInterval("E", "E")).toBe(1);
  });

  it("calculates ascending diatonic intervals without wrapping", () => {
    expect(calculateInterval("A", "B")).toBe(2);
    expect(calculateInterval("A", "E")).toBe(5);
    expect(calculateInterval("B", "F")).toBe(5);
  });

  it("wraps around from G to A for ascending intervals", () => {
    expect(calculateInterval("E", "C")).toBe(6);
    expect(calculateInterval("G", "D")).toBe(5);
    expect(calculateInterval("F", "B")).toBe(4);
    expect(calculateInterval("D", "C")).toBe(7);
  });

  it("validates note letters strictly as A through G and steps modulo 7", () => {
    expect(isValidNoteLetter("A")).toBe(true);
    expect(isValidNoteLetter("G")).toBe(true);
    expect(isValidNoteLetter("H")).toBe(false);
    expect(stepNoteLetter("A", 1)).toBe("B");
    expect(stepNoteLetter("G", 1)).toBe("A");
    expect(stepNoteLetter("A", -1)).toBe("G");
  });

  it("always selects an ascending or unison pitch pair for playback", () => {
    // Non-wrapping in scientific pitch (C4 < D4 < E4 < F4 < G4 < A4 < B4)
    expect(ascendingIntervalPitches("C", "E")).toEqual(["C4", "E4"]);
    expect(ascendingIntervalPitches("A", "B")).toEqual(["A4", "B4"]);
    expect(ascendingIntervalPitches("A", "A")).toEqual(["A4", "A4"]);
    // Wrapping past B4 into octave 5 so playback never descends
    expect(ascendingIntervalPitches("B", "F")).toEqual(["B4", "F5"]);
    expect(ascendingIntervalPitches("B", "D")).toEqual(["B4", "D5"]);
    expect(ascendingIntervalPitches("F", "D")).toEqual(["F4", "D5"]);
    expect(ascendingIntervalPitches("A", "E")).toEqual(["A4", "E5"]);
    expect(ascendingIntervalPitches("D", "C")).toEqual(["D4", "C5"]);
  });
});

describe("Archive engine & curated word bank", () => {
  const sampleChallenge: WordChallenge = {
    id: "beef-1",
    title: "Record 01",
    answer: "BEEF",
    missingPositions: [0, 3],
    difficulty: "easy",
    intervalValue: 5,
    category: "Celestial Designation",
    hint: "Provision",
  };

  it("validates correct first and second letters and returns the interval", () => {
    const result = validateWordChallenge(sampleChallenge, "B", "F");
    expect(result.valid).toBe(true);
    expect(result.firstNote).toBe("B");
    expect(result.secondNote).toBe("F");
    expect(result.intervalValue).toBe(5);
    expect(result.error).toBeNull();
  });

  it("flags wrong first letter without spending points", () => {
    const result = validateWordChallenge(sampleChallenge, "A", "F");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("first-letter-wrong");
  });

  it("flags wrong second letter", () => {
    const result = validateWordChallenge(sampleChallenge, "B", "E");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("second-letter-wrong");
  });

  it("awards calibration points once per completed challenge", () => {
    const initial = createInitialState();
    expect(initial.currentScreen).toBe("intro");
    const afterFirst = completeChallenge(initial, "beef-1", 5);
    expect(afterFirst.calibrationPoints).toBe(5);
    expect(afterFirst.completedChallengeIds).toEqual(["beef-1"]);

    const afterDuplicate = completeChallenge(afterFirst, "beef-1", 5);
    expect(afterDuplicate.calibrationPoints).toBe(5);
    expect(afterDuplicate.completedChallengeIds).toEqual(["beef-1"]);
  });

  it("has 16 valid A-G word challenges whose stored intervals match calculateInterval", () => {
    expect(WORD_CHALLENGES.length).toBe(16);
    for (const challenge of WORD_CHALLENGES) {
      expect(validateChallengeDefinition(challenge)).toBe(true);
    }
  });
});

describe("Telescope gear system, reset refunds & puzzle budgets", () => {
  const origin: DialConfiguration = { range: 0, focus: 0, alignment: 0 };

  it("moves Range CW: Range +1, Focus -1 (mod 7)", () => {
    const res = moveDial(origin, 5, "range", "clockwise");
    expect(res).toEqual({
      config: { range: 1, focus: 6, alignment: 0 },
      pointsSpent: 1,
    });
  });

  it("moves Focus CW: Focus +1, Range -1, Alignment -1 (mod 7)", () => {
    const res = moveDial(origin, 5, "focus", "clockwise");
    expect(res).toEqual({
      config: { range: 6, focus: 1, alignment: 6 },
      pointsSpent: 1,
    });
  });

  it("moves Alignment CW: Alignment +1, Focus -1 (mod 7)", () => {
    const res = moveDial(origin, 5, "alignment", "clockwise");
    expect(res).toEqual({
      config: { range: 0, focus: 6, alignment: 1 },
      pointsSpent: 1,
    });
  });

  it("inverts every clockwise move when moved counterclockwise", () => {
    for (const dial of ["range", "focus", "alignment"] as const) {
      const cw = moveDial(
        { range: 3, focus: 0, alignment: 6 },
        2,
        dial,
        "clockwise",
      );
      expect(cw).not.toBeNull();
      const ccw = moveDial(cw!.config, 2, dial, "counterclockwise");
      expect(ccw?.config).toEqual({ range: 3, focus: 0, alignment: 6 });
    }
  });

  it("blocks movement when calibrationPoints is 0", () => {
    expect(moveDial(origin, 0, "range", "clockwise")).toBeNull();
  });

  it("tracks target matching and circular dial distance", () => {
    expect(isTargetMatched(origin, { range: 0, focus: 0, alignment: 0 })).toBe(
      true,
    );
    expect(isTargetMatched(origin, { range: 0, focus: 0, alignment: 1 })).toBe(
      false,
    );
    expect(dialDistanceFromTarget(origin, origin)).toBe(0);
    expect(
      dialDistanceFromTarget(origin, { range: 6, focus: 1, alignment: 0 }),
    ).toBe(2);
  });

  it("calculates difficulty-based reset refunds (Easy 50%, Medium 25%, Hard 0%)", () => {
    expect(calculateResetRefund(20, "easy")).toBe(10);
    expect(calculateResetRefund(20, "medium")).toBe(5);
    expect(calculateResetRefund(20, "hard")).toBe(0);
    expect(calculateResetRefund(7, "easy")).toBe(3);

    const mercury = DESTINATIONS[0];
    let state: GameState = {
      ...createInitialState("easy"),
      calibrationPoints: 0,
      currentScreen: "telescope",
      currentDestinationId: mercury.id,
      telescopeDialState: { range: 4, focus: 2, alignment: 5 },
      telescopeSpentPoints: 20,
    };

    state = resetCurrentObservation(state, mercury, "easy");
    expect(state.calibrationPoints).toBe(10);
    expect(state.telescopeDialState).toEqual(mercury.startingConfiguration);
    expect(state.telescopeSpentPoints).toBe(0);
  });

  it("resumes in-progress dials when returning to the same destination and resets when switching", () => {
    const mercury = DESTINATIONS[0];
    const outerBelt = DESTINATIONS[1];

    let state = { ...createInitialState("hard"), calibrationPoints: 10 };
    state = openTelescopeBriefing(state, mercury);
    expect(state.currentScreen).toBe("telescope-briefing");
    state = startObservation(state, mercury);
    expect(state.currentScreen).toBe("telescope");

    state = applyDialMovement(state, "range", "clockwise");
    expect(state.telescopeDialState).toEqual({
      range: 1,
      focus: 6,
      alignment: 0,
    });
    expect(state.telescopeSpentPoints).toBe(1);
    expect(state.calibrationPoints).toBe(9);

    // Leave to archive and return to the same destination
    state = { ...state, currentScreen: "archive" };
    state = startObservation(state, mercury);
    expect(state.telescopeDialState).toEqual({
      range: 1,
      focus: 6,
      alignment: 0,
    });
    expect(state.telescopeSpentPoints).toBe(1);

    // On Hard, resetting dials refunds 0 points and clears telescopeSpentPoints
    state = resetCurrentObservation(state, mercury, "hard");
    expect(state.telescopeDialState).toEqual(mercury.startingConfiguration);
    expect(state.telescopeSpentPoints).toBe(0);
    expect(state.calibrationPoints).toBe(9);

    // Starting a different destination replaces the active dials
    state = startObservation(state, outerBelt);
    expect(state.currentDestinationId).toBe(outerBelt.id);
    expect(state.telescopeDialState).toEqual(outerBelt.startingConfiguration);
    expect(state.telescopeSpentPoints).toBe(0);
  });

  it("verifies every destination has a shortest path within its movementBudget", () => {
    const expectedLengths: Record<string, number> = {
      "mercury-sector": 7,
      "outer-belt": 4,
      "distant-region": 5,
      "the-new-body": 4,
    };

    for (const dest of DESTINATIONS) {
      const solution = findOptimalSolution(
        dest.startingConfiguration,
        dest.targetConfiguration,
        dest.movementBudget,
      );
      expect(solution).not.toBeNull();
      expect(solution!.length).toBe(expectedLengths[dest.id]);
      expect(solution!.length).toBeLessThanOrEqual(dest.movementBudget);
    }
  });
});

describe("Atlas unlock progression & persistence serialization", () => {
  it("unlocks destinations sequentially as requirements are met", () => {
    let state = createInitialState();
    expect(
      getAvailableDestinations(DESTINATIONS, state).map((d) => d.id),
    ).toEqual(["mercury-sector"]);

    state = completeObservation(state, "mercury-sector");
    expect(
      getRevealedRegions(DESTINATIONS, state.completedDestinationIds),
    ).toEqual(["mercury-sector"]);
    expect(
      isDestinationUnlocked(DESTINATIONS[1], state.completedDestinationIds),
    ).toBe(true);
    expect(
      getAvailableDestinations(DESTINATIONS, state).map((d) => d.id),
    ).toEqual(["outer-belt"]);
  });

  it("round-trips valid saved state and falls back gracefully on corrupt JSON", () => {
    let state = createInitialState("medium");
    state = completeChallenge(state, "beef-1", 5);
    state = startObservation(state, DESTINATIONS[0]);

    const raw = serializeGameState(state);
    const restored = parseSavedGameState(raw);
    expect(restored).toEqual(state);

    expect(parseSavedGameState("{not-valid-json")).toEqual(
      createInitialState(),
    );
  });
});
