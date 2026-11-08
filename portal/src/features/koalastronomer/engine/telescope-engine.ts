import type {
  DialConfiguration,
  Difficulty,
  GameState,
  TelescopeDestination,
} from "./game-state";

export type DialName = "range" | "focus" | "alignment";
export type DialDirection = "clockwise" | "counterclockwise";

export const DIAL_NAMES: readonly DialName[] = ["range", "focus", "alignment"];
export const DIAL_DIRECTIONS: readonly DialDirection[] = [
  "clockwise",
  "counterclockwise",
];

export const RESET_REFUND_RATE: Record<Difficulty, number> = {
  easy: 0.5,
  medium: 0.25,
  hard: 0,
};

export function calculateResetRefund(
  spentPoints: number,
  difficulty: Difficulty,
): number {
  const rate = RESET_REFUND_RATE[difficulty] ?? 0;
  return Math.floor(Math.max(0, spentPoints) * rate);
}

/**
 * Apply modulo-7 wraparound to dial values.
 */
export function mod7(value: number): number {
  return ((value % 7) + 7) % 7;
}

/**
 * Apply the linked gear step without checking point balance.
 *
 * Gear rules:
 * - Range CW: Range +1, Focus -1
 * - Focus CW: Focus +1, Range -1, Alignment -1
 * - Alignment CW: Alignment +1, Focus -1
 * - CCW: exact inverse
 */
export function stepDialConfiguration(
  config: DialConfiguration,
  dial: DialName,
  direction: DialDirection,
): DialConfiguration {
  const delta = direction === "clockwise" ? 1 : -1;
  let { range, focus, alignment } = config;

  switch (dial) {
    case "range":
      range = mod7(range + delta);
      focus = mod7(focus - delta);
      break;
    case "focus":
      focus = mod7(focus + delta);
      range = mod7(range - delta);
      alignment = mod7(alignment - delta);
      break;
    case "alignment":
      alignment = mod7(alignment + delta);
      focus = mod7(focus - delta);
      break;
  }

  return { range, focus, alignment };
}

/**
 * Move a single dial one notch and apply gear linkage rules.
 * Returns null if player has insufficient points.
 */
export function moveDial(
  config: DialConfiguration,
  calibrationPoints: number,
  dial: DialName,
  direction: DialDirection,
): { config: DialConfiguration; pointsSpent: number } | null {
  if (calibrationPoints < 1) {
    return null;
  }

  return {
    config: stepDialConfiguration(config, dial, direction),
    pointsSpent: 1,
  };
}

/**
 * Check if current configuration matches target.
 */
export function isTargetMatched(
  current: DialConfiguration,
  target: DialConfiguration,
): boolean {
  return (
    current.range === target.range &&
    current.focus === target.focus &&
    current.alignment === target.alignment
  );
}

function circularMod7Distance(a: number, b: number): number {
  const diff = Math.abs(mod7(a) - mod7(b));
  return Math.min(diff, 7 - diff);
}

/**
 * Total circular distance across all 3 dials (0 when matched, max 9).
 * Used as a visual clarity heuristic for the telescope lens viewport.
 */
export function dialDistanceFromTarget(
  current: DialConfiguration,
  target: DialConfiguration,
): number {
  return (
    circularMod7Distance(current.range, target.range) +
    circularMod7Distance(current.focus, target.focus) +
    circularMod7Distance(current.alignment, target.alignment)
  );
}

/**
 * Reset telescope to starting configuration.
 */
export function resetTelescope(
  destination: TelescopeDestination,
): DialConfiguration {
  return { ...destination.startingConfiguration };
}

/**
 * Open the non-spoiler telescope briefing for a selected destination.
 * Preserves in-progress dials if returning to the same destination.
 */
export function openTelescopeBriefing(
  state: GameState,
  destination: TelescopeDestination,
): GameState {
  if (
    state.currentDestinationId === destination.id &&
    state.telescopeDialState !== null
  ) {
    return {
      ...state,
      currentScreen: "telescope-briefing",
    };
  }

  return {
    ...state,
    currentScreen: "telescope-briefing",
    currentDestinationId: destination.id,
    telescopeDialState: { ...destination.startingConfiguration },
    telescopeSpentPoints: 0,
  };
}

/**
 * Start or resume a telescope observation puzzle.
 * Leaving the telescope keeps current dials and spent points; returning to the
 * same destination resumes. Starting a different destination replaces them.
 */
export function startObservation(
  state: GameState,
  destination: TelescopeDestination,
): GameState {
  if (
    state.currentDestinationId === destination.id &&
    state.telescopeDialState !== null
  ) {
    return {
      ...state,
      currentScreen: "telescope",
    };
  }

  return {
    ...state,
    currentScreen: "telescope",
    currentDestinationId: destination.id,
    telescopeDialState: { ...destination.startingConfiguration },
    telescopeSpentPoints: 0,
  };
}

/**
 * Reset the current telescope dials to the destination's starting configuration
 * and refund Calibration points according to the difficulty rate:
 * - Easy: 50% of spent points (floor)
 * - Medium: 25% of spent points (floor)
 * - Hard: 0% refund
 * Clears telescopeSpentPoints to 0 for the fresh turn.
 */
export function resetCurrentObservation(
  state: GameState,
  destination: TelescopeDestination,
  difficulty: Difficulty = state.difficulty,
): GameState {
  const refund = calculateResetRefund(state.telescopeSpentPoints, difficulty);
  return {
    ...state,
    calibrationPoints: state.calibrationPoints + refund,
    telescopeDialState: resetTelescope(destination),
    telescopeSpentPoints: 0,
  };
}

/**
 * Apply a dial movement and deduct 1 calibration point.
 */
export function applyDialMovement(
  state: GameState,
  dial: DialName,
  direction: DialDirection,
): GameState {
  if (!state.telescopeDialState) return state;

  const result = moveDial(
    state.telescopeDialState,
    state.calibrationPoints,
    dial,
    direction,
  );

  if (!result) {
    return state;
  }

  return {
    ...state,
    telescopeDialState: result.config,
    calibrationPoints: state.calibrationPoints - result.pointsSpent,
    telescopeSpentPoints: state.telescopeSpentPoints + result.pointsSpent,
  };
}

/**
 * Complete observation and reveal map region.
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
    telescopeDialState: null,
    telescopeSpentPoints: 0,
  };
}

function configKey(config: DialConfiguration): string {
  return `${config.range},${config.focus},${config.alignment}`;
}

/**
 * Breadth-first search over the 343 dial states to find a shortest path
 * from start to target within maxMoves.
 */
export function findOptimalSolution(
  start: DialConfiguration,
  target: DialConfiguration,
  maxMoves: number = 343,
): {
  moves: Array<{ dial: DialName; direction: DialDirection }>;
  length: number;
} | null {
  if (isTargetMatched(start, target)) {
    return { moves: [], length: 0 };
  }

  const queue: Array<{
    config: DialConfiguration;
    moves: Array<{ dial: DialName; direction: DialDirection }>;
  }> = [{ config: start, moves: [] }];
  const visited = new Set<string>([configKey(start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.moves.length >= maxMoves) {
      continue;
    }

    for (const dial of DIAL_NAMES) {
      for (const direction of DIAL_DIRECTIONS) {
        const nextConfig = stepDialConfiguration(
          current.config,
          dial,
          direction,
        );
        const key = configKey(nextConfig);
        if (visited.has(key)) continue;

        const nextMoves = [...current.moves, { dial, direction }];
        if (isTargetMatched(nextConfig, target)) {
          return { moves: nextMoves, length: nextMoves.length };
        }

        visited.add(key);
        queue.push({ config: nextConfig, moves: nextMoves });
      }
    }
  }

  return null;
}
