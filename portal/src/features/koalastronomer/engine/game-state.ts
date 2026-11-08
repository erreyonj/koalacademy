import type { NoteLetter } from "./intervals";

export type { NoteLetter };

export type Difficulty = "easy" | "medium" | "hard";
export type ControlMode = "touch" | "buttons";
export type DialName = "range" | "focus" | "alignment";
export type Screen =
  | "intro"
  | "archive"
  | "atlas"
  | "telescope-briefing"
  | "telescope";

export type RecordSet = "primary" | "backup-1" | "backup-2";

export interface WordChallenge {
  id: string;
  destinationId: string;
  set: RecordSet;
  title: string;
  answer: string;
  missingPositions: [number, number];
  difficulty: Difficulty;
  intervalValue: number;
  category: string;
  hint: string;
}

export type DestinationComponents = Record<DialName, string>;

export interface DestinationProfile {
  blurb: string;
  facts: string[];
}

export interface TelescopeDestination {
  id: string;
  name: string;
  description: string;
  profile: DestinationProfile;
  components: DestinationComponents;
  requiredCompletedDestinations: string[];
  mapRevealRegion: string;
}

export interface TelescopeProgress {
  destinationId: string;
  solved: Record<DialName, boolean>;
  stuckCounts: Record<DialName, number>;
}

export interface GameState {
  currentScreen: Screen;
  difficulty: Difficulty;
  calibrationPoints: number;
  completedChallengeIds: string[];
  completedDestinationIds: string[];
  currentDestinationId: string | null;
  telescopeProgress: TelescopeProgress | null;
}

export const STORAGE_KEY = "koalastronomer-save";

export function createTelescopeProgress(
  destinationId: string,
): TelescopeProgress {
  return {
    destinationId,
    solved: {
      range: false,
      focus: false,
      alignment: false,
    },
    stuckCounts: {
      range: 0,
      focus: 0,
      alignment: 0,
    },
  };
}

export function createInitialState(difficulty: Difficulty = "easy"): GameState {
  return {
    currentScreen: "intro",
    difficulty,
    calibrationPoints: 0,
    completedChallengeIds: [],
    completedDestinationIds: [],
    currentDestinationId: null,
    telescopeProgress: null,
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

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function nonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function parseTelescopeProgress(
  value: unknown,
  currentDestinationId: string | null,
): TelescopeProgress | null {
  if (!currentDestinationId) return null;
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const destinationId =
    typeof candidate.destinationId === "string"
      ? candidate.destinationId
      : currentDestinationId;

  if (destinationId !== currentDestinationId) {
    return createTelescopeProgress(currentDestinationId);
  }

  const solvedRaw =
    candidate.solved && typeof candidate.solved === "object"
      ? (candidate.solved as Record<string, unknown>)
      : {};
  const stuckRaw =
    candidate.stuckCounts && typeof candidate.stuckCounts === "object"
      ? (candidate.stuckCounts as Record<string, unknown>)
      : {};

  return {
    destinationId,
    solved: {
      range: Boolean(solvedRaw.range),
      focus: Boolean(solvedRaw.focus),
      alignment: Boolean(solvedRaw.alignment),
    },
    stuckCounts: {
      range: nonNegativeInt(stuckRaw.range),
      focus: nonNegativeInt(stuckRaw.focus),
      alignment: nonNegativeInt(stuckRaw.alignment),
    },
  };
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

    const calibrationPoints = nonNegativeInt(parsed.calibrationPoints);

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

    // Migrate old saves that had telescopeDialState/telescopeSpentPoints by
    // dropping the legacy fields and initializing fresh telescopeProgress when needed.
    const parsedProgress = parseTelescopeProgress(
      parsed.telescopeProgress,
      currentDestinationId,
    );
    const hadLegacyDialState =
      parsed.telescopeDialState !== null &&
      typeof parsed.telescopeDialState === "object";

    const telescopeProgress =
      parsedProgress ??
      (currentDestinationId &&
      (hadLegacyDialState ||
        currentScreen === "telescope" ||
        currentScreen === "telescope-briefing")
        ? createTelescopeProgress(currentDestinationId)
        : null);

    let resolvedScreen: Screen = currentScreen;
    if (
      resolvedScreen === "telescope" &&
      (!currentDestinationId || !telescopeProgress)
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
      telescopeProgress:
        currentDestinationId && telescopeProgress ? telescopeProgress : null,
    };
  } catch {
    return createInitialState();
  }
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}
