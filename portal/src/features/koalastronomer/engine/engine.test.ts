import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "../data/destinations";
import {
  getTraceFigure,
  TRACE_FIGURES,
  TRACE_FIGURES_BY_DIFFICULTY,
} from "../data/trace-figures";
import {
  validateChallengeDefinition,
  WORD_CHALLENGES,
} from "../data/word-challenges";
import {
  completeChallenge,
  getChallengeReward,
  validateWordChallenge,
} from "./archive-engine";
import {
  getAvailableDestinations,
  getRevealedRegions,
  isDestinationUnlocked,
} from "./atlas-engine";
import {
  createInitialState,
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
  completeObservation,
  DIAL_NAMES,
  getComponentCost,
  getComponentFigure,
  getDestinationTotalCost,
  getFailedTracePenalty,
  getFirstDialLineHint,
  getRemainingDestinationCost,
  isGameOver,
  isObservationSolved,
  openTelescopeBriefing,
  recordComponentStuck,
  solveComponent,
  startObservation,
} from "./telescope-engine";
import {
  createTraceState,
  degrees,
  extendTrace,
  findEulerianPath,
  isComplete,
  isEulerian,
  isStuck,
  validStartNodes,
} from "./trace-engine";

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
    expect(ascendingIntervalPitches("C", "E")).toEqual(["C4", "E4"]);
    expect(ascendingIntervalPitches("A", "B")).toEqual(["A4", "B4"]);
    expect(ascendingIntervalPitches("A", "A")).toEqual(["A4", "A4"]);
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

describe("One-line Eulerian trace engine & figure bank economy", () => {
  it("verifies all 36 trace figures across difficulties are connected Eulerian graphs", () => {
    for (const figures of Object.values(TRACE_FIGURES_BY_DIFFICULTY)) {
      expect(figures.length).toBe(12);
      for (const figure of figures) {
        expect(isEulerian(figure), figure.id).toBe(true);
        const path = findEulerianPath(figure);
        expect(path).not.toBeNull();
        expect(path!.length).toBe(figure.edges.length + 1);
      }
    }
    expect(TRACE_FIGURES).toBe(TRACE_FIGURES_BY_DIFFICULTY.easy);
  });

  it("makes every ring progressively longer from Easy to Medium to Hard", () => {
    for (const dest of DESTINATIONS) {
      for (const ring of DIAL_NAMES) {
        const easy = getComponentFigure(dest, ring, "easy").edges.length;
        const medium = getComponentFigure(dest, ring, "medium").edges.length;
        const hard = getComponentFigure(dest, ring, "hard").edges.length;
        expect(medium).toBeGreaterThan(easy);
        expect(hard).toBeGreaterThan(medium);
      }
    }
  });

  it("keeps every difficulty's total ring cost at least 10 below its Archive total", () => {
    const archiveTotal = WORD_CHALLENGES.reduce(
      (sum, c) => sum + c.intervalValue,
      0,
    );
    expect(archiveTotal).toBe(65);

    const totalCost = (difficulty: "easy" | "medium" | "hard") =>
      DESTINATIONS.reduce(
        (sum, dest) => sum + getDestinationTotalCost(dest, difficulty),
        0,
      );
    expect(totalCost("easy")).toBeLessThanOrEqual(55);
    expect(totalCost("medium")).toBe(totalCost("easy"));

    const hardArchiveTotal = WORD_CHALLENGES.reduce(
      (sum, c) => sum + getChallengeReward(c.intervalValue, "hard"),
      0,
    );
    expect(hardArchiveTotal).toBe(130);
    expect(hardArchiveTotal - totalCost("hard")).toBeGreaterThanOrEqual(10);
  });

  it("doubles Archive rewards on Hard only", () => {
    expect(getChallengeReward(5, "easy")).toBe(5);
    expect(getChallengeReward(5, "medium")).toBe(5);
    expect(getChallengeReward(5, "hard")).toBe(10);
  });

  it("shows the follow-this-line hint only on Easy's first dial before the first step", () => {
    const mercury = DESTINATIONS[0];
    const fig = getComponentFigure(mercury, "range", "easy");
    const easy = createInitialState("easy");

    const hint = getFirstDialLineHint(easy, mercury, "range", fig);
    expect(hint).not.toBeNull();
    expect(fig.edges.some(([a, b]) =>
      (a === hint![0] && b === hint![1]) || (a === hint![1] && b === hint![0]),
    )).toBe(true);

    expect(getFirstDialLineHint(easy, mercury, "range", fig, 1)).toBeNull();
    expect(getFirstDialLineHint(easy, mercury, "focus", fig)).toBeNull();
    expect(
      getFirstDialLineHint(createInitialState("medium"), mercury, "range", fig),
    ).toBeNull();
    expect(
      getFirstDialLineHint(createInitialState("hard"), mercury, "focus", fig, 0, true),
    ).not.toBeNull();

    const afterRange = solveComponent(
      startObservation({ ...easy, calibrationPoints: 20 }, mercury),
      mercury,
      "range",
    );
    expect(getFirstDialLineHint(afterRange, mercury, "range", fig)).toBeNull();
  });

  it("identifies odd-degree start nodes or all nodes when all degrees are even", () => {
    const mercuryRange = getTraceFigure("mercury-range");
    expect(degrees(mercuryRange)).toEqual({ a: 1, b: 3, c: 2, d: 2 });
    expect(validStartNodes(mercuryRange)).toEqual(["a", "b"]);

    const mercuryAlign = getTraceFigure("mercury-alignment");
    expect(degrees(mercuryAlign)).toEqual({ a: 2, b: 2, c: 2, d: 2 });
    expect(validStartNodes(mercuryAlign)).toEqual(["a", "b", "c", "d"]);
  });

  it("rejects non-adjacent and reused edges, detects stuck dead-ends, and completes when all edges are traced", () => {
    const fig = getTraceFigure("mercury-range");

    // Dead-end path: b -> a traps the player at leaf `a` with 3 edges remaining
    let stuckTrace = createTraceState();
    stuckTrace = extendTrace(fig, stuckTrace, "b");
    stuckTrace = extendTrace(fig, stuckTrace, "a");
    expect(stuckTrace.usedEdgeIndices.length).toBe(1);
    expect(isStuck(fig, stuckTrace)).toBe(true);
    expect(isComplete(fig, stuckTrace)).toBe(false);

    // Trying to reuse edge a -> b or jump to non-adjacent node c is ignored
    expect(extendTrace(fig, stuckTrace, "b")).toBe(stuckTrace);
    expect(extendTrace(fig, stuckTrace, "c")).toBe(stuckTrace);

    // Valid full path: a -> b -> c -> d -> b uses all 4 edges
    let solvedTrace = createTraceState();
    for (const nodeId of ["a", "b", "c", "d", "b"]) {
      solvedTrace = extendTrace(fig, solvedTrace, nodeId);
    }
    expect(solvedTrace.usedEdgeIndices.length).toBe(4);
    expect(isStuck(fig, solvedTrace)).toBe(false);
    expect(isComplete(fig, solvedTrace)).toBe(true);
  });

  it("deducts ring line cost once on solveComponent and tracks free stuck attempts", () => {
    const mercury = DESTINATIONS[0];
    let state = { ...createInitialState("medium"), calibrationPoints: 20 };
    state = openTelescopeBriefing(state, mercury);
    expect(state.currentScreen).toBe("telescope-briefing");
    state = startObservation(state, mercury);
    expect(state.currentScreen).toBe("telescope");
    expect(getRemainingDestinationCost(mercury, state.telescopeProgress)).toBe(
      12,
    );

    // Two stuck attempts on Range cost 0 Calibration and increment stuckCounts.range to 2
    state = recordComponentStuck(state, mercury, "range");
    state = recordComponentStuck(state, mercury, "range");
    expect(state.calibrationPoints).toBe(20);
    expect(state.telescopeProgress?.stuckCounts.range).toBe(2);

    // Solving Range deducts 4 Calibration exactly once
    const rangeCost = getComponentCost(mercury, "range");
    expect(rangeCost).toBe(4);
    state = solveComponent(state, mercury, "range");
    expect(state.calibrationPoints).toBe(16);
    expect(state.telescopeProgress?.solved.range).toBe(true);

    // Duplicate solve call is a no-op
    state = solveComponent(state, mercury, "range");
    expect(state.calibrationPoints).toBe(16);

    // Solving Focus and Alignment completes the observation and marks destination completed
    for (const ring of DIAL_NAMES) {
      state = solveComponent(state, mercury, ring);
    }
    expect(state.calibrationPoints).toBe(8);
    expect(isObservationSolved(state.telescopeProgress)).toBe(true);
    expect(state.completedDestinationIds).toContain(mercury.id);
  });
});

describe("Hard-mode failed traces & Game Over", () => {
  const mercury = DESTINATIONS[0];
  const allChallengeIds = WORD_CHALLENGES.map((c) => c.id);

  it("charges 1 Calibration per failed trace only on Hard, never below 0", () => {
    expect(getFailedTracePenalty("easy")).toBe(0);
    expect(getFailedTracePenalty("medium")).toBe(0);
    expect(getFailedTracePenalty("hard")).toBe(1);

    const easy = startObservation(
      { ...createInitialState("easy"), calibrationPoints: 5 },
      mercury,
    );
    expect(recordComponentStuck(easy, mercury, "range").calibrationPoints).toBe(5);

    let hard = startObservation(
      { ...createInitialState("hard"), calibrationPoints: 1 },
      mercury,
    );
    hard = recordComponentStuck(hard, mercury, "range");
    expect(hard.calibrationPoints).toBe(0);
    expect(hard.telescopeProgress?.stuckCounts.range).toBe(1);
    hard = recordComponentStuck(hard, mercury, "range");
    expect(hard.calibrationPoints).toBe(0);

    const free = recordComponentStuck(
      { ...hard, calibrationPoints: 3 },
      mercury,
      "range",
      { free: true },
    );
    expect(free.calibrationPoints).toBe(3);
  });

  it("detects Game Over only on Hard once the Archive is exhausted and no ring is affordable", () => {
    const base = {
      ...createInitialState("hard"),
      currentScreen: "atlas" as const,
      completedChallengeIds: allChallengeIds,
      calibrationPoints: 2,
    };
    const total = WORD_CHALLENGES.length;
    expect(isGameOver(base, DESTINATIONS, total)).toBe(true);

    expect(
      isGameOver({ ...base, difficulty: "easy" }, DESTINATIONS, total),
    ).toBe(false);
    expect(
      isGameOver(
        { ...base, completedChallengeIds: allChallengeIds.slice(1) },
        DESTINATIONS,
        total,
      ),
    ).toBe(false);
    expect(
      isGameOver({ ...base, calibrationPoints: 8 }, DESTINATIONS, total),
    ).toBe(false);
    expect(
      isGameOver(
        {
          ...base,
          completedDestinationIds: DESTINATIONS.map((d) => d.id),
        },
        DESTINATIONS,
        total,
      ),
    ).toBe(false);
  });

  it("gives every destination a sector log profile", () => {
    for (const dest of DESTINATIONS) {
      expect(dest.profile.blurb.length).toBeGreaterThan(20);
      expect(dest.profile.facts.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Atlas unlock progression & persistence migration", () => {
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

  it("round-trips valid saved state and migrates legacy dial saves cleanly", () => {
    let state = createInitialState("medium");
    state = completeChallenge(state, "beef-1", 5);
    state = startObservation(state, DESTINATIONS[0]);
    state = solveComponent(state, DESTINATIONS[0], "range");

    const raw = serializeGameState(state);
    const restored = parseSavedGameState(raw);
    expect(restored).toEqual(state);

    // Legacy save with telescopeDialState and telescopeSpentPoints migrates cleanly
    const legacySave = JSON.stringify({
      currentScreen: "telescope",
      difficulty: "easy",
      calibrationPoints: 14,
      completedChallengeIds: ["beef-1"],
      completedDestinationIds: [],
      currentDestinationId: "mercury-sector",
      telescopeDialState: { range: 2, focus: 1, alignment: 0 },
      telescopeSpentPoints: 6,
    });
    const migrated = parseSavedGameState(legacySave);
    expect(migrated.currentScreen).toBe("telescope");
    expect(migrated.calibrationPoints).toBe(14);
    expect(migrated.telescopeProgress).toEqual({
      destinationId: "mercury-sector",
      solved: { range: false, focus: false, alignment: false },
      stuckCounts: { range: 0, focus: 0, alignment: 0 },
    });
    expect("telescopeDialState" in migrated).toBe(false);

    expect(parseSavedGameState("{not-valid-json")).toEqual(
      createInitialState(),
    );
  });
});
