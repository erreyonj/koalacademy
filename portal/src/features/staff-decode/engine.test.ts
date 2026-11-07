import { describe, expect, it } from "vitest";
import {
  advanceThroughDoor,
  assignTargetsForWord,
  buildRun,
  cycleDuration,
  DEFAULT_START_DURATION,
  DEFAULT_START_PITCH,
  evaluateSmartTimer,
  finishCipher,
  HARD_SECONDS_PER_LETTER,
  judgeStep,
  openSafeDial,
  ROOMS_PER_RUN,
  selectDialPitch,
  startRun,
  stepDial,
  tickSecond,
  wordsForDifficulty,
} from "./engine";
import {
  durationsForDifficulty,
  HARD_PITCH_STOPS,
  ledgerStepsFor,
  pitchesForDifficulty,
  STANDARD_PITCH_STOPS,
  stemDirectionFor,
} from "./pitches";
import {
  ALL_WORDS,
  isValidStaffWord,
  WORDS_BY_LENGTH,
  WORKSHEET_WORDS,
} from "./words";

function sequenceRng(values: number[]): () => number {
  let idx = 0;
  return () => {
    const val = values[idx % values.length];
    idx += 1;
    return val;
  };
}

describe("Staff DeCode word bank", () => {
  it("contains ~95 clean A–G words across lengths 3–7 and includes worksheet words", () => {
    expect(ALL_WORDS.length).toBeGreaterThanOrEqual(89);
    expect(ALL_WORDS.length).toBeLessThanOrEqual(110);

    const unique = new Set(ALL_WORDS);
    expect(unique.size).toBe(ALL_WORDS.length);

    for (const word of ALL_WORDS) {
      expect(isValidStaffWord(word)).toBe(true);
    }

    for (const length of [3, 4, 5, 6, 7] as const) {
      for (const word of WORDS_BY_LENGTH[length]) {
        expect(word).toHaveLength(length);
        expect(isValidStaffWord(word)).toBe(true);
      }
    }

    for (const worksheetWord of WORKSHEET_WORDS) {
      expect(ALL_WORDS).toContain(worksheetWord);
    }
  });

  it("filters word lengths by difficulty", () => {
    for (const w of wordsForDifficulty("easy")) {
      expect(w.length).toBeGreaterThanOrEqual(3);
      expect(w.length).toBeLessThanOrEqual(4);
    }
    for (const w of wordsForDifficulty("medium")) {
      expect(w.length).toBeGreaterThanOrEqual(3);
      expect(w.length).toBeLessThanOrEqual(6);
    }
    for (const w of wordsForDifficulty("hard")) {
      expect(w.length).toBeGreaterThanOrEqual(3);
      expect(w.length).toBeLessThanOrEqual(7);
    }
  });
});

describe("Pitch ranges and durations", () => {
  it("uses 9 stops (E4–F5) for easy/medium and 17 stops (A3–C6) for hard", () => {
    expect(STANDARD_PITCH_STOPS).toHaveLength(9);
    expect(STANDARD_PITCH_STOPS[0].id).toBe("E4");
    expect(STANDARD_PITCH_STOPS[8].id).toBe("F5");

    expect(HARD_PITCH_STOPS).toHaveLength(17);
    expect(HARD_PITCH_STOPS[0].id).toBe("A3");
    expect(HARD_PITCH_STOPS[16].id).toBe("C6");

    expect(pitchesForDifficulty("easy")).toEqual(STANDARD_PITCH_STOPS);
    expect(pitchesForDifficulty("medium")).toEqual(STANDARD_PITCH_STOPS);
    expect(pitchesForDifficulty("hard")).toEqual(HARD_PITCH_STOPS);
  });

  it("uses eighth/quarter for easy/medium and 16th/quarter/half/whole for hard", () => {
    expect(durationsForDifficulty("easy")).toEqual(["8", "q"]);
    expect(durationsForDifficulty("medium")).toEqual(["8", "q"]);
    expect(durationsForDifficulty("hard")).toEqual(["16", "q", "h", "w"]);
  });

  it("computes ledger lines and stem directions across A3–C6", () => {
    expect(ledgerStepsFor(-4)).toEqual([-2, -4]); // A3
    expect(ledgerStepsFor(-3)).toEqual([-2]); // B3
    expect(ledgerStepsFor(-2)).toEqual([-2]); // C4
    expect(ledgerStepsFor(-1)).toEqual([]); // D4
    expect(ledgerStepsFor(0)).toEqual([]); // E4
    expect(ledgerStepsFor(8)).toEqual([]); // F5
    expect(ledgerStepsFor(9)).toEqual([]); // G5
    expect(ledgerStepsFor(10)).toEqual([10]); // A5
    expect(ledgerStepsFor(11)).toEqual([10]); // B5
    expect(ledgerStepsFor(12)).toEqual([10, 12]); // C6

    expect(stemDirectionFor(3)).toBe("up"); // A4 below middle line
    expect(stemDirectionFor(4)).toBe("down"); // B4 on middle line
    expect(stemDirectionFor(5)).toBe("down"); // C5 above middle line
  });

  it("assigns each repeated letter its own register stop when rng varies", () => {
    // In BEEF on easy: B has [B4], E has [E4, E5], F has [F4, F5]
    // Sequence: B->0, dur->0, E1->0 (E4), dur->1, E2->0.9 (E5), dur->0, F->0.9 (F5), dur->1
    const rng = sequenceRng([0, 0, 0, 0.9, 0.9, 0, 0.9, 0.9]);
    const targets = assignTargetsForWord("beef", "easy", rng);
    expect(targets.map((t) => t.pitch)).toEqual(["B4", "E4", "E5", "F5"]);
    expect(targets.map((t) => t.duration)).toEqual(["8", "q", "8", "q"]);
  });
});

describe("Step evaluation and smart timer disarm", () => {
  it("distinguishes E4 from E5 and pitch errors from value errors", () => {
    const targetE5Half = {
      letter: "E" as const,
      pitch: "E5" as const,
      octave: 5 as const,
      duration: "h" as const,
    };

    // Wrong note letter entirely
    expect(judgeStep(targetE5Half, "F5", "h")).toBe("wrong-pitch");
    // Same letter E, wrong register (E4 instead of E5)
    expect(judgeStep(targetE5Half, "E4", "h")).toBe("wrong-pitch");
    // Exact pitch E5, wrong note value
    expect(judgeStep(targetE5Half, "E5", "q")).toBe("wrong-value");
    // Both pitch (register included) and note value match
    expect(judgeStep(targetE5Half, "E5", "h")).toBe("correct");
  });

  it("arms the smart timer only on dial moves and disarms after each check", () => {
    let state = startRun("easy", sequenceRng([0.1, 0.8]));
    state = openSafeDial(state);
    expect(state.selectedPitch).toBe(DEFAULT_START_PITCH);
    expect(state.selectedDuration).toBe(DEFAULT_START_DURATION);
    expect(state.timerArmed).toBe(false);

    state = finishCipher(state);
    expect(state.cipherRevealed).toBe(true);
    expect(state.timerArmed).toBe(false);
    expect(evaluateSmartTimer(state).outcome).toBeNull();

    // Stethoscope alone does not arm the timer
    expect(cycleDuration(state).timerArmed).toBe(false);

    const firstTarget = state.rooms[0].targets[0];
    // Pick a deliberately wrong pitch first
    const wrongPitch = firstTarget.pitch === "E4" ? "F4" : "E4";
    state = selectDialPitch(state, wrongPitch);
    expect(state.timerArmed).toBe(true);

    const wrongPitchCheck = evaluateSmartTimer(state);
    expect(wrongPitchCheck.outcome).toBe("wrong-pitch");
    expect(wrongPitchCheck.state.lastError).toBe("pitch");
    expect(wrongPitchCheck.state.timerArmed).toBe(false);
    expect(wrongPitchCheck.state.currentLetterIndex).toBe(0);

    // Calling evaluateSmartTimer again while disarmed is a no-op
    const secondCall = evaluateSmartTimer(wrongPitchCheck.state);
    expect(secondCall.outcome).toBeNull();

    // Now set the exact pitch, but wrong duration
    const wrongDur = firstTarget.duration === "q" ? "8" : "q";
    state = selectDialPitch(wrongPitchCheck.state, firstTarget.pitch);
    state = cycleDuration(state, wrongDur);
    expect(state.timerArmed).toBe(true);

    const wrongValueCheck = evaluateSmartTimer(state);
    expect(wrongValueCheck.outcome).toBe("wrong-value");
    expect(wrongValueCheck.state.lastError).toBe("value");
    expect(wrongValueCheck.state.timerArmed).toBe(false);
    expect(wrongValueCheck.state.currentLetterIndex).toBe(0);

    // Fixing the stethoscope leaves the timer disarmed until the dial moves
    state = cycleDuration(wrongValueCheck.state, firstTarget.duration);
    expect(state.timerArmed).toBe(false);
    expect(evaluateSmartTimer(state).outcome).toBeNull();
    state = selectDialPitch(state, firstTarget.pitch);
    expect(state.timerArmed).toBe(true);
    const correctCheck = evaluateSmartTimer(state);
    expect(correctCheck.outcome).toBe("correct");
    expect(correctCheck.state.currentLetterIndex).toBe(1);
    expect(correctCheck.state.timerArmed).toBe(false);
  });

  it("clamps dial movement at the ends of the active range without wrapping", () => {
    let state = openSafeDial(startRun("easy"));
    // Easy starts on E4 (lowest stop on easy)
    const afterDown = stepDial(state, -1);
    expect(afterDown.selectedPitch).toBe("E4");

    // Step all the way up to F5 (8 steps up) and one extra
    for (let i = 0; i < 12; i++) {
      state = stepDial(state, 1);
    }
    expect(state.selectedPitch).toBe("F5");
  });
});

describe("Five-room run and hard countdown", () => {
  it("progresses through all five rooms and lands on win", () => {
    let state = startRun("easy", sequenceRng([0.2, 0.5, 0.7]));
    expect(state.rooms).toHaveLength(ROOMS_PER_RUN);

    for (let r = 0; r < ROOMS_PER_RUN; r++) {
      expect(state.phase).toBe("room");
      expect(state.currentRoomIndex).toBe(r);

      state = openSafeDial(state);
      expect(state.phase).toBe("dial");
      expect(state.selectedPitch).toBe("E4");
      expect(state.selectedDuration).toBe("q");

      state = finishCipher(state);
      const targets = state.rooms[r].targets;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        state = selectDialPitch(state, target.pitch);
        state = cycleDuration(state, target.duration);
        const res = evaluateSmartTimer(state);
        expect(res.outcome).toBe("correct");
        state = res.state;
      }

      expect(state.phase).toBe("door-open");
      state = advanceThroughDoor(state);
    }

    expect(state.phase).toBe("win");
  });

  it("initializes a 15s-per-letter countdown on hard and transitions to lose at zero", () => {
    const run = buildRun("hard", sequenceRng([0.3, 0.6]));
    expect(run[0].timeLimitSec).toBe(
      run[0].targets.length * HARD_SECONDS_PER_LETTER,
    );

    let state = openSafeDial(startRun("hard", sequenceRng([0.3, 0.6])));
    const totalSec = state.remainingSec ?? 0;
    expect(totalSec).toBeGreaterThan(0);

    for (let s = 0; s < totalSec - 1; s++) {
      state = tickSecond(state);
      expect(state.phase).toBe("dial");
    }

    state = tickSecond(state);
    expect(state.remainingSec).toBe(0);
    expect(state.phase).toBe("lose");
  });
});
