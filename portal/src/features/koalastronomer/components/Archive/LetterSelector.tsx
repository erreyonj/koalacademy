"use client";

import type React from "react";
import { useRef } from "react";
import type { ControlMode } from "../../engine/game-state";
import {
  NOTE_SEQUENCE,
  type NoteLetter,
  stepNoteLetter,
} from "../../engine/intervals";

const BEARING_SWIPE_PX = 28;

interface LetterSelectorProps {
  position: "first" | "second";
  value: NoteLetter;
  controlMode: ControlMode;
  onChange: (letter: NoteLetter) => void;
  disabled?: boolean;
  error?: boolean;
}

export function LetterSelector({
  position,
  value,
  controlMode,
  onChange,
  disabled,
  error,
}: LetterSelectorProps) {
  const gestureRef = useRef<{
    active: boolean;
    pointerId: number;
    startY: number;
  }>({
    active: false,
    pointerId: -1,
    startY: 0,
  });

  const noteIndex = NOTE_SEQUENCE.indexOf(value);
  const rotationDeg = (noteIndex / NOTE_SEQUENCE.length) * 360;

  const stepBy = (delta: number) => {
    if (disabled) return;
    onChange(stepNoteLetter(value, delta));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || controlMode !== "touch") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId || disabled) return;
    if (controlMode !== "touch") return;

    const dy = e.clientY - g.startY;
    if (Math.abs(dy) >= BEARING_SWIPE_PX) {
      // Swiping up advances A -> B -> C; swiping down steps backward
      const dir = dy < 0 ? 1 : -1;
      stepBy(dir);
      g.startY = e.clientY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current.pointerId === e.pointerId) {
      gestureRef.current.active = false;
    }
  };

  return (
    <div
      className={`obs-bearing-selector${error ? " is-error" : ""}${controlMode === "touch" ? " is-touch" : " is-buttons"}`}
      data-testid={`${position}-letter-selector`}
      data-value={value}
    >
      <div
        className="obs-bearing-wheel"
        data-testid={`${position}-bearing-wheel`}
        data-value={value}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label={`${position === "first" ? "First" : "Second"} missing letter bearing`}
        aria-valuemin={0}
        aria-valuemax={6}
        aria-valuenow={noteIndex}
        aria-valuetext={value}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            stepBy(1);
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            stepBy(-1);
          }
        }}
      >
        <div className="obs-bearing-pointer" aria-hidden="true">
          ▼
        </div>

        <svg
          viewBox="0 0 112 112"
          className="obs-bearing-svg"
          style={{ transform: `rotate(${(-rotationDeg).toFixed(1)}deg)` }}
          aria-hidden="true"
        >
          {/* Outer brass bearing housing & rivets */}
          <circle
            cx="56"
            cy="56"
            r="50"
            fill="#c7903b"
            stroke="#1f2436"
            strokeWidth="3.5"
          />
          <circle
            cx="56"
            cy="56"
            r="40"
            fill="#5d4635"
            stroke="#1f2436"
            strokeWidth="3"
          />
          {NOTE_SEQUENCE.map((letter, idx) => {
            const angleDeg = idx * (360 / 7);
            return (
              <g
                key={letter}
                transform={`rotate(${angleDeg.toFixed(1)} 56 56)`}
              >
                <circle
                  cx="56"
                  cy="11"
                  r="4.2"
                  fill="#fdf5e6"
                  stroke="#1f2436"
                  strokeWidth="1.8"
                />
              </g>
            );
          })}
        </svg>

        <div
          className={`obs-bearing-hub${error ? " is-error" : ""}`}
          data-testid={`${position}-bearing-value`}
        >
          {value}
        </div>
      </div>

      {/* Telescope body pedestal mount under the circular bearing */}
      <div className="obs-bearing-pedestal" aria-hidden="true">
        <span className="obs-pedestal-collar" />
        <span className="obs-pedestal-label">
          {position === "first" ? "Bearing I" : "Bearing II"}
        </span>
      </div>

      {controlMode === "touch" ? (
        <span className="obs-bearing-swipe-hint">Swipe ↕ to tune</span>
      ) : (
        <div className="obs-bearing-controls">
          <div className="obs-bearing-step-row">
            <button
              type="button"
              className="obs-bearing-step-btn"
              onClick={() => stepBy(-1)}
              disabled={disabled}
              data-testid={`${position}-bearing-prev`}
              aria-label={`Previous ${position} letter`}
            >
              −
            </button>
            <button
              type="button"
              className="obs-bearing-step-btn"
              onClick={() => stepBy(1)}
              disabled={disabled}
              data-testid={`${position}-bearing-next`}
              aria-label={`Next ${position} letter`}
            >
              +
            </button>
          </div>
          <div
            className="obs-bearing-stops"
            role="group"
            aria-label={`${position} letter stops`}
          >
            {NOTE_SEQUENCE.map((letter) => {
              const isSelected = value === letter;
              const hasError = Boolean(error && isSelected);
              return (
                <button
                  key={letter}
                  type="button"
                  className={`obs-bearing-stop-btn${isSelected ? " is-selected" : ""}${hasError ? " is-error" : ""}`}
                  onClick={() => onChange(letter)}
                  disabled={disabled}
                  data-testid={`${position}-letter-${letter}`}
                  aria-pressed={isSelected}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
