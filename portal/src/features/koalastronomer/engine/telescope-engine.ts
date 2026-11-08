import { getTraceFigure } from "../data/trace-figures";
import { isDestinationUnlocked } from "./atlas-engine";
import {
  createTelescopeProgress,
  type DialName,
  type Difficulty,
  type GameState,
  type TelescopeDestination,
  type TelescopeProgress,
} from "./game-state";
import { findEulerianPath, type TraceEdge, type TraceFigure } from "./trace-engine";

export type { DialName };

export const DIAL_NAMES: readonly DialName[] = ["range", "focus", "alignment"];

export const RING_METADATA: Readonly<
  Record<
    DialName,
    {
      label: string;
      componentTitle: string;
      code: string;
      icon: string;
    }
  >
> = {
  range: {
    label: "Range",
    componentTitle: "Objective Lens",
    code: "RNG-01",
    icon: "⚙",
  },
  focus: {
    label: "Focus",
    componentTitle: "Focusing Filament",
    code: "FCS-02",
    icon: "◎",
  },
  alignment: {
    label: "Alignment",
    componentTitle: "Finder Reticle",
    code: "ALN-03",
    icon: "⌖",
  },
};

export function getComponentFigure(
  destination: TelescopeDestination,
  ring: DialName,
  difficulty: Difficulty = "easy",
): TraceFigure {
  return getTraceFigure(destination.components[ring], difficulty);
}

/**
 * Calibration cost to solve a ring component:
 * - Easy: 1 Cal per line in the Easy figure (4-6 Cal, 55 total across all 4 sectors)
 * - Medium (Option A): capped at the sector's base Easy component cost (4-6 Cal, 55 total)
 *   regardless of the Medium figure's higher line count (6-9 lines)
 * - Hard (Option B): 1 Cal per line in the Hard figure (8-11 Cal, 113 total across all 4 sectors,
 *   paired with 2x Archive rewards = 130 total)
 */
export function getComponentCost(
  destination: TelescopeDestination,
  ring: DialName,
  difficulty: Difficulty = "easy",
): number {
  if (difficulty === "hard") {
    return getComponentFigure(destination, ring, "hard").edges.length;
  }
  return getComponentFigure(destination, ring, "easy").edges.length;
}

export function getDestinationTotalCost(
  destination: TelescopeDestination,
  difficulty: Difficulty = "easy",
): number {
  return DIAL_NAMES.reduce(
    (sum, ring) => sum + getComponentCost(destination, ring, difficulty),
    0,
  );
}

export function getRemainingDestinationCost(
  destination: TelescopeDestination,
  progress: TelescopeProgress | null | undefined,
  difficulty: Difficulty = "easy",
): number {
  return DIAL_NAMES.reduce((sum, ring) => {
    if (progress?.destinationId === destination.id && progress.solved[ring]) {
      return sum;
    }
    return sum + getComponentCost(destination, ring, difficulty);
  }, 0);
}

export function isObservationSolved(
  progress: TelescopeProgress | null | undefined,
): boolean {
  if (!progress) return false;
  return (
    progress.solved.range &&
    progress.solved.focus &&
    progress.solved.alignment
  );
}

/**
 * Return a single "Follow this line" directional edge `[fromNodeId, toNodeId]`
 * ONLY on Easy mode's very first dial (`mercury-sector`, `range`, with zero
 * rings solved across the run) before the student has traced their first edge.
 * If `forceShow` is true (DevPanel toggle), returns the first Eulerian step on any dial.
 */
export function getFirstDialLineHint(
  state: GameState,
  destination: TelescopeDestination,
  ring: DialName,
  figure: TraceFigure,
  usedEdgeCount: number = 0,
  forceShow: boolean = false,
): TraceEdge | null {
  if (usedEdgeCount > 0) {
    return null;
  }

  if (!forceShow) {
    if (state.difficulty !== "easy") return null;
    if (destination.id !== "mercury-sector" || ring !== "range") return null;
    if (state.completedDestinationIds.length > 0) return null;
    const solved = state.telescopeProgress?.solved;
    if (solved && (solved.range || solved.focus || solved.alignment)) {
      return null;
    }
  }

  const path = findEulerianPath(figure);
  if (!path || path.length < 2) return null;
  return [path[0], path[1]];
}

function ensureProgressForDestination(
  state: GameState,
  destination: TelescopeDestination,
): TelescopeProgress {
  if (
    state.currentDestinationId === destination.id &&
    state.telescopeProgress &&
    state.telescopeProgress.destinationId === destination.id
  ) {
    return state.telescopeProgress;
  }
  return createTelescopeProgress(destination.id);
}

/**
 * Open the non-spoiler telescope briefing for a selected destination.
 * Preserves in-progress ring solves if returning to the same destination.
 */
export function openTelescopeBriefing(
  state: GameState,
  destination: TelescopeDestination,
): GameState {
  const progress = ensureProgressForDestination(state, destination);
  return {
    ...state,
    currentScreen: "telescope-briefing",
    currentDestinationId: destination.id,
    telescopeProgress: progress,
  };
}

/**
 * Start or resume a telescope observation puzzle.
 */
export function startObservation(
  state: GameState,
  destination: TelescopeDestination,
): GameState {
  const progress = ensureProgressForDestination(state, destination);
  return {
    ...state,
    currentScreen: "telescope",
    currentDestinationId: destination.id,
    telescopeProgress: progress,
  };
}

/** Calibration lost per failed or abandoned trace: 1 on Hard, free otherwise. */
export function getFailedTracePenalty(difficulty: Difficulty): number {
  return difficulty === "hard" ? 1 : 0;
}

/**
 * Record a failed trace attempt on a ring. On Hard this deducts the failed-trace
 * penalty (never below 0); `options.free` (dev unlimited mode) skips it.
 */
export function recordComponentStuck(
  state: GameState,
  destination: TelescopeDestination,
  ring: DialName,
  options?: { free?: boolean },
): GameState {
  const progress = ensureProgressForDestination(state, destination);
  if (progress.solved[ring]) {
    return state;
  }

  const penalty = options?.free ? 0 : getFailedTracePenalty(state.difficulty);

  return {
    ...state,
    calibrationPoints: Math.max(0, state.calibrationPoints - penalty),
    currentDestinationId: destination.id,
    telescopeProgress: {
      ...progress,
      stuckCounts: {
        ...progress.stuckCounts,
        [ring]: (progress.stuckCounts[ring] ?? 0) + 1,
      },
    },
  };
}

/**
 * Mark a telescope component ring as solved and deduct its difficulty-appropriate
 * Calibration cost (once per ring). When all three rings are solved, records the
 * destination in `completedDestinationIds`.
 */
export function solveComponent(
  state: GameState,
  destination: TelescopeDestination,
  ring: DialName,
  options?: { free?: boolean },
): GameState {
  const progress = ensureProgressForDestination(state, destination);
  if (progress.solved[ring]) {
    return state;
  }

  const cost = getComponentCost(destination, ring, state.difficulty);
  const charge = options?.free ? 0 : cost;
  if (!options?.free && state.calibrationPoints < cost) {
    return state;
  }

  const nextProgress: TelescopeProgress = {
    ...progress,
    solved: {
      ...progress.solved,
      [ring]: true,
    },
  };

  const allSolved = isObservationSolved(nextProgress);
  const completedDestinationIds =
    allSolved && !state.completedDestinationIds.includes(destination.id)
      ? [...state.completedDestinationIds, destination.id]
      : state.completedDestinationIds;

  return {
    ...state,
    currentDestinationId: destination.id,
    calibrationPoints: state.calibrationPoints - charge,
    telescopeProgress: nextProgress,
    completedDestinationIds,
  };
}

/**
 * Complete observation and return to the Atlas with the map region revealed.
 */
export function completeObservation(
  state: GameState,
  destinationId: string,
): GameState {
  const completedDestinationIds = state.completedDestinationIds.includes(
    destinationId,
  )
    ? state.completedDestinationIds
    : [...state.completedDestinationIds, destinationId];

  return {
    ...state,
    currentScreen: "atlas",
    completedDestinationIds,
    currentDestinationId: null,
    telescopeProgress: null,
  };
}

/**
 * Hard-mode soft lock: every Archive record is recovered, a sector is still
 * uncharted, and Calibration can't fund the cheapest unsolved ring left in
 * any unlocked sector. Easy and Medium can't soft lock (failed traces are free).
 */
export function isGameOver(
  state: GameState,
  destinations: readonly TelescopeDestination[],
  totalChallenges: number,
): boolean {
  if (state.difficulty !== "hard") return false;
  if (state.currentScreen === "intro") return false;
  if (state.completedChallengeIds.length < totalChallenges) return false;

  const open = destinations.filter(
    (dest) =>
      !state.completedDestinationIds.includes(dest.id) &&
      isDestinationUnlocked(dest, state.completedDestinationIds),
  );
  if (open.length === 0) return false;

  let cheapest = Number.POSITIVE_INFINITY;
  for (const dest of open) {
    for (const ring of DIAL_NAMES) {
      const solvedHere =
        state.telescopeProgress?.destinationId === dest.id &&
        state.telescopeProgress.solved[ring];
      if (solvedHere) continue;
      cheapest = Math.min(cheapest, getComponentCost(dest, ring, state.difficulty));
    }
  }

  return Number.isFinite(cheapest) && state.calibrationPoints < cheapest;
}
