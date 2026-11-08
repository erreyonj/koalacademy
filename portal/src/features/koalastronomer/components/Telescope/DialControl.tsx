"use client";

import type React from "react";
import { useRef } from "react";
import type { ControlMode } from "../../engine/game-state";
import type {
  DialDirection,
  DialName,
} from "../../engine/telescope-engine";

const DIAL_SWIPE_PX = 32;

interface DialControlProps {
  name: DialName;
  label: string;
  currentValue: number;
  targetValue: number;
  controlMode: ControlMode;
  onMove: (direction: DialDirection) => void;
  disabled: boolean;
}

export function DialControl({
  name,
  label,
  currentValue,
  targetValue,
  controlMode,
  onMove,
  disabled,
}: DialControlProps) {
  const gestureRef = useRef<{
    active: boolean;
    pointerId: number;
    startY: number;
    startX: number;
  }>({
    active: false,
    pointerId: -1,
    startY: 0,
    startX: 0,
  });

  const isMatched = currentValue === targetValue;
  const rotationDeg = (currentValue / 7) * 360;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || controlMode !== "touch") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      startX: e.clientX,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId || disabled) return;
    if (controlMode !== "touch") return;

    const dy = e.clientY - g.startY;
    const dx = e.clientX - g.startX;
    const dominant = Math.abs(dy) >= Math.abs(dx) ? -dy : dx;

    if (Math.abs(dominant) >= DIAL_SWIPE_PX) {
      // Swipe up or right turns clockwise; swipe down or left turns counterclockwise
      onMove(dominant > 0 ? "clockwise" : "counterclockwise");
      g.startY = e.clientY;
      g.startX = e.clientX;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current.pointerId === e.pointerId) {
      gestureRef.current.active = false;
    }
  };

  return (
    <div
      className={`obs-gear-dial obs-gear-${name}${isMatched ? " is-matched" : ""}${controlMode === "touch" ? " is-touch" : " is-buttons"}`}
      data-testid={`dial-control-${name}`}
      data-value={currentValue}
      data-target={targetValue}
    >
      <div className="obs-gear-pointer" aria-hidden="true">
        ▼
      </div>

      <div className="obs-gear-wheel-row">
        {controlMode === "buttons" && (
          <button
            type="button"
            className="obs-dial-btn obs-dial-btn-ccw"
            onClick={() => onMove("counterclockwise")}
            disabled={disabled}
            data-testid={`${name}-ccw`}
            aria-label={`Turn ${label} counterclockwise`}
          >
            ↺
          </button>
        )}

        <div
          className="obs-gear-wheel-wrap"
          data-testid={`${name}-wheel`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-label={`${label} gear dial`}
          aria-valuemin={0}
          aria-valuemax={6}
          aria-valuenow={currentValue}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "ArrowUp" || e.key === "ArrowRight") {
              e.preventDefault();
              onMove("clockwise");
            } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
              e.preventDefault();
              onMove("counterclockwise");
            }
          }}
        >
          <svg
            viewBox="0 0 120 120"
            className="obs-gear-svg"
            style={{ transform: `rotate(${rotationDeg.toFixed(1)}deg)` }}
            aria-hidden="true"
          >
            {/* 14 gear teeth around the perimeter */}
            {Array.from({ length: 14 }).map((_, i) => (
              <rect
                key={i}
                x="53"
                y="3"
                width="14"
                height="14"
                rx="3"
                className="obs-gear-tooth"
                transform={`rotate(${i * (360 / 14)} 60 60)`}
              />
            ))}
            <circle cx="60" cy="60" r="46" className="obs-gear-outer" />
            <circle cx="60" cy="60" r="34" className="obs-gear-inner" />
            {Array.from({ length: 7 }).map((_, i) => (
              <line
                key={i}
                x1="60"
                y1="17"
                x2="60"
                y2="24"
                stroke="#231c18"
                strokeWidth="2.2"
                strokeLinecap="round"
                transform={`rotate(${i * (360 / 7)} 60 60)`}
              />
            ))}
          </svg>
          <div className="obs-gear-center-value" data-testid={`${name}-value`}>
            {currentValue}
          </div>
        </div>

        {controlMode === "buttons" && (
          <button
            type="button"
            className="obs-dial-btn obs-dial-btn-cw"
            onClick={() => onMove("clockwise")}
            disabled={disabled}
            data-testid={`${name}-cw`}
            aria-label={`Turn ${label} clockwise`}
          >
            ↻
          </button>
        )}
      </div>

      <div className="obs-gear-plaque">
        <span className="obs-gear-label">{label}</span>
        <span className="obs-gear-target-hint">
          {controlMode === "touch"
            ? `Target ${targetValue} · Swipe ↕`
            : `Target ${targetValue}`}
        </span>
      </div>
    </div>
  );
}
