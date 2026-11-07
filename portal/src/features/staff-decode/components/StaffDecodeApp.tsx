"use client";

import { playNote, resumePiano } from "@/components/keys-lite/piano";
import { NotationStaff } from "@/components/notation/NotationStaff";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lock, RotateCcw } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  advanceThroughDoor,
  type CodeTarget,
  createInitialGameState,
  cycleDuration,
  evaluateSmartTimer,
  finishCipher,
  type GameState,
  openSafeDial,
  ROOMS_PER_RUN,
   SMART_TIMER_MS,
  selectDialPitch,
  startRun,
  stepDial,
  tickSecond,
} from "../engine";
import {
  type Difficulty,
  DURATION_LABELS,
  DURATION_SHORT_LABELS,
  durationsForDifficulty,
  type NoteDuration,
  PITCH_STOP_BY_ID,
  pitchesForDifficulty,
} from "../pitches";
import { NoteValueGlyph } from "./NoteGlyph";
import { MusicTransport, useThemeMusic } from "./ThemeMusic";
import { staffProgress } from "../staffGuess";
import {
  ClosedSafeGraphic,
  OpenVaultSafeGraphic,
  ROOM_PALETTES,
  RoomBackdropSvg,
} from "./RoomSceneSvg";
import "../staff-decode.css";

const CIPHER_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;
const CIPHER_DURATION_MS = 620;
const RULES_INTERVAL_MS = 7000;

const START_RULES = [
  "You're a master safe cracker, and you just tripped the alarm.",
  "You'll be locked in unless you get the combination for every room.",
  "Turn the dial to move the note up and down the staff, including its register.",
  "Match the note value in the center of the dial with the stethoscope.",
] as const;

function RulesCarousel({ lines }: { lines: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(0);

  useEffect(() => {
    if (lines.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, RULES_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [lines.length, hold]);

  function go(delta: number) {
    setIndex((current) => (current + delta + lines.length) % lines.length);
    setHold((current) => current + 1);
  }

  return (
    <div className="sd-rules-carousel">
      <p key={index} className="sd-rules-slide">
        {lines[index]}
      </p>
      <div className="sd-rules-nav">
        <button
          type="button"
          className="sd-rules-arrow"
          aria-label="Previous instruction"
          onClick={() => go(-1)}
        >
          <ArrowLeft size={16} strokeWidth={2.6} />
        </button>
        <span className="sd-rules-count">
          {index + 1} / {lines.length}
        </span>
        <button
          type="button"
          className="sd-rules-arrow"
          aria-label="Next instruction"
          onClick={() => go(1)}
        >
          <ArrowRight size={16} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

const DIAL_SWIPE_PX = 36;
const PLAYBACK_STEP_MS = 450;

type ControlMode = "touch" | "buttons";

function soundHardPitch(prev: GameState, nextPitch: GameState["selectedPitch"]) {
  if (prev.difficulty !== "hard" || prev.phase !== "dial") return;
  if (nextPitch === prev.selectedPitch) return;
  resumePiano();
  playNote(nextPitch);
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function StaffDecodeApp() {
  const [state, setState] = useState<GameState>(() =>
    createInitialGameState("easy"),
  );
  const [scrambleTick, setScrambleTick] = useState(0);
  const [droppedTarget, setDroppedTarget] = useState<CodeTarget | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [controlMode, setControlMode] = useState<ControlMode>("touch");
  const [playbackDone, setPlaybackDone] = useState<{
    rooms: GameState["rooms"];
    roomIndex: number;
  } | null>(null);
  const playingBack =
    state.phase === "door-open" &&
    !(
      playbackDone?.rooms === state.rooms &&
      playbackDone.roomIndex === state.currentRoomIndex
    );
  const music = useThemeMusic(playingBack);
  const [dialTurn, setDialTurn] = useState<{
    dir: "up" | "down" | null;
    n: number;
  }>({ dir: null, n: 0 });
  const prevPitchRef = useRef(state.selectedPitch);

  const dialSvgRef = useRef<SVGSVGElement | null>(null);
  const stethStripRef = useRef<HTMLDivElement | null>(null);
  const dragActiveRef = useRef(false);
  const dialGestureRef = useRef<{
    x: number;
    y: number;
    mode: "angle" | "swipe" | null;
    accum: number;
  }>({ x: 0, y: 0, mode: null, accum: 0 });

  const currentRoom = state.rooms[state.currentRoomIndex];
  const activeTarget = currentRoom?.targets[state.currentLetterIndex];
  const activeStops = useMemo(
    () => pitchesForDifficulty(state.difficulty),
    [state.difficulty],
  );
  const activeDurations = useMemo(
    () => durationsForDifficulty(state.difficulty),
    [state.difficulty],
  );

  const selectedStopIdx = activeStops.findIndex(
    (s) => s.id === state.selectedPitch,
  );
  const canStepDown = selectedStopIdx > 0;
  const canStepUp =
    selectedStopIdx !== -1 && selectedStopIdx < activeStops.length - 1;

  // Twist the grip hand toward each new detent.
  useEffect(() => {
    const prevIdx = activeStops.findIndex(
      (s) => s.id === prevPitchRef.current,
    );
    prevPitchRef.current = state.selectedPitch;
    if (prevIdx === -1 || selectedStopIdx === -1 || prevIdx === selectedStopIdx)
      return;
    const dir = selectedStopIdx > prevIdx ? "up" : "down";
    setDialTurn((t) => ({ dir, n: t.n + 1 }));
  }, [state.selectedPitch, selectedStopIdx, activeStops]);

  // 1. Cipher scramble animation when opening a room's safe dial
  useEffect(() => {
    if (state.phase !== "dial" || state.cipherRevealed) return;

    const interval = window.setInterval(() => {
      setScrambleTick((t) => t + 1);
    }, 65);

    const doneTimer = window.setTimeout(() => {
      window.clearInterval(interval);
      setState((prev) => finishCipher(prev));
    }, CIPHER_DURATION_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(doneTimer);
    };
  }, [state.phase, state.cipherRevealed, state.currentRoomIndex]);

  // 2. Smart timer: 800ms after the dial stops; only a dial move arms it.
  const shouldScheduleSmartTimer =
    state.phase === "dial" &&
    state.cipherRevealed &&
    state.timerArmed &&
    Boolean(activeTarget);

  useEffect(() => {
    if (!shouldScheduleSmartTimer) return;

    const timer = window.setTimeout(() => {
      setState((prev) => {
        const currentTarget =
          prev.rooms[prev.currentRoomIndex]?.targets[prev.currentLetterIndex] ??
          null;
        const { state: nextState, outcome } = evaluateSmartTimer(prev);
        if (outcome === "correct" && currentTarget) {
          setDroppedTarget(currentTarget);
        }
        return nextState;
      });
    }, SMART_TIMER_MS);

    return () => window.clearTimeout(timer);
  }, [
    shouldScheduleSmartTimer,
    state.selectedPitch,
    state.selectedDuration,
    state.currentLetterIndex,
    state.currentRoomIndex,
  ]);

  // Clear dropped-letter animation badge after 280ms
  useEffect(() => {
    if (!droppedTarget) return;
    const t = window.setTimeout(() => setDroppedTarget(null), 280);
    return () => window.clearTimeout(t);
  }, [droppedTarget]);

  // 3. 1-second clock (elapsed timer on Easy/Medium; countdown on Hard)
  useEffect(() => {
    if (
      state.phase !== "room" &&
      state.phase !== "dial" &&
      state.phase !== "door-open"
    ) {
      return;
    }
    const interval = window.setInterval(() => {
      setState((prev) => tickSecond(prev));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.phase]);

  // 4. Keyboard support on the dial screen (ArrowUp / ArrowDown / Space)
  const handleStepDial = useCallback((delta: -1 | 1) => {
    setState((prev) => {
      const next = stepDial(prev, delta);
      soundHardPitch(prev, next.selectedPitch);
      return next;
    });
  }, []);

  const handleSelectPitch = useCallback(
    (pitch: (typeof activeStops)[number]["id"]) => {
      setState((prev) => {
        const next = selectDialPitch(prev, pitch);
        soundHardPitch(prev, next.selectedPitch);
        return next;
      });
    },
    [],
  );

  const handleSelectDuration = useCallback((dur?: NoteDuration) => {
    setState((prev) => cycleDuration(prev, dur));
  }, []);

  const stepDuration = useCallback(
    (delta: -1 | 1) => {
      const idx = activeDurations.indexOf(state.selectedDuration);
      const next =
        activeDurations[
          (idx + delta + activeDurations.length) % activeDurations.length
        ];
      if (next) handleSelectDuration(next);
    },
    [activeDurations, handleSelectDuration, state.selectedDuration],
  );

  useEffect(() => {
    if (state.phase !== "dial") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleStepDial(1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleStepDial(-1);
      } else if (e.key === "." || e.key === " ") {
        e.preventDefault();
        stepDuration(1);
      } else if (e.key === ",") {
        e.preventDefault();
        stepDuration(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.phase, handleStepDial, stepDuration]);

  // Pointer drag around the dial wheel to snap to pitch stops
  const updatePitchFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = dialSvgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      // Ignore clicks right on the center gear so center clicks don't jump the rim
      if (dist < rect.width * 0.18) return;

      // Angle in degrees with 0 at 12 o'clock, increasing clockwise (-180..180)
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      // Map -140°..+140° arc across activeStops
      const clamped = Math.max(-140, Math.min(140, deg));
      const normalized = (clamped + 140) / 280;
      const stopIdx = Math.round(normalized * (activeStops.length - 1));
      const targetStop = activeStops[stopIdx];
      if (targetStop) {
        handleSelectPitch(targetStop.id);
      }
    },
    [activeStops, handleSelectPitch],
  );

  const handleDialPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragActiveRef.current = true;
    dialGestureRef.current = {
      x: e.clientX,
      y: e.clientY,
      mode: null,
      accum: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (controlMode === "buttons") {
      updatePitchFromPointer(e.clientX, e.clientY);
    }
  };

  const handleDialPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragActiveRef.current) return;
    const gesture = dialGestureRef.current;
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    if (gesture.mode === null && Math.hypot(dx, dy) > 8) {
      gesture.mode = Math.abs(dy) > Math.abs(dx) * 1.15 ? "swipe" : "angle";
    }
    if (controlMode === "touch") {
      if (gesture.mode !== "swipe") return;
      gesture.accum += e.clientY - gesture.y;
      gesture.y = e.clientY;
      gesture.x = e.clientX;
      while (gesture.accum <= -DIAL_SWIPE_PX) {
        gesture.accum += DIAL_SWIPE_PX;
        handleStepDial(1);
      }
      while (gesture.accum >= DIAL_SWIPE_PX) {
        gesture.accum -= DIAL_SWIPE_PX;
        handleStepDial(-1);
      }
      return;
    }
    updatePitchFromPointer(e.clientX, e.clientY);
  };

  const handleDialPointerUp = () => {
    dragActiveRef.current = false;
    dialGestureRef.current.mode = null;
  };

  const handleStethPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (controlMode !== "touch") return;
    const strip = stethStripRef.current;
    if (!strip || activeDurations.length === 0) return;
    const rect = strip.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
    const idx = Math.max(
      0,
      Math.min(activeDurations.length - 1, Math.floor(ratio * activeDurations.length)),
    );
    const next = activeDurations[idx];
    if (next && next !== state.selectedDuration) handleSelectDuration(next);
  };

  // Play the cracked code back before the doorway opens.
  useEffect(() => {
    if (state.phase !== "door-open") return;
    const room = state.rooms[state.currentRoomIndex];
    if (!room) return;
    const { rooms, currentRoomIndex } = state;
    const timers = room.targets.map((target, idx) =>
      window.setTimeout(() => {
        if (idx === 0) resumePiano();
        playNote(target.pitch);
      }, idx * PLAYBACK_STEP_MS),
    );
    timers.push(
      window.setTimeout(
        () => setPlaybackDone({ rooms, roomIndex: currentRoomIndex }),
        room.targets.length * PLAYBACK_STEP_MS + 250,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [state.phase, state.currentRoomIndex, state.rooms]);

  const handleWalkThroughDoor = () => {
    if (isWalking || playingBack) return;
    setIsWalking(true);
    window.setTimeout(() => {
      setIsWalking(false);
      setState((prev) => advanceThroughDoor(prev));
    }, 380);
  };

  const guessScore = useMemo(() => {
    const targets = currentRoom?.targets ?? [];
    const solved = targets.slice(0, state.currentLetterIndex);
    const live =
      state.phase === "dial"
        ? { pitch: state.selectedPitch, duration: state.selectedDuration }
        : null;
    return staffProgress(solved, live);
  }, [
    currentRoom,
    state.currentLetterIndex,
    state.phase,
    state.selectedPitch,
    state.selectedDuration,
  ]);
  const wrapStaff = guessScore.measures.length > 2;
  const showNoteNames = state.difficulty !== "hard";
  const palette =
    ROOM_PALETTES[state.currentRoomIndex % ROOM_PALETTES.length];
  const nextPalette =
    ROOM_PALETTES[(state.currentRoomIndex + 1) % ROOM_PALETTES.length];

  // Dial rotation angle: place each stop along a 280° arc (-140° to +140°) and
  // rotate the dial rotor so the currently selected stop sits at 12 o'clock (0°).
  const stepAngle =
    activeStops.length > 1 ? 280 / (activeStops.length - 1) : 0;
  const selectedStopAngle =
    selectedStopIdx >= 0 ? -140 + selectedStopIdx * stepAngle : 0;
  const rotorRotation = -selectedStopAngle;

  const remainingTargets = currentRoom
    ? currentRoom.targets.slice(state.currentLetterIndex)
    : [];

  return (
    <div className="sd-shell">
      {/* Top status bar */}
      <header className="sd-topbar">
        <div className="sd-topbar-left">
          <h1 className="sd-topbar-title">Staff DeCode</h1>
          <span
            className={`sd-badge${state.difficulty === "hard" ? " is-hard" : ""}`}
          >
            {state.difficulty}
          </span>
          {state.phase !== "start" && (
            <span className="sd-badge" data-testid="room-progress-badge">
              Room {state.currentRoomIndex + 1} / {ROOMS_PER_RUN} ·{" "}
              {palette.name}
            </span>
          )}
        </div>

        <div className="sd-topbar-right">
          <button
            type="button"
            className={`sd-ghost-btn${controlMode === "touch" ? " is-on" : ""}`}
            data-testid="touch-screen-toggle"
            aria-pressed={controlMode === "touch"}
            onClick={() =>
              setControlMode((mode) => (mode === "touch" ? "buttons" : "touch"))
            }
          >
            Touch Screen
          </button>
          {state.phase !== "start" && (
            <>
              <div
                className={`sd-clock${
                  state.difficulty === "hard" &&
                  state.remainingSec !== null &&
                  state.remainingSec <= 10
                    ? " is-urgent"
                    : ""
                }`}
                data-testid="game-clock"
              >
                {state.difficulty === "hard" && state.remainingSec !== null
                  ? `LOCK IN ${formatClock(state.remainingSec)}`
                  : `TIME ${formatClock(state.elapsedSec)}`}
              </div>
              <button
                type="button"
                className="sd-ghost-btn"
                onClick={() =>
                  setState(createInitialGameState(state.difficulty))
                }
              >
                <RotateCcw
                  size={13}
                  style={{
                    display: "inline",
                    verticalAlign: "-2px",
                    marginRight: "4px",
                  }}
                />
                Reset
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main 1-point perspective room stage */}
      <div
        className={`sd-stage${isWalking ? " is-walking" : ""}`}
        data-testid="staff-decode-stage"
        data-phase={state.phase}
      >
        {/* Room SVG background */}
        <svg
          viewBox="0 0 800 800"
          className="sd-room-svg"
          role="img"
          aria-label={`Safe room ${state.currentRoomIndex + 1}: ${palette.name}`}
        >
          <RoomBackdropSvg roomIndex={state.currentRoomIndex} />

          {(state.phase === "start" ||
            state.phase === "room" ||
            state.phase === "lose") && <ClosedSafeGraphic />}

          {state.phase === "door-open" && (
            <OpenVaultSafeGraphic
              mode={
                state.currentRoomIndex + 1 >= state.rooms.length
                  ? "coins"
                  : "doorway"
              }
              nextRoomPalette={nextPalette}
            />
          )}

          {state.phase === "win" && <OpenVaultSafeGraphic mode="coins" />}
        </svg>

        {/* PHASE 1: START SCREEN */}
        {state.phase === "start" && (
          <section
            className="sd-overlay-card"
            aria-label="Staff DeCode rules and setup"
          >
            <div className="sd-start-header">
              <span className="sd-eyebrow">
                Toolkit · Games · Treble Clef Safe Cracker
              </span>
              <h2 className="sd-start-title">Crack the staff combinations.</h2>
              <RulesCarousel lines={START_RULES} />
            </div>

            <div
              className="sd-difficulty-grid"
              role="radiogroup"
              aria-label="Difficulty"
            >
              {(
                [
                  {
                    id: "easy",
                    title: "Easy",
                    words: "3–4 letter words",
                    range: "9 stops: E4 to F5",
                    values: "Quarter & Eighth notes",
                    rules: "No lose condition · Elapsed timer",
                  },
                  {
                    id: "medium",
                    title: "Medium",
                    words: "3–6 letter words",
                    range: "9 stops: E4 to F5",
                    values: "Quarter & Eighth notes",
                    rules: "No lose condition · Elapsed timer",
                  },
                  {
                    id: "hard",
                    title: "Hard",
                    words: "Up to 7 letters (5–7 weighted)",
                    range: "17 stops: A3 to C6 (ledger lines)",
                    values: "16th, Quarter, Half & Whole notes",
                    rules: "15s per letter countdown timer",
                  },
                ] as const
              ).map((opt) => {
                const selected = state.difficulty === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`difficulty-${opt.id}`}
                    className={`sd-diff-card${selected ? " is-selected" : ""}`}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        difficulty: opt.id as Difficulty,
                      }))
                    }
                  >
                    <span className="sd-diff-name">
                      <span>{opt.title}</span>
                      {selected && <span>●</span>}
                    </span>
                    <span className="sd-diff-meta">{opt.words}</span>
                    <span className="sd-diff-meta">{opt.range}</span>
                    <span className="sd-diff-meta">{opt.values}</span>
                    <span className="sd-diff-meta">{opt.rules}</span>
                  </button>
                );
              })}
            </div>

            <div className="sd-start-footer">
              <button
                type="button"
                className="sd-lock-tools"
                aria-disabled="true"
                data-testid="advanced-tools-lock"
                title="Advanced tools coming soon: custom word difficulty and random code generation"
              >
                <Lock size={15} aria-hidden="true" />
                <span>Advanced Tools · Locked</span>
              </button>

              <button
                type="button"
                className="sd-primary-btn"
                data-testid="start-game-btn"
                onClick={() => {
                  music.start();
                  setState(startRun(state.difficulty));
                }}
              >
                Enter Room 1 →
              </button>
            </div>
          </section>
        )}

        {/* PHASE 2: ROOM — Click the closed safe door to bring up the dial */}
        {state.phase === "room" && (
          <button
            type="button"
            className="sd-safe-hotspot"
            data-testid="safe-door-hotspot"
            aria-label={`Inspect safe dial for Room ${state.currentRoomIndex + 1}`}
            onClick={() => setState((prev) => openSafeDial(prev))}
          >
            <span className="sd-hotspot-pill">
              Click safe door to crack Room {state.currentRoomIndex + 1}
            </span>
          </button>
        )}

        {/* PHASE 3: DIAL SAFE-CRACKING VIEW */}
        {state.phase === "dial" && currentRoom && (
          <div className="sd-dial-layer">
            {/* Top row: CODE cipher banner + live status pill */}
            <div className="sd-code-row">
              <div
                className="sd-code-banner"
                data-testid="code-banner"
                aria-live="polite"
              >
                <span className="sd-code-prefix">CODE:</span>
                <span className="sd-code-letters">
                  {droppedTarget && (
                    <span
                      className="sd-code-letter is-dropping"
                      data-testid="dropped-code-letter"
                      aria-hidden="true"
                    >
                      {droppedTarget.letter}
                      <sub>{droppedTarget.octave}</sub>
                    </span>
                  )}
                  {remainingTargets.map((target, idx) => {
                    const isFirst = idx === 0;
                    const displayChar = state.cipherRevealed
                      ? target.letter
                      : CIPHER_LETTERS[
                          (scrambleTick + idx * 2) % CIPHER_LETTERS.length
                        ];
                    return (
                      <span
                        key={`${state.currentLetterIndex + idx}-${target.pitch}`}
                        data-testid={
                          isFirst ? "active-code-letter" : "queued-code-letter"
                        }
                        data-target-pitch={target.pitch}
                        data-target-duration={target.duration}
                        className={`sd-code-letter${
                          !state.cipherRevealed
                            ? " is-scrambling"
                            : isFirst
                              ? " is-active"
                              : ""
                        }`}
                      >
                        {displayChar}
                        {state.cipherRevealed && <sub>{target.octave}</sub>}
                      </span>
                    );
                  })}
                </span>
              </div>

              <div
                className={`sd-feedback-pill${
                  state.lastError
                    ? " is-error"
                    : shouldScheduleSmartTimer
                      ? " is-listening"
                      : ""
                }`}
                data-testid="dial-status-pill"
                role="status"
              >
                {!state.cipherRevealed && "Decoding safe cipher…"}
                {state.cipherRevealed &&
                  state.lastError === "pitch" &&
                  (showNoteNames
                    ? `Wrong pitch (${state.selectedPitch}) — aim for ${activeTarget?.pitch}`
                    : "Wrong pitch — check the staff")}
                {state.cipherRevealed &&
                  state.lastError === "value" &&
                  `Right pitch! Match ${
                    activeTarget ? DURATION_LABELS[activeTarget.duration] : ""
                  } with stethoscope`}
                {state.cipherRevealed &&
                  !state.lastError &&
                  shouldScheduleSmartTimer &&
                  "Listening to tumbler… hold still to lock in"}
                {state.cipherRevealed &&
                  !state.lastError &&
                  !shouldScheduleSmartTimer &&
                  (showNoteNames
                    ? `Dial on ${state.selectedPitch} · ${DURATION_SHORT_LABELS[state.selectedDuration]}`
                    : `${DURATION_SHORT_LABELS[state.selectedDuration]} selected`)}
              </div>
            </div>

            {/* Middle row: Stethoscope (left) · Combination Dial (center) · Turn Arrows (right) */}
            <div className={`sd-workbench${controlMode === "touch" ? " is-touch" : ""}`}>
              <div
                className={`sd-steth-rail${
                  state.lastError === "value" ? " is-error-value" : ""
                }`}
                data-testid="stethoscope-selector"
              >
                <img
                  className="sd-steth-hand"
                  src="/assets/staff-decode/stethoscope-hand.png"
                  alt=""
                  draggable={false}
                />
                <div className="sd-steth-side">
                  {controlMode === "buttons" && (
                    <button
                      type="button"
                      className="sd-arrow-btn"
                      data-testid="steth-up-btn"
                      aria-label="Previous note value"
                      onClick={() => stepDuration(-1)}
                    >
                      <ArrowUp size={18} strokeWidth={2.8} />
                    </button>
                  )}
                  <div
                    ref={stethStripRef}
                    className="sd-steth-strip"
                    role="radiogroup"
                    aria-label="Note subdivision value"
                    onPointerDown={handleStethPointer}
                    onPointerMove={(event) => {
                      if (event.buttons === 0) return;
                      handleStethPointer(event);
                    }}
                  >
                    {activeDurations.map((dur) => {
                      const selected = state.selectedDuration === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          data-testid={`steth-option-${dur}`}
                          className={`sd-steth-btn${selected ? " is-selected" : ""}`}
                          onClick={() => handleSelectDuration(dur)}
                          title={DURATION_LABELS[dur]}
                        >
                          <NoteValueGlyph duration={dur} size={28} />
                        </button>
                      );
                    })}
                  </div>
                  {controlMode === "buttons" && (
                    <button
                      type="button"
                      className="sd-arrow-btn"
                      data-testid="steth-down-btn"
                      aria-label="Next note value"
                      onClick={() => stepDuration(1)}
                    >
                      <ArrowDown size={18} strokeWidth={2.8} />
                    </button>
                  )}
                </div>
              </div>

              {/* Center Combination Dial SVG */}
              <div className="sd-dial-wrap">
                <div className="sd-dial-frame">
                <svg
                  ref={dialSvgRef}
                  viewBox="0 0 380 380"
                  className={`sd-dial-svg${
                    state.lastError === "pitch" ? " is-error-pitch" : ""
                  }`}
                  data-testid="safe-dial-wheel"
                  data-selected-pitch={state.selectedPitch}
                  onPointerDown={handleDialPointerDown}
                  onPointerMove={handleDialPointerMove}
                  onPointerUp={handleDialPointerUp}
                >
                  {/* Safe pedestal behind dial */}
                  <rect
                    x="130"
                    y="314"
                    width="120"
                    height="62"
                    rx="6"
                    fill="#95a4b4"
                    stroke="#4f5f70"
                    strokeWidth="3"
                  />
                  <rect
                    x="144"
                    y="324"
                    width="92"
                    height="42"
                    rx="4"
                    fill="#b0becd"
                  />

                  {/* Fixed 12-o'clock top selection notch */}
                  <polygon
                    points="190,6 180,-10 200,-10"
                    fill="#d96459"
                    stroke="#121212"
                    strokeWidth="2"
                  />

                  {/* Outer dial rim */}
                  <circle
                    cx="190"
                    cy="190"
                    r="172"
                    fill="#7c8792"
                    stroke="#2b333b"
                    strokeWidth="4"
                  />
                  <circle
                    cx="190"
                    cy="190"
                    r="160"
                    fill="#95a0ab"
                    stroke="#2b333b"
                    strokeWidth="3"
                  />
                  <circle
                    cx="190"
                    cy="190"
                    r="116"
                    fill="#525b63"
                    stroke="#2b333b"
                    strokeWidth="3"
                  />

                  {/* Rotating dial ring with tick marks and note stops around the edge */}
                  <g
                    className="sd-dial-rotor"
                    transform={`rotate(${rotorRotation} 190 190)`}
                  >
                    {/* Fine tick marks around the bezel */}
                    {Array.from({ length: 60 }).map((_, idx) => {
                      const angle = idx * 6;
                      const isMajor = idx % 5 === 0;
                      return (
                        <line
                          key={idx}
                          x1="190"
                          y1="32"
                          x2="190"
                          y2={isMajor ? "44" : "39"}
                          stroke="#1f252b"
                          strokeWidth={isMajor ? "2.4" : "1.4"}
                          transform={`rotate(${angle} 190 190)`}
                        />
                      );
                    })}

                    {/* Pitch stops placed around the dial edge */}
                    {activeStops.map((stop, idx) => {
                      const deg = -140 + idx * stepAngle;
                      const rad = (deg * Math.PI) / 180;
                      const r = 138;
                      const x = 190 + r * Math.sin(rad);
                      const y = 190 - r * Math.cos(rad);
                      const isSelected = stop.id === state.selectedPitch;

                      return (
                        <g
                          key={stop.id}
                          className="sd-dial-stop-group"
                          data-testid={`dial-stop-${stop.id}`}
                          onPointerDown={(ev) => {
                            // Touch mode only turns by swipe; let the press
                            // fall through to the wheel's swipe handler.
                            if (controlMode !== "buttons") return;
                            // Prefer an explicit stop tap over the SVG angle
                            // snap — stop here so parent capture does not
                            // remap the click to a neighboring detent.
                            ev.stopPropagation();
                            handleSelectPitch(stop.id);
                          }}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r={activeStops.length > 10 ? 13 : 16}
                            fill={isSelected ? "#2f5648" : "#dce3ec"}
                            stroke={isSelected ? "#ffffff" : "#2b333b"}
                            strokeWidth={isSelected ? "2.5" : "1.8"}
                          />
                          {showNoteNames && (
                            <text
                              x={x}
                              y={y + 4}
                              textAnchor="middle"
                              fontSize={activeStops.length > 10 ? "10.5" : "12.5"}
                              fontWeight="800"
                              fontFamily="var(--font-mono), monospace"
                              fill={isSelected ? "#ffffff" : "#121212"}
                              transform={`rotate(${-rotorRotation} ${x} ${y})`}
                              style={{ pointerEvents: "none" }}
                            >
                              {stop.subscriptLabel}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>

                  {/* Center toothed gear showing the REQUIRED target note value */}
                  <g
                    className={`sd-dial-center-group${
                      state.lastError === "value" ? " is-error-value" : ""
                    }`}
                    data-testid="dial-center-target-value"
                    data-required-duration={activeTarget?.duration ?? "q"}
                  >
                    {/* Gear teeth */}
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const angle = idx * 22.5;
                      return (
                        <rect
                          key={idx}
                          x="182"
                          y="102"
                          width="16"
                          height="16"
                          rx="3"
                          fill="#95a0ab"
                          transform={`rotate(${angle} 190 190)`}
                        />
                      );
                    })}
                    <circle
                      cx="190"
                      cy="190"
                      r="78"
                      fill="#7d8892"
                      stroke="#39424a"
                      strokeWidth="3"
                    />
                    <circle
                      cx="190"
                      cy="190"
                      r="66"
                      fill="#8e99a3"
                      stroke="#5d6770"
                      strokeWidth="2.5"
                    />

                    {/* Target Note Value inside the center of the dial */}
                    {activeTarget && (
                      <g
                        transform="translate(162, 142)"
                        style={{ color: "#121212" }}
                      >
                        <NoteValueGlyph
                          duration={activeTarget.duration}
                          size={56}
                        />
                      </g>
                    )}
                    <text
                      x="190"
                      y="236"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="var(--font-mono), monospace"
                      fill="#121212"
                    >
                      {activeTarget
                        ? `TARGET: ${DURATION_SHORT_LABELS[activeTarget.duration].toUpperCase()}`
                        : ""}
                    </text>
                  </g>
                </svg>
                {controlMode === "touch" && (
                  <img
                    key={dialTurn.n}
                    src="/assets/staff-decode/dial-hand.png"
                    alt=""
                    aria-hidden="true"
                    className={`sd-dial-hand${
                      dialTurn.dir ? ` is-turning-${dialTurn.dir}` : ""
                    }`}
                    data-testid="dial-hand"
                    draggable={false}
                  />
                )}
                </div>
              </div>

              {/* Right Turn-Dial Cues (Up / Down Arrows + Hand Cue) */}
              {controlMode === "buttons" && (
              <div
                className="sd-arrow-column"
                data-testid="dial-turn-controls"
              >
                <span className="sd-steth-title">Turn Dial</span>
                <div className="sd-arrow-pair">
                  <button
                    type="button"
                    className="sd-arrow-btn"
                    data-testid="dial-up-btn"
                    aria-label="Turn dial pitch higher"
                    disabled={!canStepUp}
                    onClick={() => handleStepDial(1)}
                  >
                    <ArrowUp size={22} strokeWidth={2.8} />
                  </button>
                  <button
                    type="button"
                    className="sd-arrow-btn"
                    data-testid="dial-down-btn"
                    aria-label="Turn dial pitch lower"
                    disabled={!canStepDown}
                    onClick={() => handleStepDial(-1)}
                  >
                    <ArrowDown size={22} strokeWidth={2.8} />
                  </button>
                </div>
                {showNoteNames && (
                  <span className="sd-arrow-caption">
                    {PITCH_STOP_BY_ID[state.selectedPitch].subscriptLabel}
                  </span>
                )}
              </div>
              )}
            </div>

            {/* Bottom row: Live Treble Staff Card */}
            <div className="sd-bottom-row">
              <div
                className={`sd-staff-card${
                  state.lastError === "pitch" ? " is-error-pitch" : ""
                }${state.lastError === "value" ? " is-error-value" : ""}`}
                data-testid="live-staff-card"
                data-pitch={state.selectedPitch}
                data-duration={state.selectedDuration}
              >
                <NotationStaff
                  score={guessScore}
                  wrapSystems={wrapStaff}
                  label={`Treble staff showing ${state.selectedPitch}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* PHASE 4: DOOR OPEN — Click open doorway to walk to next room or win vault */}
        {state.phase === "door-open" && (
          <>
            <button
              type="button"
              className="sd-doorway-hotspot"
              data-testid="open-doorway-hotspot"
              data-playing={playingBack ? "true" : "false"}
              disabled={playingBack}
              onClick={handleWalkThroughDoor}
            >
              <span className="sd-hotspot-pill">
                {playingBack
                  ? `Code "${currentRoom?.word}" cracked! Listen…`
                  : state.currentRoomIndex + 1 >= state.rooms.length
                    ? `Code "${currentRoom?.word}" Cracked! Click vault to claim the gold →`
                    : `Code "${currentRoom?.word}" Cracked! Click open door to walk to Room ${state.currentRoomIndex + 2} →`}
              </span>
            </button>
            <div
              className={`sd-solved-staff${playingBack ? "" : " is-faded"}`}
              data-testid="solved-staff"
            >
              <div
                className="sd-staff-card"
                data-testid="solved-staff-card"
                data-word={currentRoom?.word}
              >
                <NotationStaff
                  score={guessScore}
                  wrapSystems={wrapStaff}
                  label={`Cracked code ${currentRoom?.word ?? ""} on the treble staff`}
                />
              </div>
            </div>
          </>
        )}

        {/* PHASE 5: WIN VAULT SCREEN */}
        {state.phase === "win" && (
          <section
            className="sd-end-banner"
            data-testid="win-screen"
            aria-label="All safes cracked"
          >
            <span className="sd-eyebrow">
              All {ROOMS_PER_RUN} Rooms Cleared · {state.difficulty.toUpperCase()}
            </span>
            <h2 className="sd-end-title">
              Vault Unlocked in {formatClock(state.elapsedSec)}!
            </h2>
            <div className="sd-end-words">
              {state.rooms.map((r) => (
                <span key={r.roomIndex} className="sd-end-word-chip">
                  Room {r.roomIndex + 1}: {r.word}
                </span>
              ))}
            </div>
            <div className="sd-end-actions">
              <button
                type="button"
                className="sd-primary-btn"
                data-testid="play-again-btn"
                onClick={() => setState(startRun(state.difficulty))}
              >
                Crack Another 5 Rooms
              </button>
              <button
                type="button"
                className="sd-ghost-btn"
                onClick={() =>
                  setState(createInitialGameState(state.difficulty))
                }
              >
                Change Difficulty
              </button>
            </div>
          </section>
        )}

        {/* PHASE 6: HARD MODE LOSE SCREEN */}
        {state.phase === "lose" && (
          <section
            className="sd-end-banner"
            data-testid="lose-screen"
            aria-label="Vault locked"
          >
            <span className="sd-eyebrow">Hard Mode · Time Expired</span>
            <h2 className="sd-end-title">
              The vault shutters locked on Room {state.currentRoomIndex + 1}.
            </h2>
            <p className="sd-rules-copy" style={{ margin: 0 }}>
              Active code was <strong>{currentRoom?.word}</strong>. You cleared{" "}
              {state.currentRoomIndex} of {ROOMS_PER_RUN} rooms before the
              countdown hit zero.
            </p>
            <div className="sd-end-actions">
              <button
                type="button"
                className="sd-primary-btn"
                data-testid="retry-hard-btn"
                onClick={() => setState(startRun(state.difficulty))}
              >
                Try Again
              </button>
              <button
                type="button"
                className="sd-ghost-btn"
                onClick={() =>
                  setState(createInitialGameState(state.difficulty))
                }
              >
                Back to Setup
              </button>
            </div>
          </section>
        )}
      </div>

      <MusicTransport
        playing={music.playing}
        volume={music.volume}
        onToggle={music.toggle}
        onVolume={music.setVolume}
      />
    </div>
  );
}
