"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Note } from "tonal";
import { COMMON_MAJOR_KEYS, scalePitchesFor } from "@/lib/notation/key";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  KEY_TOP,
  VIEW_H,
  VIEW_W,
  WHITE_H,
  blackKeys,
  keyboardStart,
  whiteCenter,
  whiteKeys,
  type BlackKey,
  type WhiteKey,
} from "./keyboard";
import { playNote, resumePiano } from "./piano";
import { fiveFingerIdle, fiveFingerMotion } from "./fiveFinger";
import {
  FINGERS,
  STEP_HOLD_MS,
  beatMs,
  lcdLine,
  nextTempo,
  type Finger,
  type HandSide,
  type MotionSample,
  type ScaleDir,
  type TimingMode,
} from "./timeline";

type PlayStatus = "idle" | "playing" | "done";
type FiveMode = "major" | "minor";

const FRAME_DIR = "/keys-lite";
const FRAME_IDLE = "keys-lite-rh-frame-1.png";
const FRAME_FILES = [
  FRAME_IDLE,
  "keys-lite-rh-frame-2+5.png",
  "keys-lite-rh-frame-3+6.png",
  "keys-lite-rh-frame-4.png",
  "keys-lite-rh-frame-7.png",
  "keys-lite-rh-frame-8.png",
] as const;

const FINGER_FRAMES: Record<Finger, string> = {
  1: FRAME_IDLE,
  2: "keys-lite-rh-frame-2+5.png",
  3: "keys-lite-rh-frame-3+6.png",
  4: "keys-lite-rh-frame-7.png",
  5: "keys-lite-rh-frame-8.png",
};

function samePitch(a: string, b: string): boolean {
  const left = Note.midi(a);
  const right = Note.midi(b);
  return left != null && left === right;
}

function midiOf(note: string): number | null {
  return Note.midi(note) ?? null;
}

function pitchClassOf(note: string): number | null {
  const midi = midiOf(note);
  return midi == null ? null : ((midi % 12) + 12) % 12;
}

function frameSrc(finger: Finger | null): string {
  if (!finger) return `${FRAME_DIR}/${FRAME_IDLE}`;
  return `${FRAME_DIR}/${FINGER_FRAMES[finger]}`;
}

function noteAnchorX(
  note: string,
  whites: WhiteKey[],
  blacks: BlackKey[],
): number {
  const white = whites.find((key) => samePitch(key.note, note));
  if (white) return whiteCenter(white.index);
  const black = blacks.find(
    (key) => samePitch(key.note, note) || samePitch(key.flat, note),
  );
  if (black) return black.x + black.width / 2;
  return whiteCenter(0);
}

function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function positionLabel(tonic: string, mode: FiveMode): string {
  return mode === "major" ? `${tonic} major` : `${tonic} minor`;
}

/** Fingertip badge centers as % of the gutter PNG. Right: thumb on image-left. */
const TIPS_RIGHT: Record<Finger, { x: number; y: number }> = {
  1: { x: 21.2, y: 41.5 },
  2: { x: 37.5, y: 15.4 },
  3: { x: 50.7, y: 10.9 },
  4: { x: 63.5, y: 15.6 },
  5: { x: 79.4, y: 29.8 },
};

/** Left gutter uses a mirrored image, so thumb sits on image-right. */
const TIPS_LEFT: Record<Finger, { x: number; y: number }> = {
  1: { x: 78.8, y: 41.5 },
  2: { x: 62.5, y: 15.4 },
  3: { x: 49.3, y: 10.9 },
  4: { x: 36.5, y: 15.6 },
  5: { x: 20.6, y: 29.8 },
};

export function FiveFingerHand() {
  const [status, setStatus] = useState<PlayStatus>("idle");
  const [playGen, setPlayGen] = useState(0);
  const [side, setSide] = useState<HandSide>("right");
  const [showBoth, setShowBoth] = useState(false);
  const [dir, setDir] = useState<ScaleDir>("up");
  const [bySide, setBySide] = useState<{ left: MotionSample; right: MotionSample }>(
    () => ({
      left: fiveFingerIdle(),
      right: fiveFingerIdle(),
    }),
  );
  const [loop, setLoop] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [timingMode, setTimingMode] = useState<TimingMode>("lesson");
  const [bpm, setBpm] = useState(80);
  const [tonic, setTonic] = useState<string>("C");
  const [mode, setMode] = useState<FiveMode>("major");
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const register = useMemo(() => keyboardStart(tonic), [tonic]);
  const pitches = useMemo(() => {
    const full = scalePitchesFor(`${tonic} ${mode}`, register.octave);
    return full.slice(0, 5);
  }, [tonic, mode, register.octave]);
  const whites = useMemo(
    () => whiteKeys(register.letter, register.octave),
    [register.letter, register.octave],
  );
  const blacks = useMemo(
    () => blackKeys(register.letter, register.octave),
    [register.letter, register.octave],
  );
  const timing = useMemo(
    () => ({ mode: timingMode, bpm }),
    [timingMode, bpm],
  );
  const leftMotion = useMemo(
    () => fiveFingerMotion("left", dir, timing, pitches),
    [dir, timing, pitches],
  );
  const rightMotion = useMemo(
    () => fiveFingerMotion("right", dir, timing, pitches),
    [dir, timing, pitches],
  );
  const name = positionLabel(tonic, mode);
  const sample = showBoth ? bySide.right : bySide[side];
  const line = lcdLine(sample, name, side, {
    both: showBoth,
    smooth: timingMode === "smooth",
    bpm,
  });
  const playing = status === "playing";
  const modules: HandSide[] = showBoth ? ["left", "right"] : [side];

  useEffect(() => {
    for (const file of FRAME_FILES) {
      const img = new Image();
      img.src = `${FRAME_DIR}/${file}`;
    }
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const holdMs = timingMode === "smooth" ? beatMs(bpm) : STEP_HOLD_MS;
    const lead = side === "left" ? leftMotion : rightMotion;
    const count = showBoth
      ? Math.min(leftMotion.steps.length, rightMotion.steps.length)
      : lead.steps.length;
    let index = 0;

    const paint = (at: number) => {
      if (showBoth) {
        setBySide({
          left: leftMotion.steps[Math.min(at, leftMotion.steps.length - 1)],
          right: rightMotion.steps[Math.min(at, rightMotion.steps.length - 1)],
        });
      } else {
        setBySide((prev) => ({ ...prev, [side]: lead.steps[at] }));
      }
    };

    paint(0);
    const id = window.setInterval(() => {
      index += 1;
      if (index >= count) {
        if (loopRef.current) {
          index = 0;
          paint(0);
          return;
        }
        window.clearInterval(id);
        setStatus("done");
        return;
      }
      paint(index);
    }, holdMs);
    return () => window.clearInterval(id);
  }, [status, playGen, leftMotion, rightMotion, showBoth, side, timingMode, bpm]);

  useEffect(() => {
    if (!soundOn || !sample.note) return;
    playNote(sample.note);
  }, [sample.note, sample.attack, soundOn]);

  function resetHands() {
    setBySide({
      left: fiveFingerIdle(),
      right: fiveFingerIdle(),
    });
  }

  function chooseTonic(next: string) {
    setTonic(next);
    setStatus("idle");
    resetHands();
  }

  function chooseMode(next: string) {
    if (next !== "major" && next !== "minor") return;
    setMode(next);
    setStatus("idle");
    resetHands();
  }

  function start(nextDir: ScaleDir) {
    if (playing && loop && dir === nextDir) {
      stop();
      return;
    }
    if (soundOn) resumePiano();
    setDir(nextDir);
    resetHands();
    setStatus("playing");
    setPlayGen((gen) => gen + 1);
  }

  function stop() {
    setStatus("idle");
    resetHands();
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (next) resumePiano();
  }

  function toggleHand() {
    if (showBoth) return;
    setSide((prev) => (prev === "right" ? "left" : "right"));
    resetHands();
    setStatus("idle");
  }

  function toggleBoth() {
    setShowBoth((on) => !on);
    setStatus("idle");
    resetHands();
  }

  function toggleSmooth() {
    setTimingMode((value) => (value === "smooth" ? "lesson" : "smooth"));
  }

  const handName = side === "right" ? "Right" : "Left";
  const label = showBoth
    ? sample.note
      ? `Both hands playing ${sample.note}`
      : `${name}, both hands`
    : sample.note
      ? `${handName} hand playing ${sample.note} with finger ${sample.pressedFinger ?? ""}`
      : `${handName} hand ready over ${name}`;

  return (
    <div
      className="scale-hand"
      data-note={sample.note ?? "rest"}
      data-finger={sample.pressedFinger ? String(sample.pressedFinger) : ""}
      data-attack={String(sample.attack)}
      data-hand={showBoth ? "both" : side}
      data-dir={dir}
      data-both={showBoth ? "true" : "false"}
      data-smooth={timingMode === "smooth" ? "true" : "false"}
      data-bpm={String(bpm)}
      data-loop={loop ? "true" : "false"}
      data-sound={soundOn ? "on" : "off"}
      data-key={tonic}
      data-mode={mode}
    >
      <div className="deck-screen">
        <span className="lcd" aria-live="polite">
          {line}
        </span>
      </div>

      <div className="scale-hand-stack">
        {modules.map((moduleSide) => {
          const live = bySide[moduleSide];
          return (
            <HandModule
              key={moduleSide}
              side={moduleSide}
              note={live.note}
              pressedFinger={live.pressedFinger}
              whites={whites}
              blacks={blacks}
              pitches={pitches}
              positionName={name}
              label={label}
            />
          );
        })}
      </div>

      <div className="scale-hand-controls tools-buttons">
        <button
          type="button"
          className="tools-button"
          disabled={playing && !(loop && dir === "up")}
          onClick={() => start("up")}
        >
          {playing && loop && dir === "up"
            ? "Stop"
            : status === "done" && dir === "up"
              ? "Replay"
              : "Play"}
        </button>
        <button
          type="button"
          className="tools-button"
          disabled={playing && !(loop && dir === "down")}
          onClick={() => start("down")}
        >
          {playing && loop && dir === "down" ? "Stop" : "Descending"}
        </button>
        <button
          type="button"
          className="tools-button"
          disabled={playing && !(loop && dir === "updown")}
          onClick={() => start("updown")}
        >
          {playing && loop && dir === "updown" ? "Stop" : "Up/down"}
        </button>
        <button
          type="button"
          className="tools-button"
          disabled={playing || showBoth}
          aria-pressed={side === "left"}
          onClick={toggleHand}
        >
          Hand · {handName}
        </button>
        <button
          type="button"
          className="tools-button"
          disabled={playing}
          aria-pressed={showBoth}
          onClick={toggleBoth}
        >
          Both
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="tools-button" disabled={playing}>
            Key · {tonic}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" className="scale-hand-menu">
            <DropdownMenuRadioGroup value={tonic} onValueChange={chooseTonic}>
              {COMMON_MAJOR_KEYS.map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {key}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="tools-button" disabled={playing}>
            Mode · {mode === "major" ? "Major" : "Minor"}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" className="scale-hand-menu">
            <DropdownMenuRadioGroup value={mode} onValueChange={chooseMode}>
              <DropdownMenuRadioItem value="major">Major</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="minor">Minor</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          className="tools-button"
          aria-pressed={loop}
          onClick={() => setLoop((on) => !on)}
        >
          Loop
        </button>
        <button
          type="button"
          className="tools-button"
          aria-pressed={timingMode === "smooth"}
          onClick={toggleSmooth}
        >
          Smooth
        </button>
        <button
          type="button"
          className="tools-button"
          disabled={timingMode !== "smooth"}
          onClick={() => setBpm((value) => nextTempo(value))}
        >
          Tempo · {bpm}
        </button>
        <button
          type="button"
          className="tools-button"
          aria-pressed={!soundOn}
          onClick={toggleSound}
        >
          Sound · {soundOn ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}

function HandModule({
  side,
  note,
  pressedFinger,
  whites,
  blacks,
  pitches,
  positionName,
  label,
}: {
  side: HandSide;
  note: string | null;
  pressedFinger: Finger | null;
  whites: WhiteKey[];
  blacks: BlackKey[];
  pitches: string[];
  positionName: string;
  label: string;
}) {
  const hand = <GutterHand side={side} pressedFinger={pressedFinger} />;
  const keys = (
    <Keyboard
      whites={whites}
      blacks={blacks}
      note={note}
      pitches={pitches}
      positionName={positionName}
      side={side}
      label={label}
    />
  );
  return (
    <div className="scale-hand-module" data-side={side}>
      {side === "left" ? (
        <>
          {hand}
          {keys}
        </>
      ) : (
        <>
          {keys}
          {hand}
        </>
      )}
    </div>
  );
}

const HOME_SIZE = 20;

function Keyboard({
  whites,
  blacks,
  note,
  pitches,
  positionName,
  side,
  label,
}: {
  whites: WhiteKey[];
  blacks: BlackKey[];
  note: string | null;
  pitches: string[];
  positionName: string;
  side: HandSide;
  label: string;
}) {
  const spanPcs = new Set(
    pitches
      .map((pitch) => pitchClassOf(pitch))
      .filter((pc): pc is number => pc != null),
  );
  const inSpan = (pitch: string) => {
    const pc = pitchClassOf(pitch);
    return pc != null && spanPcs.has(pc);
  };
  const homes = [
    ...whites
      .filter((key) => inSpan(key.note))
      .map((key) => ({
        id: key.note,
        x: whiteCenter(key.index),
        y: KEY_TOP + WHITE_H - 38,
        onBlack: false,
      })),
    ...blacks
      .filter((key) => inSpan(key.note) || inSpan(key.flat))
      .map((key) => ({
        id: key.note,
        x: key.x + key.width / 2,
        y: key.y + key.height * 0.42,
        onBlack: true,
      })),
  ];
  const first = pitches[0] ?? whites[0]?.note ?? "C4";
  const last = pitches[pitches.length - 1] ?? "G4";

  return (
    <svg
      className="scale-hand-keys"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{`${positionName} five-finger position, ${side} hand`}</title>
      <desc>
        A piano from {first} to {last}. Home marks sit on the five-finger
        span. The sounding note lights as the position plays.
      </desc>

      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} className="scale-hand-bed" />

      {whites.map((key) => {
        const pressed = note != null && samePitch(note, key.note);
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
          </g>
        );
      })}

      {blacks.map((key) => {
        const pressed =
          note != null &&
          (samePitch(note, key.note) || samePitch(note, key.flat));
        return (
          <rect
            key={`black-${key.afterIndex}`}
            x={key.x}
            y={key.y}
            width={key.width}
            height={key.height}
            rx="2"
            className={classNames(
              "scale-hand-black",
              pressed && "is-pressed",
            )}
          />
        );
      })}

      {homes.map((home) => (
        <g
          key={`home-${home.id}`}
          className={
            home.onBlack ? "scale-hand-home is-on-black" : "scale-hand-home"
          }
          transform={`translate(${home.x - HOME_SIZE / 2} ${home.y - HOME_SIZE / 2}) scale(${HOME_SIZE / 24})`}
          aria-hidden="true"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </g>
      ))}

      {note ? (
        <text
          x={noteAnchorX(note, whites, blacks)}
          y={KEY_TOP - 8}
          className="scale-hand-note"
        >
          {note}
        </text>
      ) : null}
    </svg>
  );
}

function GutterHand({
  side,
  pressedFinger,
}: {
  side: HandSide;
  pressedFinger: Finger | null;
}) {
  const tips = side === "right" ? TIPS_RIGHT : TIPS_LEFT;
  return (
    <div className="scale-hand-gutter" data-side={side}>
      <div className="scale-hand-gutter-inner">
        <img
          src={frameSrc(pressedFinger)}
          alt=""
          className="scale-hand-gutter-img"
        />
        {FINGERS.map((finger) => (
          <span
            key={finger}
            className={
              pressedFinger === finger ? "scale-hand-tip is-active" : "scale-hand-tip"
            }
            style={{ left: `${tips[finger].x}%`, top: `${tips[finger].y}%` }}
          >
            {finger}
          </span>
        ))}
      </div>
    </div>
  );
}
