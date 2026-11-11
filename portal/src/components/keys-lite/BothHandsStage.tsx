"use client";

import { Note } from "tonal";
import {
  KEY_TOP,
  VIEW_H,
  WHITE_H,
  whiteCenter,
  type BlackKey,
  type WhiteKey,
} from "./keyboard";
import { GutterHand } from "./GutterHand";
import type { Finger, MotionSample } from "./timeline";

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

function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
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

const HOME_SIZE = 20;

export function BothHandsStage({
  left,
  right,
  whites,
  blacks,
  leftPitches,
  rightPitches,
  scaleName,
  label,
  svgWidth,
  homeMode = "tonic",
}: {
  left: MotionSample;
  right: MotionSample;
  whites: WhiteKey[];
  blacks: BlackKey[];
  leftPitches: string[];
  rightPitches: string[];
  scaleName: string;
  label: string;
  svgWidth: number;
  homeMode?: "tonic" | "span";
}) {
  return (
    <div className="scale-hand-module scale-hand-both" data-side="both">
      <div className="song-piano-gutter scale-hand-both-gutter">
        <GutterHand
          side="left"
          pressedFinger={left.pressedFinger}
          afterTurn={left.shift >= 0.5}
        />
        <BothKeyboard
          whites={whites}
          blacks={blacks}
          leftNote={left.note}
          rightNote={right.note}
          leftFinger={left.pressedFinger}
          rightFinger={right.pressedFinger}
          leftPitches={leftPitches}
          rightPitches={rightPitches}
          scaleName={scaleName}
          label={label}
          svgWidth={svgWidth}
          homeMode={homeMode}
        />
        <GutterHand
          side="right"
          pressedFinger={right.pressedFinger}
          afterTurn={right.shift >= 0.5}
        />
      </div>
    </div>
  );
}

function BothKeyboard({
  whites,
  blacks,
  leftNote,
  rightNote,
  leftFinger,
  rightFinger,
  leftPitches,
  rightPitches,
  scaleName,
  label,
  svgWidth,
  homeMode,
}: {
  whites: WhiteKey[];
  blacks: BlackKey[];
  leftNote: string | null;
  rightNote: string | null;
  leftFinger: Finger | null;
  rightFinger: Finger | null;
  leftPitches: string[];
  rightPitches: string[];
  scaleName: string;
  label: string;
  svgWidth: number;
  homeMode: "tonic" | "span";
}) {
  const homePitches =
    homeMode === "span"
      ? [...leftPitches, ...rightPitches]
      : [leftPitches[0], rightPitches[0]].filter(Boolean) as string[];
  const homePcs = new Set(
    homePitches
      .map((pitch) => pitchClassOf(pitch))
      .filter((pc): pc is number => pc != null),
  );
  /** Exact pitched homes (separate octaves) when tonic mode. */
  const homeExact =
    homeMode === "tonic"
      ? new Set(homePitches)
      : null;

  const isHome = (pitch: string) => {
    if (homeExact) {
      return [...homeExact].some((home) => samePitch(home, pitch));
    }
    const pc = pitchClassOf(pitch);
    return pc != null && homePcs.has(pc);
  };

  const isLeft = (pitch: string) =>
    leftNote != null && samePitch(pitch, leftNote);
  const isRight = (pitch: string) =>
    rightNote != null && samePitch(pitch, rightNote);

  const first = leftPitches[0] ?? whites[0]?.note ?? "C3";
  const last =
    rightPitches[rightPitches.length - 1] ??
    whites[whites.length - 1]?.note ??
    "C5";

  const homes = [
    ...whites
      .filter((key) => isHome(key.note))
      .map((key) => ({
        id: key.note,
        x: whiteCenter(key.index),
        y: KEY_TOP + WHITE_H - 38,
        onBlack: false,
      })),
    ...blacks
      .filter((key) => isHome(key.note) || isHome(key.flat))
      .map((key) => ({
        id: key.note,
        x: key.x + key.width / 2,
        y: key.y + key.height * 0.42,
        onBlack: true,
      })),
  ];

  return (
    <svg
      className="scale-hand-keys"
      viewBox={`0 0 ${svgWidth} ${VIEW_H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{`${scaleName}, both hands`}</title>
      <desc>
        A piano from {first} to {last}. Left hand (green) plays an octave below
        right hand (beige) on the same keyboard.
      </desc>

      <rect
        x="0"
        y="0"
        width={svgWidth}
        height={VIEW_H}
        className="scale-hand-bed"
      />

      {whites.map((key) => {
        const bassHit = isLeft(key.note);
        const chordHit = isRight(key.note);
        const pressed = bassHit || chordHit;
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
            {pressed ? (
              <BothFingerLabel
                x={whiteCenter(key.index)}
                y={KEY_TOP + WHITE_H * 0.58}
                left={bassHit ? leftFinger : null}
                right={chordHit ? rightFinger : null}
              />
            ) : null}
          </g>
        );
      })}

      {blacks.map((key) => {
        const bassHit = isLeft(key.note) || isLeft(key.flat);
        const chordHit = isRight(key.note) || isRight(key.flat);
        const pressed = bassHit || chordHit;
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
            {pressed ? (
              <BothFingerLabel
                x={key.x + key.width / 2}
                y={key.y + key.height * 0.55}
                left={bassHit ? leftFinger : null}
                right={chordHit ? rightFinger : null}
                onBlack
              />
            ) : null}
          </g>
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

      {leftNote ? (
        <text
          x={noteAnchorX(leftNote, whites, blacks)}
          y={KEY_TOP - 8}
          className="scale-hand-note is-bass-note"
        >
          {leftNote}
        </text>
      ) : null}
      {rightNote ? (
        <text
          x={noteAnchorX(rightNote, whites, blacks)}
          y={KEY_TOP - 8}
          className="scale-hand-note is-chord-note"
        >
          {rightNote}
        </text>
      ) : null}
    </svg>
  );
}

function BothFingerLabel({
  x,
  y,
  left,
  right,
  onBlack = false,
}: {
  x: number;
  y: number;
  left: Finger | null;
  right: Finger | null;
  onBlack?: boolean;
}) {
  const text =
    left != null && right != null
      ? `${left}·${right}`
      : left != null
        ? String(left)
        : right != null
          ? String(right)
          : "";
  if (!text) return null;
  const wide = text.length > 1;
  return (
    <g
      className={classNames(
        "song-key-label",
        left != null && "is-bass",
        right != null && left == null && "is-chord",
        onBlack && "is-on-black",
      )}
    >
      <rect
        x={x - (wide ? 14 : 12)}
        y={y - 11}
        width={wide ? 28 : 24}
        height={22}
        rx="11"
      />
      <text x={x} y={y + 4} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
