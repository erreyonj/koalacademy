import {
  type Difficulty,
  durationsForDifficulty,
  type NoteDuration,
  type NoteLetter,
  PITCH_STOP_BY_ID,
  type PitchId,
  pitchesForDifficulty,
} from "./pitches";
import { WORDS_BY_LENGTH } from "./words";

export const ROOMS_PER_RUN = 5;
export const SMART_TIMER_MS = 800;
export const HARD_SECONDS_PER_LETTER = 18;
export const DEFAULT_START_PITCH: PitchId = "E4";
export const DEFAULT_START_DURATION: NoteDuration = "q";

export interface CodeTarget {
  letter: NoteLetter;
  pitch: PitchId;
  octave: 3 | 4 | 5 | 6;
  duration: NoteDuration;
}

export interface RoomChallenge {
  roomIndex: number;
  word: string;
  targets: CodeTarget[];
  /** Null on Easy/Medium (no lose condition); countdown seconds on Hard. */
  timeLimitSec: number | null;
}

export type JudgeOutcome = "correct" | "wrong-pitch" | "wrong-value";

export type GamePhase =
  | "start"
  | "room"
  | "dial"
  | "door-open"
  | "win"
  | "lose";

export type ErrorKind = "pitch" | "value" | null;

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  rooms: RoomChallenge[];
  currentRoomIndex: number;
  currentLetterIndex: number;
  selectedPitch: PitchId;
  selectedDuration: NoteDuration;
  cipherRevealed: boolean;
  /**
   * Smart timer arms when the cipher finishes and after any dial or
   * stethoscope adjustment. Evaluating a step disarms it until the next move.
   */
  timerArmed: boolean;
  lastError: ErrorKind;
  elapsedSec: number;
  remainingSec: number | null;
  /**
   * Hard only: attempt 1 is blind (no dial note names). Timing out grants
   * attempt 2 with the same code, full timer, and note names on. Timing out
   * again is game over. Easy/Medium always stay on 1.
   */
  hardAttempt: 1 | 2;
}

function pickRandom<T>(items: readonly T[], rng: () => number): T {
  const idx = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[idx];
}

function shufflePool<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Returns the candidate word pool for a given difficulty level:
 * - Easy: 3–4 character words
 * - Medium: 3–6 character words
 * - Hard: 3–7 character words
 */
export function wordsForDifficulty(difficulty: Difficulty): string[] {
  if (difficulty === "easy") {
    return [...WORDS_BY_LENGTH[3], ...WORDS_BY_LENGTH[4]];
  }
  if (difficulty === "medium") {
    return [
      ...WORDS_BY_LENGTH[3],
      ...WORDS_BY_LENGTH[4],
      ...WORDS_BY_LENGTH[5],
      ...WORDS_BY_LENGTH[6],
    ];
  }
  return [
    ...WORDS_BY_LENGTH[3],
    ...WORDS_BY_LENGTH[4],
    ...WORDS_BY_LENGTH[5],
    ...WORDS_BY_LENGTH[6],
    ...WORDS_BY_LENGTH[7],
  ];
}

/**
 * Selects distinct words for a run of rooms. Hard mode weights selection
 * toward 5–7 character words while keeping 3–7 available.
 */
export function pickWordsForRun(
  difficulty: Difficulty,
  count: number = ROOMS_PER_RUN,
  rng: () => number = Math.random,
): string[] {
  if (difficulty !== "hard") {
    const pool = shufflePool(wordsForDifficulty(difficulty), rng);
    return pool.slice(0, count);
  }

  const longer = shufflePool(
    [...WORDS_BY_LENGTH[5], ...WORDS_BY_LENGTH[6], ...WORDS_BY_LENGTH[7]],
    rng,
  );
  const shorter = shufflePool(
    [...WORDS_BY_LENGTH[3], ...WORDS_BY_LENGTH[4]],
    rng,
  );

  const chosen: string[] = [];
  let longIdx = 0;
  let shortIdx = 0;

  while (chosen.length < count) {
    const preferLong = rng() < 0.78;
    if (preferLong && longIdx < longer.length) {
      chosen.push(longer[longIdx++]);
    } else if (shortIdx < shorter.length) {
      chosen.push(shorter[shortIdx++]);
    } else if (longIdx < longer.length) {
      chosen.push(longer[longIdx++]);
    } else {
      break;
    }
  }

  return chosen;
}

/**
 * Assigns an exact treble pitch (register included) and note value to every
 * letter in a word. Repeated letters roll independently among matching stops
 * in the active range (e.g. the two E's in BEEF can be E4 and E5).
 */
export function assignTargetsForWord(
  word: string,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): CodeTarget[] {
  const stops = pitchesForDifficulty(difficulty);
  const durations = durationsForDifficulty(difficulty);

  return word
    .toUpperCase()
    .split("")
    .map((rawChar) => {
      const letter = rawChar as NoteLetter;
      const matchingStops = stops.filter((stop) => stop.letter === letter);
      if (matchingStops.length === 0) {
        throw new Error(`Unsupported code letter: ${rawChar}`);
      }
      const chosenStop = pickRandom(matchingStops, rng);
      const chosenDuration = pickRandom(durations, rng);
      return {
        letter,
        pitch: chosenStop.id,
        octave: chosenStop.octave,
        duration: chosenDuration,
      };
    });
}

export function buildRun(
  difficulty: Difficulty,
  rng: () => number = Math.random,
  roomCount: number = ROOMS_PER_RUN,
): RoomChallenge[] {
  const words = pickWordsForRun(difficulty, roomCount, rng);
  return words.map((word, roomIndex) => {
    const targets = assignTargetsForWord(word, difficulty, rng);
    const timeLimitSec =
      difficulty === "hard" ? targets.length * HARD_SECONDS_PER_LETTER : null;
    return {
      roomIndex,
      word: word.toUpperCase(),
      targets,
      timeLimitSec,
    };
  });
}

/**
 * Checks the player's dial pitch (register included) and stethoscope duration
 * against the active code letter target.
 */
export function judgeStep(
  target: CodeTarget,
  selectedPitch: PitchId,
  selectedDuration: NoteDuration,
): JudgeOutcome {
  if (selectedPitch !== target.pitch) {
    return "wrong-pitch";
  }
  if (selectedDuration !== target.duration) {
    return "wrong-value";
  }
  return "correct";
}

export function createInitialGameState(
  difficulty: Difficulty = "easy",
  rng: () => number = Math.random,
): GameState {
  return {
    phase: "start",
    difficulty,
    rooms: buildRun(difficulty, rng),
    currentRoomIndex: 0,
    currentLetterIndex: 0,
    selectedPitch: DEFAULT_START_PITCH,
    selectedDuration: DEFAULT_START_DURATION,
    cipherRevealed: false,
    timerArmed: false,
    lastError: null,
    elapsedSec: 0,
    remainingSec: null,
    hardAttempt: 1,
  };
}

export function startRun(
  difficulty: Difficulty,
  rng: () => number = Math.random,
): GameState {
  const rooms = buildRun(difficulty, rng);
  return {
    phase: "room",
    difficulty,
    rooms,
    currentRoomIndex: 0,
    currentLetterIndex: 0,
    selectedPitch: DEFAULT_START_PITCH,
    selectedDuration: DEFAULT_START_DURATION,
    cipherRevealed: false,
    timerArmed: false,
    lastError: null,
    elapsedSec: 0,
    remainingSec: rooms[0]?.timeLimitSec ?? null,
    hardAttempt: 1,
  };
}

/**
 * Clicking the closed safe door brings up the dial for the current room,
 * resets the dial to E4 and stethoscope to a quarter note, and begins the
 * cipher reveal animation.
 */
export function openSafeDial(state: GameState): GameState {
  if (state.phase !== "room") return state;
  const room = state.rooms[state.currentRoomIndex];
  return {
    ...state,
    phase: "dial",
    currentLetterIndex: 0,
    selectedPitch: DEFAULT_START_PITCH,
    selectedDuration: DEFAULT_START_DURATION,
    cipherRevealed: false,
    timerArmed: false,
    lastError: null,
    remainingSec: room?.timeLimitSec ?? null,
    hardAttempt: 1,
  };
}

/**
 * Called when the cipher scramble animation completes. The smart timer stays
 * disarmed until the player turns the dial.
 */
export function finishCipher(state: GameState): GameState {
  if (state.phase !== "dial") return state;
  return {
    ...state,
    cipherRevealed: true,
    timerArmed: false,
    lastError: null,
  };
}

/**
 * Moves the dial up (+1) or down (-1) within the active difficulty's pitch
 * range without wrapping. Arms the smart timer on movement.
 */
export function stepDial(state: GameState, delta: -1 | 1): GameState {
  if (state.phase !== "dial") return state;
  const stops = pitchesForDifficulty(state.difficulty);
  const currentIdx = stops.findIndex((s) => s.id === state.selectedPitch);
  if (currentIdx === -1) return state;
  const nextIdx = Math.max(0, Math.min(stops.length - 1, currentIdx + delta));
  if (nextIdx === currentIdx) return state;
  return {
    ...state,
    selectedPitch: stops[nextIdx].id,
    timerArmed: true,
    lastError: null,
  };
}

/**
 * Sets the dial directly to a pitch stop within the current difficulty's range
 * (used when dragging the dial or clicking a detent). Arms the smart timer.
 */
export function selectDialPitch(
  state: GameState,
  pitch: PitchId,
): GameState {
  if (state.phase !== "dial") return state;
  const stops = pitchesForDifficulty(state.difficulty);
  if (!stops.some((s) => s.id === pitch)) return state;
  return {
    ...state,
    selectedPitch: pitch,
    timerArmed: true,
    lastError: null,
  };
}

/**
 * Cycles the stethoscope to the next available duration for the current
 * difficulty, or sets a specific duration. Once the cipher is revealed, arms
 * the smart timer so a correct value on an already-correct pitch can lock in
 * without nudging the dial.
 */
export function cycleDuration(
  state: GameState,
  explicitDuration?: NoteDuration,
): GameState {
  if (state.phase !== "dial") return state;
  const durations = durationsForDifficulty(state.difficulty);
  let nextDuration: NoteDuration;
  if (explicitDuration && durations.includes(explicitDuration)) {
    nextDuration = explicitDuration;
  } else {
    const idx = durations.indexOf(state.selectedDuration);
    nextDuration = durations[(idx + 1) % durations.length];
  }
  return {
    ...state,
    selectedDuration: nextDuration,
    timerArmed: state.cipherRevealed ? true : state.timerArmed,
    lastError: null,
  };
}

/**
 * Evaluates the current selection when the smart timer fires.
 * Always disarms `timerArmed` so wrong answers do not loop and a cleared
 * letter does not immediately evaluate the next letter before the player moves.
 */
export function evaluateSmartTimer(state: GameState): {
  state: GameState;
  outcome: JudgeOutcome | null;
} {
  if (state.phase !== "dial" || !state.timerArmed) {
    return { state, outcome: null };
  }

  const room = state.rooms[state.currentRoomIndex];
  const target = room?.targets[state.currentLetterIndex];
  if (!room || !target) {
    return {
      state: { ...state, timerArmed: false },
      outcome: null,
    };
  }

  const outcome = judgeStep(
    target,
    state.selectedPitch,
    state.selectedDuration,
  );

  if (outcome === "wrong-pitch") {
    return {
      state: {
        ...state,
        timerArmed: false,
        lastError: "pitch",
      },
      outcome,
    };
  }

  if (outcome === "wrong-value") {
    return {
      state: {
        ...state,
        timerArmed: false,
        lastError: "value",
      },
      outcome,
    };
  }

  const nextLetterIndex = state.currentLetterIndex + 1;
  if (nextLetterIndex >= room.targets.length) {
    return {
      state: {
        ...state,
        phase: "door-open",
        currentLetterIndex: nextLetterIndex,
        timerArmed: false,
        lastError: null,
      },
      outcome: "correct",
    };
  }

  return {
    state: {
      ...state,
      currentLetterIndex: nextLetterIndex,
      timerArmed: false,
      lastError: null,
    },
    outcome: "correct",
  };
}

/**
 * Advances through the open safe doorway into the next room, or to the vault
 * win screen after clearing the final room.
 */
export function advanceThroughDoor(state: GameState): GameState {
  if (state.phase !== "door-open") return state;
  const nextRoomIndex = state.currentRoomIndex + 1;
  if (nextRoomIndex >= state.rooms.length) {
    return {
      ...state,
      phase: "win",
      timerArmed: false,
      lastError: null,
    };
  }
  const nextRoom = state.rooms[nextRoomIndex];
  return {
    ...state,
    phase: "room",
    currentRoomIndex: nextRoomIndex,
    currentLetterIndex: 0,
    selectedPitch: DEFAULT_START_PITCH,
    selectedDuration: DEFAULT_START_DURATION,
    cipherRevealed: false,
    timerArmed: false,
    lastError: null,
    remainingSec: nextRoom?.timeLimitSec ?? null,
    hardAttempt: 1,
  };
}

/**
 * Hard first-timeout assist: same room code, full timer, dial note names on,
 * letter progress cleared. Stays on the dial so the cipher can re-reveal.
 */
export function grantHardSecondChance(state: GameState): GameState {
  if (state.difficulty !== "hard" || state.phase !== "dial") return state;
  if (state.hardAttempt !== 1) return state;
  const room = state.rooms[state.currentRoomIndex];
  return {
    ...state,
    hardAttempt: 2,
    currentLetterIndex: 0,
    selectedPitch: DEFAULT_START_PITCH,
    selectedDuration: DEFAULT_START_DURATION,
    cipherRevealed: false,
    timerArmed: false,
    lastError: null,
    remainingSec: room?.timeLimitSec ?? null,
  };
}

/**
 * Advances elapsed clock by 1 second and decrements the Hard mode countdown
 * while on the dial screen. First timeout grants a named-note second chance;
 * a second timeout is game over.
 */
export function tickSecond(state: GameState): GameState {
  if (
    state.phase !== "room" &&
    state.phase !== "dial" &&
    state.phase !== "door-open"
  ) {
    return state;
  }

  const elapsedSec = state.elapsedSec + 1;

  if (
    state.difficulty === "hard" &&
    state.phase === "dial" &&
    state.remainingSec !== null
  ) {
    const nextRemaining = Math.max(0, state.remainingSec - 1);
    if (nextRemaining === 0) {
      if (state.hardAttempt === 1) {
        return grantHardSecondChance({ ...state, elapsedSec, remainingSec: 0 });
      }
      return {
        ...state,
        phase: "lose",
        elapsedSec,
        remainingSec: 0,
        timerArmed: false,
      };
    }
    return {
      ...state,
      elapsedSec,
      remainingSec: nextRemaining,
    };
  }

  return {
    ...state,
    elapsedSec,
  };
}

export function getActivePitchStop(state: GameState) {
  return PITCH_STOP_BY_ID[state.selectedPitch];
}
