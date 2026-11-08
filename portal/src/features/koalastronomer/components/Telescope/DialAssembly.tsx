"use client";

import type { DialConfiguration } from "../../engine/game-state";
import {
  dialDistanceFromTarget,
  isTargetMatched,
} from "../../engine/telescope-engine";

interface DialAssemblyProps {
  current: DialConfiguration;
  target: DialConfiguration;
  destinationName: string;
}

export function DialAssembly({
  current,
  target,
  destinationName,
}: DialAssemblyProps) {
  const distance = dialDistanceFromTarget(current, target);
  const matched = isTargetMatched(current, target);
  const blurPx = matched ? 0 : Math.min(7, distance * 0.9);
  const offsetX = (current.alignment - target.alignment) * 7;
  const offsetY = (current.range - target.range) * 6;

  return (
    <div
      className={`obs-lens-housing${matched ? " is-matched" : ""}`}
      data-testid="dial-assembly"
      data-distance={distance}
    >
      <div className="obs-lens-viewport">
        <svg
          viewBox="0 0 360 360"
          className="obs-lens-svg"
          style={{
            filter: `blur(${blurPx.toFixed(1)}px)`,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(1.06)`,
          }}
          role="img"
          aria-label={`Telescope view of ${destinationName}`}
        >
          <defs>
            <radialGradient id="obs-lens-nebula" cx="55%" cy="55%" r="50%">
              <stop offset="0%" stopColor="#8b6fe8" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#3c6fd1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d1933" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="360" height="360" fill="#0d1830" />
          <ellipse
            cx="215"
            cy="210"
            rx="135"
            ry="75"
            fill="url(#obs-lens-nebula)"
            transform="rotate(-28 215 210)"
          />

          {/* Constellation lines */}
          <g
            stroke={matched ? "#ffd86b" : "#9bd4ff"}
            strokeWidth={matched ? "2.6" : "1.8"}
            strokeOpacity={matched ? "1" : "0.65"}
          >
            <line x1="95" y1="210" x2="145" y2="160" />
            <line x1="145" y1="160" x2="185" y2="188" />
            <line x1="185" y1="188" x2="235" y2="132" />
            <line x1="235" y1="132" x2="270" y2="168" />
            <line x1="145" y1="160" x2="152" y2="105" />
          </g>

          {/* Star field */}
          {[
            [95, 210, 5.5],
            [145, 160, 6.5],
            [185, 188, 5],
            [235, 132, 6],
            [270, 168, 4.5],
            [152, 105, 5],
            [78, 120, 2.2],
            [290, 110, 2.5],
            [245, 250, 3],
            [120, 268, 2.5],
          ].map(([cx, cy, r], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="#ffffff"
              opacity={matched ? "1" : "0.85"}
            />
          ))}
        </svg>

        {/* Crosshair reticle overlay */}
        <div className="obs-lens-reticle" aria-hidden="true" />
      </div>
    </div>
  );
}
