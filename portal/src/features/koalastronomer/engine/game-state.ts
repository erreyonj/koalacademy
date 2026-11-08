import type { NoteLetter } from "./intervals";

export type { NoteLetter };

export type Difficulty = "easy" | "medium" | "hard";
export type ControlMode = "touch" | "buttons";
export type Screen =
  | "intro"
  | "archive"
  | "atlas"
  | "telescope-briefing"
  | "telescope";

export interface WordChallenge {
  id: string;
  title: string;
  answer: string;
  missingPositions: [number, number];
  difficulty: Difficulty;
  intervalValue: number;
  category: string;
  hint: string;
}

export interface DialConfiguration {
  range: number;
  focus: number;
  alignment: number;
}

export interface TelescopeDestination {
  id: string;
  name: string;
  description: string;
  startingConfiguration: DialConfiguration;
  targetConfiguration: DialConfiguration;
  movementBudget: number;
  requiredCompletedDestinations: string[];
  mapRevealRegion: string;
}

export interface GameState {
  currentScreen: Screen;
  difficulty: Difficulty;
  calibrationPoints: number;
  completedChallengeIds: string[];
  completedDestinationIds: string[];
  currentDestinationId: string | null;
  telescopeDialState: DialConfiguration | null;
  telescopeSpentPoints: number;
}

export const STORAGE_KEY = "koalastronomer-save";

export function createInitialState(difficulty: Difficulty = "easy"): GameState {
  return {
    currentScreen: "intro",
    difficulty,
    calibrationPoints: 0,
    completedChallengeIds: [],
    completedDestinationIds: [],
    currentDestinationId: null,
    telescopeDialState: null,
    telescopeSpentPoints: 0,
  };
}

function isValidDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function isValidScreen(value: unknown): value is Screen {
  return (
    value === "intro" ||
    value === "archive" ||
    value === "atlas" ||
    value === "telescope-briefing" ||
    value === "telescope"
  );
}

function isValidDialValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

function isValidDialConfig(value: unknown): value is DialConfiguration {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isValidDialValue(candidate.range) &&
    isValidDialValue(candidate.focus) &&
    isValidDialValue(candidate.alignment)
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function parseSavedGameState(raw: string | null): GameState {
  if (!raw) return createInitialState();

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return createInitialState();
    }

    const difficulty: Difficulty = isValidDifficulty(parsed.difficulty)
      ? parsed.difficulty
      : "easy";

    const currentScreen = isValidScreen(parsed.currentScreen)
      ? parsed.currentScreen
      : "intro";

    const calibrationPoints =
      typeof parsed.calibrationPoints === "number" &&
      Number.isFinite(parsed.calibrationPoints) &&
      parsed.calibrationPoints >= 0
        ? Math.floor(parsed.calibrationPoints)
        : 0;

    const completedChallengeIds = isStringArray(parsed.completedChallengeIds)
      ? Array.from(new Set(parsed.completedChallengeIds))
      : [];

    const completedDestinationIds = isStringArray(
      parsed.completedDestinationIds,
    )
      ? Array.from(new Set(parsed.completedDestinationIds))
      : [];

    const currentDestinationId =
      typeof parsed.currentDestinationId === "string" &&
      !completedDestinationIds.includes(parsed.currentDestinationId)
        ? parsed.currentDestinationId
        : null;

    const telescopeDialState = isValidDialConfig(parsed.telescopeDialState)
      ? {
          range: parsed.telescopeDialState.range,
          focus: parsed.telescopeDialState.focus,
          alignment: parsed.telescopeDialState.alignment,
        }
      : null;

    const telescopeSpentPoints =
      typeof parsed.telescopeSpentPoints === "number" &&
      Number.isFinite(parsed.telescopeSpentPoints) &&
      parsed.telescopeSpentPoints >= 0
        ? Math.floor(parsed.telescopeSpentPoints)
        : 0;

    // If screen was saved as telescope or briefing without a valid destination, fall back to atlas
    let resolvedScreen: Screen = currentScreen;
    if (
      resolvedScreen === "telescope" &&
      (!currentDestinationId || !telescopeDialState)
    ) {
      resolvedScreen = "atlas";
    } else if (
      resolvedScreen === "telescope-briefing" &&
      !currentDestinationId
    ) {
      resolvedScreen = "atlas";
    }

    return {
      currentScreen: resolvedScreen,
      difficulty,
      calibrationPoints,
      completedChallengeIds,
      completedDestinationIds,
      currentDestinationId,
      telescopeDialState:
        currentDestinationId && telescopeDialState ? telescopeDialState : null,
      telescopeSpentPoints:
        currentDestinationId && telescopeDialState ? telescopeSpentPoints : 0,
    };
  } catch {
    return createInitialState();
  }
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}
