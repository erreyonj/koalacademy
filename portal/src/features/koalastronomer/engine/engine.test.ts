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
  getCumulativeInterval,
  validateWordChallenge,
} from "./archive-engine";
import {
  getAtlasLabel,
  getAvailableDestinations,
  getRevealedRegions,
  isCampaignWon,
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
  ascendingSequencePitches,
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
  isCalibrationShort,
  isObservationSolved,
  openTelescopeBriefing,
  recordComponentStuck,
  solveComponent,
  startObservation,
} from "./telescope-engine";
import {
  getArchiveSector,
  getAvailableChallenges,
  getDifficultyChallenges,
  getRecordTotal,
  isGameOver,
} from "./sector-archive";
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
    id: "andromeda-1",
    destinationId: "new-body",
    set: "primary",
    title: "Record 01",
    answer: "ANDROMEDA",
    blanks: { easy: [0, 2], medium: [0, 2, 6], hard: [0, 2, 6, 8] },
    hint: "Nearest large galaxy",
  };

  it("sums ascending intervals between consecutive blanks (A→D 4th + D→E 2nd = 6)", () => {
    expect(getCumulativeInterval(["A", "D", "E"])).toBe(6);
    expect(getCumulativeInterval(["A", "D"])).toBe(4);
    expect(getCumulativeInterval(["F", "E"])).toBe(7);
    expect(getChallengeReward(sampleChallenge, "easy")).toBe(4);
    expect(getChallengeReward(sampleChallenge, "medium")).toBe(6);
    expect(getChallengeReward(sampleChallenge, "hard")).toBe(10);

    const real = WORD_CHALLENGES.find((c) => c.answer === "ANDROMEDA")!;
    expect(real.blanks.medium).toEqual([0, 2, 6]);
    expect(getChallengeReward(real, "medium")).toBe(6);
  });

  it("validates every bearing and returns the interval chain", () => {
    const result = validateWordChallenge(sampleChallenge, "medium", [
      "A",
      "D",
      "E",
    ]);
    expect(result.valid).toBe(true);
    expect(result.wrongIndex).toBeNull();
    expect(result.notes).toEqual(["A", "D", "E"]);
    expect(result.steps.map((step) => step.interval)).toEqual([4, 2]);
    expect(result.total).toBe(6);
  });

  it("flags the first wrong bearing without spending points", () => {
    const first = validateWordChallenge(sampleChallenge, "medium", ["B", "D", "E"]);
    expect(first.valid).toBe(false);
    expect(first.wrongIndex).toBe(0);
    expect(first.total).toBe(0);

    const third = validateWordChallenge(sampleChallenge, "medium", ["A", "D", "F"]);
    expect(third.wrongIndex).toBe(2);
  });

  it("plays a multi-note record as one ascending run", () => {
    expect(ascendingSequencePitches(["A", "D", "E"])).toEqual(["A4", "D5", "E5"]);
    expect(ascendingSequencePitches(["C", "C", "E"])).toEqual(["C4", "C4", "E4"]);
    const long = ascendingSequencePitches(["G", "F", "E", "D", "C"]);
    expect(Number(long[long.length - 1].slice(1))).toBeLessThanOrEqual(6);
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

  it("has 48 valid records with nested, note-only blanks per difficulty", () => {
    expect(WORD_CHALLENGES.length).toBe(48);
    for (const challenge of WORD_CHALLENGES) {
      expect(validateChallengeDefinition(challenge), challenge.id).toBe(true);
    }
    expect(new Set(WORD_CHALLENGES.map((c) => c.id)).size).toBe(48);
    expect(new Set(WORD_CHALLENGES.map((c) => c.answer)).size).toBe(48);
    expect(
      validateChallengeDefinition({
        ...sampleChallenge,
        blanks: { easy: [0, 2], medium: [0, 6], hard: [0, 2, 6] },
      }),
    ).toBe(false);
  });

  it("keeps astronomy words Hard-only: Easy and Medium records are spelled with A-G", () => {
    for (const challenge of getDifficultyChallenges(WORD_CHALLENGES, "medium")) {
      expect(challenge.answer, challenge.id).toMatch(/^[A-G]+$/);
    }
    for (const challenge of WORD_CHALLENGES.filter((c) => c.hardOnly)) {
      expect(challenge.answer, challenge.id).not.toMatch(/^[A-G]+$/);
    }
  });

  it("gives every sector a primary set that funds its calibration within 6 Cal on every difficulty", () => {
    for (const dest of DESTINATIONS) {
      const sector = WORD_CHALLENGES.filter((c) => c.destinationId === dest.id);
      expect(sector.filter((c) => c.set === "primary" && !c.hardOnly).length).toBe(4);
      expect(sector.filter((c) => c.hardOnly).length).toBe(2);
      expect(sector.filter((c) => c.set === "backup-1").length).toBe(3);
      expect(sector.filter((c) => c.set === "backup-2").length).toBe(3);

      for (const difficulty of ["easy", "medium", "hard"] as const) {
        const primary = getDifficultyChallenges(sector, difficulty).filter(
          (c) => c.set === "primary",
        );
        expect(primary.length).toBe(difficulty === "hard" ? 6 : 4);
        const sum = primary.reduce(
          (total, c) => total + getChallengeReward(c, difficulty),
          0,
        );
        const cost = getDestinationTotalCost(dest, difficulty);
        expect(sum, `${dest.id} ${difficulty}`).toBeGreaterThanOrEqual(cost);
        expect(sum, `${dest.id} ${difficulty}`).toBeLessThanOrEqual(cost + 6);
      }
    }
  });

  it("gives every backup set enough Calibration to fund at least one ring", () => {
    for (const dest of DESTINATIONS) {
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        const ring = Math.max(
          ...DIAL_NAMES.map((dial) => getComponentCost(dest, dial, difficulty)),
        );
        for (const set of ["backup-1", "backup-2"] as const) {
          if (difficulty === "hard" && set === "backup-2") continue;
          const sum = WORD_CHALLENGES.filter(
            (c) => c.destinationId === dest.id && c.set === set,
          ).reduce((total, c) => total + getChallengeReward(c, difficulty), 0);
          expect(sum, `${dest.id} ${difficulty} ${set}`).toBeGreaterThanOrEqual(ring);
        }
      }
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

  it("caps Medium's ring cost at Easy's and keeps Hard's at 113", () => {
    const totalCost = (difficulty: "easy" | "medium" | "hard") =>
      DESTINATIONS.reduce(
        (sum, dest) => sum + getDestinationTotalCost(dest, difficulty),
        0,
      );
    expect(totalCost("easy")).toBeLessThanOrEqual(55);
    expect(totalCost("medium")).toBe(totalCost("easy"));
    expect(totalCost("hard")).toBe(113);
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
  const mercuryPrimaryIds = WORD_CHALLENGES.filter(
    (c) => c.destinationId === mercury.id && c.set === "primary",
  ).map((c) => c.id);
  const mercuryBackupIds = WORD_CHALLENGES.filter(
    (c) => c.destinationId === mercury.id && c.set === "backup-1",
  ).map((c) => c.id);

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

  it("detects Game Over only on Hard after backup-1 is exhausted and no ring is affordable", () => {
    const base = {
      ...createInitialState("hard"),
      currentScreen: "atlas" as const,
      completedChallengeIds: [...mercuryPrimaryIds, ...mercuryBackupIds],
      calibrationPoints: 2,
    };
    const all = WORD_CHALLENGES;
    expect(isGameOver(base, DESTINATIONS, all)).toBe(true);

    // Primary spent but backup-1 still open: not over yet
    expect(
      isGameOver(
        { ...base, completedChallengeIds: mercuryPrimaryIds },
        DESTINATIONS,
        all,
      ),
    ).toBe(false);
    expect(
      isGameOver({ ...base, difficulty: "easy" }, DESTINATIONS, all),
    ).toBe(false);
    expect(
      isGameOver({ ...base, difficulty: "medium" }, DESTINATIONS, all),
    ).toBe(false);
    expect(
      isGameOver({ ...base, calibrationPoints: 8 }, DESTINATIONS, all),
    ).toBe(false);
    expect(
      isGameOver(
        {
          ...base,
          completedDestinationIds: DESTINATIONS.map((d) => d.id),
        },
        DESTINATIONS,
        all,
      ),
    ).toBe(false);
  });

  it("gives every destination a sector log profile and a lens reveal photo", () => {
    for (const dest of DESTINATIONS) {
      expect(dest.profile.blurb.length).toBeGreaterThan(20);
      expect(dest.profile.facts.length).toBeGreaterThanOrEqual(2);
      expect(dest.lensImage).toMatch(/^\/assets\/koalastronomer\//);
      expect(dest.revealName.length).toBeGreaterThan(2);
    }
    expect(DESTINATIONS.map((d) => d.revealName)).toEqual([
      "Mercury",
      "Ceres",
      "Pluto",
      "Unknown world",
    ]);
  });
});

describe("Per-sector Archive record sets", () => {
  const [mercury, outerBelt] = DESTINATIONS;
  const idsFor = (destinationId: string, set: string) =>
    WORD_CHALLENGES.filter(
      (c) => c.destinationId === destinationId && c.set === set,
    ).map((c) => c.id);

  it("serves only the current uncharted sector's records, with bonus records on Hard only", () => {
    const state = createInitialState("easy");
    expect(getArchiveSector(state, DESTINATIONS).id).toBe(mercury.id);
    const easy = getAvailableChallenges(state, WORD_CHALLENGES, DESTINATIONS);
    expect(easy).toHaveLength(4);
    expect(easy.some((c) => c.hardOnly)).toBe(false);
    expect(
      getAvailableChallenges(
        createInitialState("hard"),
        WORD_CHALLENGES,
        DESTINATIONS,
      ).map((c) => c.id),
    ).toEqual(idsFor(mercury.id, "primary"));

    const charted = completeObservation(state, mercury.id);
    expect(getArchiveSector(charted, DESTINATIONS).id).toBe(outerBelt.id);
    expect(
      getAvailableChallenges(charted, WORD_CHALLENGES, DESTINATIONS).every(
        (c) => c.destinationId === outerBelt.id,
      ),
    ).toBe(true);
  });

  it("opens Easy 2 / Medium 2 / Hard 1 backup sets only when Calibration runs dry", () => {
    const primary = WORD_CHALLENGES.filter(
      (c) => c.destinationId === mercury.id && c.set === "primary" && !c.hardOnly,
    ).map((c) => c.id);
    const hardPrimary = idsFor(mercury.id, "primary");
    const backup1 = idsFor(mercury.id, "backup-1");
    const visibleSets = (
      difficulty: "easy" | "medium" | "hard",
      completed: string[],
      calibrationPoints = 0,
    ) => [
      ...new Set(
        getAvailableChallenges(
          {
            ...createInitialState(difficulty),
            completedChallengeIds: completed,
            calibrationPoints,
          },
          WORD_CHALLENGES,
          DESTINATIONS,
        ).map((c) => c.set),
      ),
    ];

    // Cheapest Easy Mercury ring costs 4: with enough Calibration, no backups
    expect(isCalibrationShort({ ...createInitialState("easy"), calibrationPoints: 4 }, DESTINATIONS)).toBe(false);
    expect(visibleSets("easy", primary, 4)).toEqual(["primary"]);
    expect(visibleSets("easy", primary.slice(1), 0)).toEqual(["primary"]);

    // Out of Calibration with the primary set spent opens the next backup
    expect(visibleSets("easy", primary, 3)).toEqual(["primary", "backup-1"]);
    expect(visibleSets("easy", [...primary, ...backup1], 0)).toEqual([
      "primary",
      "backup-1",
      "backup-2",
    ]);
    expect(visibleSets("medium", [...primary, ...backup1], 0)).toEqual([
      "primary",
      "backup-1",
      "backup-2",
    ]);
    // Hard's bonus record must be recovered before its single backup opens
    expect(visibleSets("hard", primary, 0)).toEqual(["primary"]);
    expect(visibleSets("hard", [...hardPrimary, ...backup1], 0)).toEqual([
      "primary",
      "backup-1",
    ]);

    // A backup set stays open once any of its records is recovered
    expect(visibleSets("easy", [...primary, backup1[0]], 20)).toEqual([
      "primary",
      "backup-1",
    ]);
  });

  it("counts primary records plus any open or recovered backups toward progress", () => {
    const primary = idsFor(mercury.id, "primary");
    const flush = { ...createInitialState("easy"), completedChallengeIds: primary, calibrationPoints: 4 };
    const dry = { ...flush, calibrationPoints: 0 };
    const total = (state: typeof flush) =>
      getRecordTotal(
        state,
        WORD_CHALLENGES,
        getAvailableChallenges(state, WORD_CHALLENGES, DESTINATIONS),
      );
    expect(total(flush)).toBe(16);
    expect(total(dry)).toBe(19);
    expect(total({ ...createInitialState("hard"), calibrationPoints: 20 })).toBe(24);
  });
});

describe("Atlas unlock progression & persistence migration", () => {
  it("unlocks destinations sequentially as requirements are met", () => {
    let state = createInitialState();
    expect(
      getAvailableDestinations(DESTINATIONS, state).map((d) => d.id),
    ).toEqual(["mercury-sector"]);

    state = completeObservation(state, "mercury-sector");
    expect(state.currentDestinationId).toBe("mercury-sector");
    expect(state.telescopeProgress).toBeNull();
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

  it("renames charted Atlas sectors to the identified body, except the New Body", () => {
    const [mercury, outerBelt, distant, newBody] = DESTINATIONS;
    expect(getAtlasLabel(mercury, false)).toBe("Mercury Sector");
    expect(getAtlasLabel(mercury, true)).toBe("Mercury");
    expect(getAtlasLabel(outerBelt, false)).toBe("Outer Belt");
    expect(getAtlasLabel(outerBelt, true)).toBe("Ceres");
    expect(getAtlasLabel(distant, false)).toBe("Distant Region");
    expect(getAtlasLabel(distant, true)).toBe("Pluto");
    expect(getAtlasLabel(newBody, false)).toBe("The New Body");
    expect(getAtlasLabel(newBody, true)).toBe("The New Body");
  });

  it("treats the campaign as won only once every sector is charted", () => {
    const none = createInitialState();
    expect(isCampaignWon(none.completedDestinationIds, DESTINATIONS)).toBe(
      false,
    );
    const almost = DESTINATIONS.slice(0, 3).map((d) => d.id);
    expect(isCampaignWon(almost, DESTINATIONS)).toBe(false);
    expect(
      isCampaignWon(
        DESTINATIONS.map((d) => d.id),
        DESTINATIONS,
      ),
    ).toBe(true);
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
