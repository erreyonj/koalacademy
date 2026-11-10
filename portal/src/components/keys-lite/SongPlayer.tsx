"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Note } from "tonal";
import {
  KEY_TOP,
  VIEW_H,
  VIEW_W,
  WHITE_H,
  blackKeys,
  whiteCenter,
  whiteKeys,
  type BlackKey,
  type WhiteKey,
} from "./keyboard";
import { playChord, releaseChord, resumePiano } from "./piano";
import { beatMs, type Finger } from "./timeline";
import type { SongScore, SongStep } from "./songs";

type PlayStatus = "idle" | "playing" | "done";

function midiOf(note: string): number | null {
  return Note.midi(note) ?? null;
}

function samePitch(a: string, b: string): boolean {
  const left = midiOf(a);
  const right = midiOf(b);
  return left != null && left === right;
}

function pitchesActive(step: SongStep | null): string[] {
  if (!step) return [];
  return [step.bass, ...step.chord];
}

function fingerForPitch(step: SongStep, pitch: string): Finger | null {
  if (samePitch(pitch, step.bass)) return step.bassFinger;
  const index = step.chord.findIndex((note) => samePitch(note, pitch));
  if (index < 0) return null;
  return step.chordFingers[index] ?? null;
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SongPlayer({ score }: { score: SongScore }) {
  const [status, setStatus] = useState<PlayStatus>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [loop, setLoop] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [playGen, setPlayGen] = useState(0);
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const step = score.steps[stepIndex] ?? null;
  const playing = status === "playing";

  const bassWhites = useMemo(
    () => whiteKeys(score.bassKeyboard.startLetter, score.bassKeyboard.startOctave),
    [score.bassKeyboard.startLetter, score.bassKeyboard.startOctave],
  );
  const bassBlacks = useMemo(
    () => blackKeys(score.bassKeyboard.startLetter, score.bassKeyboard.startOctave),
    [score.bassKeyboard.startLetter, score.bassKeyboard.startOctave],
  );
  const chordWhites = useMemo(
    () => whiteKeys(score.chordKeyboard.startLetter, score.chordKeyboard.startOctave),
    [score.chordKeyboard.startLetter, score.chordKeyboard.startOctave],
  );
  const chordBlacks = useMemo(
    () => blackKeys(score.chordKeyboard.startLetter, score.chordKeyboard.startOctave),
    [score.chordKeyboard.startLetter, score.chordKeyboard.startOctave],
  );

  useEffect(() => {
    if (status !== "playing") return;
    const current = score.steps[stepIndex];
    if (!current) {
      setStatus("done");
      return;
    }
    const holdMs = beatMs(score.bpm) * current.beats;
    const id = window.setTimeout(() => {
      const next = stepIndex + 1;
      if (next >= score.steps.length) {
        if (loopRef.current) {
          setStepIndex(0);
          setPlayGen((gen) => gen + 1);
          return;
        }
        setStatus("done");
        return;
      }
      setStepIndex(next);
      setPlayGen((gen) => gen + 1);
    }, holdMs);
    return () => window.clearTimeout(id);
  }, [status, playGen, stepIndex, score.bpm, score.steps]);

  useEffect(() => {
    if (status !== "playing" || !soundOn || !step) {
      if (status !== "playing") releaseChord();
      return;
    }
    playChord(pitchesActive(step));
  }, [status, playGen, step, soundOn]);

  useEffect(() => {
    return () => releaseChord();
  }, []);

  function start() {
    if (playing && loop) {
      stop();
      return;
    }
    if (soundOn) resumePiano();
    setStepIndex(0);
    setStatus("playing");
    setPlayGen((gen) => gen + 1);
  }

  function stop() {
    releaseChord();
    setStatus("idle");
    setStepIndex(0);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (!next) releaseChord();
    else if (playing && step) {
      resumePiano();
      playChord(pitchesActive(step));
    } else {
      resumePiano();
    }
  }

  const lcd = step
    ? `${step.symbol} · LH ${step.bass} · RH ${step.chord.join(" ")}`
    : `${score.title} · ${score.bpm} bpm`;

  return (
    <div
      className="song-player scale-hand"
      data-song={score.id}
      data-symbol={step?.symbol ?? "rest"}
      data-step={String(stepIndex)}
      data-bpm={String(score.bpm)}
      data-loop={loop ? "true" : "false"}
      data-sound={soundOn ? "on" : "off"}
    >
      <div className="deck-screen">
        <span className="lcd" aria-live="polite">
          {lcd}
        </span>
      </div>

      <div className="song-player-stack scale-hand-stack">
        <Register
          side="left"
          label={`Left hand bass for ${score.title}`}
          title="Left · bass"
          symbol={null}
          step={step}
          whites={bassWhites}
          blacks={bassBlacks}
          mode="bass"
        />
        <Register
          side="right"
          label={`Right hand chords for ${score.title}`}
          title="Right · chords"
          symbol={step?.symbol ?? null}
          step={step}
          whites={chordWhites}
          blacks={chordBlacks}
          mode="chord"
        />
      </div>

      <div className="scale-hand-controls tools-buttons">
        <button type="button" className="tools-button" onClick={start}>
          {playing && loop ? "Stop" : status === "done" ? "Replay" : "Play"}
        </button>
        {!loop && playing ? (
          <button type="button" className="tools-button" onClick={stop}>
            Stop
          </button>
        ) : null}
        <button
          type="button"
          className="tools-button"
          aria-pressed={loop}
          onClick={() => setLoop((on) => !on)}
        >
          Loop {loop ? "on" : "off"}
        </button>
        <button
          type="button"
          className="tools-button"
          aria-pressed={soundOn}
          onClick={toggleSound}
        >
          Sound {soundOn ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}

function Register({
  side,
  label,
  title,
  symbol,
  step,
  whites,
  blacks,
  mode,
}: {
  side: "left" | "right";
  label: string;
  title: string;
  symbol: string | null;
  step: SongStep | null;
  whites: WhiteKey[];
  blacks: BlackKey[];
  mode: "bass" | "chord";
}) {
  return (
    <div className="song-register scale-hand-module" data-side={side}>
      <div className="song-register-meta" data-side={side}>
        <span className="song-register-title">{title}</span>
        {symbol ? <span className="song-register-symbol">{symbol}</span> : null}
        {step && mode === "bass" ? (
          <span className="song-register-note">{step.bass}</span>
        ) : null}
      </div>
      <SongKeyboard
        label={label}
        title={title}
        step={step}
        whites={whites}
        blacks={blacks}
        mode={mode}
      />
    </div>
  );
}

function SongKeyboard({
  label,
  title,
  step,
  whites,
  blacks,
  mode,
}: {
  label: string;
  title: string;
  step: SongStep | null;
  whites: WhiteKey[];
  blacks: BlackKey[];
  mode: "bass" | "chord";
}) {
  const active =
    mode === "bass"
      ? step
        ? [step.bass]
        : []
      : step
        ? step.chord
        : [];

  const isPressed = (pitch: string) =>
    active.some((note) => samePitch(note, pitch));

  const first = whites[0]?.note ?? "";
  const last = whites[whites.length - 1]?.note ?? "";

  return (
    <svg
      className="scale-hand-keys"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{title}</title>
      <desc>
        Piano from {first} to {last}. Lit keys show the current{" "}
        {mode === "bass" ? "bass note" : "chord"} with finger numbers.
      </desc>

      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} className="scale-hand-bed" />

      {whites.map((key) => {
        const pressed = isPressed(key.note);
        const finger = step && pressed ? fingerForPitch(step, key.note) : null;
        return (
          <g key={key.note}>
            <rect
              x={key.x}
              y={key.y}
              width={key.width}
              height={key.height}
              rx="3"
              className={classNames("scale-hand-white", pressed && "is-pressed")}
            />
            <text
              x={whiteCenter(key.index)}
              y={KEY_TOP + WHITE_H - 14}
              className={classNames(
                "scale-hand-key-letter",
                pressed && "is-pressed",
              )}
            >
              {key.letter}
            </text>
            {finger != null ? (
              <FingerBadge
                x={whiteCenter(key.index)}
                y={KEY_TOP + WHITE_H * 0.62}
                finger={finger}
                onBlack={false}
              />
            ) : null}
          </g>
        );
      })}

      {blacks.map((key) => {
        const pressed = isPressed(key.note) || isPressed(key.flat);
        const match = active.find(
          (note) => samePitch(note, key.note) || samePitch(note, key.flat),
        );
        const finger = step && match ? fingerForPitch(step, match) : null;
        return (
          <g key={`black-${key.afterIndex}`}>
            <rect
              x={key.x}
              y={key.y}
              width={key.width}
              height={key.height}
              rx="2"
              className={classNames("scale-hand-black", pressed && "is-pressed")}
            />
            {finger != null ? (
              <FingerBadge
                x={key.x + key.width / 2}
                y={key.y + key.height * 0.55}
                finger={finger}
                onBlack
              />
            ) : null}
          </g>
        );
      })}

      {mode === "chord" && step ? (
        <text x={VIEW_W / 2} y={KEY_TOP - 8} className="scale-hand-note">
          {step.symbol}
        </text>
      ) : null}
    </svg>
  );
}

function FingerBadge({
  x,
  y,
  finger,
  onBlack,
}: {
  x: number;
  y: number;
  finger: Finger;
  onBlack: boolean;
}) {
  return (
    <g className={onBlack ? "song-finger is-on-black" : "song-finger"}>
      <circle cx={x} cy={y} r="11" />
      <text x={x} y={y + 4} textAnchor="middle">
        {finger}
      </text>
    </g>
  );
}
