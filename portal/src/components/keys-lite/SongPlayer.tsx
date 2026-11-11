"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RefreshCw, Square, Volume2, VolumeX } from "lucide-react";
import { Note } from "tonal";
import {
  KEY_TOP,
  VIEW_H,
  WHITE_H,
  blackKeys,
  viewWidth,
  whiteCenter,
  whiteKeys,
  type BlackKey,
  type WhiteKey,
} from "./keyboard";
import { playChord, releaseChord, resumePiano } from "./piano";
import {
  highlightSongBar,
  renderSongStaff,
  type SongMeasureHit,
} from "./renderSongStaff";
import { beatMs } from "./timeline";
import { stepToBar, type SongScore, type SongStep } from "./songs";

type PlayStatus = "idle" | "playing" | "done";
type LabelMode = "names" | "fingers";

const FRAME_DIR = "/keys-lite";
const FRAME_IDLE = "keys-lite-rh-frame-1.png";

function midiOf(note: string): number | null {
  return Note.midi(note) ?? null;
}

function samePitch(a: string, b: string): boolean {
  const left = midiOf(a);
  const right = midiOf(b);
  return left != null && left === right;
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function pitchesActive(step: SongStep | null): string[] {
  if (!step || step.rest || step.bass == null) return [];
  return [step.bass, ...step.chord];
}

export function SongPlayer({ score }: { score: SongScore }) {
  const [status, setStatus] = useState<PlayStatus>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [loop, setLoop] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>("names");
  const [playGen, setPlayGen] = useState(0);
  const [measures, setMeasures] = useState<SongMeasureHit[]>([]);
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const staffHostRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const step = score.steps[stepIndex] ?? null;
  const activeBar = step ? stepToBar(score.steps, stepIndex) : null;
  const playing = status === "playing";

  const whites = useMemo(
    () =>
      whiteKeys(
        score.keyboard.startLetter,
        score.keyboard.startOctave,
        score.keyboard.whiteCount,
      ),
    [score.keyboard],
  );
  const blacks = useMemo(
    () =>
      blackKeys(
        score.keyboard.startLetter,
        score.keyboard.startOctave,
        score.keyboard.whiteCount,
      ),
    [score.keyboard],
  );
  const pianoWidth = viewWidth(score.keyboard.whiteCount);

  useEffect(() => {
    const img = new Image();
    img.src = `${FRAME_DIR}/${FRAME_IDLE}`;
  }, []);

  useEffect(() => {
    const host = staffHostRef.current;
    if (!host) return;
    let cancelled = false;
    void renderSongStaff(host, score).then((result) => {
      if (cancelled) return;
      setMeasures(result.measures);
      highlightSongBar(host, result.measures, activeBar);
    });
    return () => {
      cancelled = true;
    };
    // activeBar is applied in the highlight effect after the staff exists
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  useEffect(() => {
    const host = staffHostRef.current;
    if (!host || measures.length === 0) return;
    highlightSongBar(host, measures, activeBar);
  }, [activeBar, measures]);

  useEffect(() => {
    if (activeBar == null || !scrollerRef.current || !measures[activeBar]) return;
    const scroller = scrollerRef.current;
    const hit = measures[activeBar];
    const target = hit.firstChordX - scroller.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeBar, measures]);

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
    const pitches = pitchesActive(step);
    if (pitches.length === 0) {
      releaseChord();
      return;
    }
    const prev = score.steps[stepIndex - 1];
    const prevPitches = pitchesActive(prev ?? null);
    const same =
      prevPitches.length === pitches.length &&
      prevPitches.every((pitch, index) => samePitch(pitch, pitches[index] ?? ""));
    if (same) return;
    playChord(pitches);
  }, [status, playGen, step, soundOn, score.steps, stepIndex]);

  useEffect(() => () => releaseChord(), []);

  function jumpToSection(startStep: number) {
    releaseChord();
    setStepIndex(startStep);
    setStatus("idle");
    setPlayGen((gen) => gen + 1);
  }

  function start() {
    if (playing) {
      stop();
      return;
    }
    if (soundOn) resumePiano();
    if (status === "done") setStepIndex(0);
    setStatus("playing");
    setPlayGen((gen) => gen + 1);
  }

  function stop() {
    releaseChord();
    setStatus("idle");
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
    ? step.rest || step.bass == null
      ? `${step.section} · rest`
      : `${step.section} · ${step.symbol} · LH ${step.bass} · RH ${step.chord.join(" ")}`
    : `${score.title} · ${score.key} · ${score.bpm} bpm`;

  return (
    <div
      className="song-player scale-hand"
      data-song={score.id}
      data-symbol={step?.symbol ?? "rest"}
      data-step={String(stepIndex)}
      data-bpm={String(score.bpm)}
      data-loop={loop ? "true" : "false"}
      data-sound={soundOn ? "on" : "off"}
      data-labels={labelMode}
    >
      <div className="deck-screen">
        <span className="lcd" aria-live="polite">
          {lcd}
        </span>
      </div>

      <div className="song-form-row" role="list">
        {score.sections.map((section) => {
          const bar = activeBar ?? -1;
          const onSection =
            bar >= section.startBar && bar < section.startBar + section.barCount;
          return (
            <button
              key={section.id}
              type="button"
              className={classNames("song-form-chip", onSection && "is-active")}
              onClick={() => jumpToSection(section.startStep)}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      <div className="song-body">
        <div className="song-stage">
          <div className="song-staff-scroll" ref={scrollerRef}>
            <div className="song-staff-host" ref={staffHostRef} />
          </div>

          <div className="song-piano-gutter">
            <HandCue side="left" active={Boolean(step && !step.rest && step.bass)} />
            <SongPiano
              whites={whites}
              blacks={blacks}
              width={pianoWidth}
              step={step}
              labelMode={labelMode}
            />
            <HandCue
              side="right"
              active={Boolean(step && !step.rest && step.chord.length)}
            />
          </div>
        </div>

        <div className="song-controls" role="toolbar" aria-label="Song controls">
          <button
            type="button"
            className="song-control"
            onClick={start}
            aria-label={playing ? "Stop" : status === "done" ? "Replay" : "Play"}
          >
            {playing ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="song-control"
            aria-label={loop ? "Loop on" : "Loop off"}
            aria-pressed={loop}
            onClick={() => setLoop((on) => !on)}
          >
            <RefreshCw aria-hidden="true" />
          </button>
          <button
            type="button"
            className="song-control"
            aria-label={soundOn ? "Sound on" : "Sound off"}
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            {soundOn ? (
              <Volume2 aria-hidden="true" />
            ) : (
              <VolumeX aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="song-control"
            aria-label={
              labelMode === "names"
                ? "Show finger numbers"
                : "Show note names"
            }
            aria-pressed={labelMode === "fingers"}
            onClick={() =>
              setLabelMode((mode) => (mode === "names" ? "fingers" : "names"))
            }
          >
            <span className="song-control-text" aria-hidden="true">
              {labelMode === "fingers" ? "123" : "A♭"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HandCue({ side, active }: { side: "left" | "right"; active: boolean }) {
  return (
    <div
      className={classNames(
        "song-hand-cue",
        active && "is-active",
        side === "left" && "is-left",
        side === "right" && "is-right",
      )}
      data-side={side}
      aria-hidden="true"
    >
      <img
        src={`${FRAME_DIR}/${FRAME_IDLE}`}
        alt=""
        className="song-hand-cue-img"
      />
      <span className="song-hand-cue-label">{side === "left" ? "LH" : "RH"}</span>
    </div>
  );
}

function SongPiano({
  whites,
  blacks,
  width,
  step,
  labelMode,
}: {
  whites: WhiteKey[];
  blacks: BlackKey[];
  width: number;
  step: SongStep | null;
  labelMode: LabelMode;
}) {
  const resting = Boolean(step?.rest) || step?.bass == null;
  const bass = resting ? null : step?.bass ?? null;
  const chord = resting ? [] : (step?.chord ?? []);

  const isBass = (pitch: string) => bass != null && samePitch(pitch, bass);
  const isChord = (pitch: string) => chord.some((note) => samePitch(note, pitch));

  function labelFor(pitch: string, hand: "bass" | "chord"): string | null {
    if (!step || resting) return null;
    if (labelMode === "names") return pitch;
    if (hand === "bass") return String(step.bassFinger);
    const index = step.chord.findIndex((note) => samePitch(note, pitch));
    if (index < 0) return null;
    return String(step.chordFingers[index] ?? "");
  }

  return (
    <svg
      className="song-piano-keys"
      viewBox={`0 0 ${width} ${VIEW_H}`}
      role="img"
      aria-label="Song piano"
      preserveAspectRatio="xMidYMid meet"
    >
      <title>Full-range piano</title>
      <rect x="0" y="0" width={width} height={VIEW_H} className="scale-hand-bed" />

      {whites.map((key) => {
        const bassHit = isBass(key.note);
        const chordHit = isChord(key.note);
        const pressed = bassHit || chordHit;
        const hand = bassHit ? "bass" : "chord";
        const label = pressed ? labelFor(key.note, hand) : null;
        return (
          <g key={key.note}>
            <rect
              x={key.x}
              y={key.y}
              width={key.width}
              height={key.height}
              rx="3"
              className={classNames(
                "scale-hand-white",
                bassHit && "is-bass",
                chordHit && "is-chord",
                pressed && "is-pressed",
              )}
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
            {label ? (
              <KeyLabel
                x={whiteCenter(key.index)}
                y={KEY_TOP + WHITE_H * 0.58}
                text={label}
                hand={hand}
              />
            ) : null}
          </g>
        );
      })}

      {blacks.map((key) => {
        const bassHit = isBass(key.note) || isBass(key.flat);
        const chordHit = isChord(key.note) || isChord(key.flat);
        const pressed = bassHit || chordHit;
        const match = [...(bass ? [bass] : []), ...chord].find(
          (note) => samePitch(note, key.note) || samePitch(note, key.flat),
        );
        const hand = bassHit ? "bass" : "chord";
        const label =
          pressed && match ? labelFor(match, hand) : null;
        return (
          <g key={`black-${key.afterIndex}`}>
            <rect
              x={key.x}
              y={key.y}
              width={key.width}
              height={key.height}
              rx="2"
              className={classNames(
                "scale-hand-black",
                bassHit && "is-bass",
                chordHit && "is-chord",
                pressed && "is-pressed",
              )}
            />
            {label ? (
              <KeyLabel
                x={key.x + key.width / 2}
                y={key.y + key.height * 0.55}
                text={label}
                hand={hand}
                onBlack
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function KeyLabel({
  x,
  y,
  text,
  hand,
  onBlack = false,
}: {
  x: number;
  y: number;
  text: string;
  hand: "bass" | "chord";
  onBlack?: boolean;
}) {
  const wide = text.length > 2;
  return (
    <g
      className={classNames(
        "song-key-label",
        hand === "bass" && "is-bass",
        hand === "chord" && "is-chord",
        onBlack && "is-on-black",
      )}
    >
      <rect
        x={x - (wide ? 18 : 12)}
        y={y - 11}
        width={wide ? 36 : 24}
        height={22}
        rx="11"
      />
      <text x={x} y={y + 4} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
