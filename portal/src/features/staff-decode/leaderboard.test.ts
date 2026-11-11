import { describe, expect, it } from "vitest";
import {
  formatClock,
  groupScoresByCohort,
  isValidAlias,
  normalizeAlias,
  normalizeAliasInput,
  placementCopy,
  resolveLogIdentity,
  sortScoresByTimeThenDifficulty,
  type StaffDecodeScore,
} from "./leaderboard";

function score(
  partial: Partial<StaffDecodeScore> &
    Pick<StaffDecodeScore, "id" | "alias" | "cohort" | "difficulty" | "elapsedSec">,
): StaffDecodeScore {
  return {
    createdAt: "2026-11-11T00:00:00.000Z",
    ...partial,
  };
}

describe("staff-decode leaderboard helpers", () => {
  it("formats clocks as mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(75)).toBe("01:15");
    expect(formatClock(601)).toBe("10:01");
  });

  it("normalizes aliases to three A–Z letters", () => {
    expect(normalizeAlias("ab1c!")).toBe("ABC");
    expect(normalizeAlias("xy")).toBe("XY");
    expect(isValidAlias("ABC")).toBe(true);
    expect(isValidAlias("AB")).toBe(false);
  });

  it("sorts by time then Hard ahead of Medium ahead of Easy", () => {
    const sorted = sortScoresByTimeThenDifficulty([
      score({
        id: "1",
        alias: "EEE",
        cohort: "7g",
        difficulty: "easy",
        elapsedSec: 100,
      }),
      score({
        id: "2",
        alias: "HHH",
        cohort: "7g",
        difficulty: "hard",
        elapsedSec: 100,
      }),
      score({
        id: "3",
        alias: "MMM",
        cohort: "3b",
        difficulty: "medium",
        elapsedSec: 90,
      }),
    ]);
    expect(sorted.map((row) => row.alias)).toEqual(["MMM", "HHH", "EEE"]);
  });

  it("groups by cohort in curriculum order", () => {
    const groups = groupScoresByCohort([
      score({
        id: "1",
        alias: "AAA",
        cohort: "7g",
        difficulty: "easy",
        elapsedSec: 120,
      }),
      score({
        id: "2",
        alias: "BBB",
        cohort: "scholars",
        difficulty: "hard",
        elapsedSec: 200,
      }),
      score({
        id: "3",
        alias: "CCC",
        cohort: "7g",
        difficulty: "medium",
        elapsedSec: 90,
      }),
    ]);
    expect(groups.map((group) => group.cohort)).toEqual(["scholars", "7g"]);
    expect(groups[1]?.scores.map((row) => row.alias)).toEqual(["CCC", "AAA"]);
  });

  it("builds placement copy for empty and populated boards", () => {
    expect(placementCopy({ beaten: 0, total: 0 }, "hard")).toBe(
      "First on the board for Hard!",
    );
    expect(placementCopy({ beaten: 3, total: 10 }, "easy")).toBe(
      "You beat 3 of 10 players on Easy",
    );
  });

  it("accepts the staff backdoor alias and resolves to MRE / staff", () => {
    expect(normalizeAliasInput("!")).toBe("!");
    expect(normalizeAliasInput("!@")).toBe("!@");
    expect(normalizeAliasInput("!@!")).toBe("!@!");
    expect(resolveLogIdentity("!@!", null)).toEqual({
      alias: "MRE",
      cohort: "staff",
    });
    expect(resolveLogIdentity("ABC", "7g")).toEqual({
      alias: "ABC",
      cohort: "7g",
    });
  });

  it("groups staff scores after student cohorts", () => {
    const groups = groupScoresByCohort([
      score({
        id: "1",
        alias: "MRE",
        cohort: "staff",
        difficulty: "hard",
        elapsedSec: 50,
      }),
      score({
        id: "2",
        alias: "AAA",
        cohort: "7g",
        difficulty: "easy",
        elapsedSec: 80,
      }),
    ]);
    expect(groups.map((group) => group.cohort)).toEqual(["7g", "staff"]);
  });
});
