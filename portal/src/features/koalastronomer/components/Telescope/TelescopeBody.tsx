"use client";

import type { DialName } from "../../engine/game-state";
import { RING_METADATA } from "../../engine/telescope-engine";

interface TelescopeBodyProps {
  costs: Record<DialName, number>;
  solved: Record<DialName, boolean>;
  activeRing: DialName | null;
  calibrationPoints: number;
  unlimitedCalibration?: boolean;
  onSelectRing: (ring: DialName) => void;
  onNavigateArchive: () => void;
}

const TUBE_VIEWBOX_WIDTH = 880;
const COLLAR_CENTER_OFFSET = 62;

const RINGS: readonly {
  ring: DialName;
  collarX: number;
  baseDeg: number;
}[] = [
  { ring: "range", collarX: 162, baseDeg: 15 },
  { ring: "focus", collarX: 404, baseDeg: 45 },
  { ring: "alignment", collarX: 646, baseDeg: 75 },
];

/**
 * Renders one flush rotating collar dial inside the unified cylindrical
 * telescope barrel. Unlike static stripes, each collar features precision
 * degree ticks, diagonal knurled grip bands, an index Vernier window, and
 * a smooth vertical-scroll rotation offset when active or aligned.
 */
function RotatingCollarDialSvg({
  collarX,
  isSolved,
  isActive,
}: {
  collarX: number;
  isSolved: boolean;
  isActive: boolean;
}) {
  const collarFill = isSolved
    ? "#365f4f"
    : isActive
      ? "#d58644"
      : "#b86b35";
  const trackFill = isSolved
    ? "#223e34"
    : isActive
      ? "#2b211a"
      : "#1a1d24";
  const accentColor = isSolved
    ? "#7fb08a"
    : isActive
      ? "#e3b23c"
      : "#bdd7ee";

  // Simulated vertical rotation shift on the curved collar ribs
  const phaseShift = isSolved ? -10 : isActive ? 7 : 0;
  const ribIndices = [
    -96, -82, -68, -54, -40, -26, -12, 2, 16, 30, 44, 58, 72, 86, 100,
  ];

  return (
    <g
      transform={`translate(${collarX}, 0)`}
      className={`obs-collar-svg-group${isSolved ? " is-solved" : ""}${isActive ? " is-active" : ""}`}
    >
      {/* Left and right machined retaining grooves */}
      <path
        d="M 24 14 C -8 68, -8 192, 24 246 L 40 246 C 8 192, 8 68, 40 14 Z"
        fill="#11141a"
      />
      <path
        d="M 104 14 C 72 68, 72 192, 104 246 L 120 246 C 88 192, 88 68, 120 14 Z"
        fill="#11141a"
      />

      {/* Collar body */}
      <path
        d="M 38 14 C 6 68, 6 192, 38 246 L 106 246 C 74 192, 74 68, 106 14 Z"
        fill={collarFill}
        stroke="#0a0c10"
        strokeWidth="3.5"
      />

      {/* Recessed precision grip channel */}
      <path
        d="M 52 18 C 22 70, 22 190, 52 242 L 92 242 C 62 190, 62 70, 92 18 Z"
        fill={trackFill}
        stroke="#0a0c10"
        strokeWidth="2.5"
      />

      {/* Rotating knurled grip ribs + degree ticks */}
      {ribIndices.map((offset) => {
        const y = 130 + offset + phaseShift;
        if (y < 24 || y > 236) return null;
        const norm = (y - 130) / 112;
        const curveX = Math.round((1 - norm * norm) * -22);
        const x1 = 53 + curveX;
        const x2 = 90 + curveX;
        const isMajor = Math.abs(offset) % 28 === 12;

        return (
          <g key={offset}>
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y - 3}
              stroke={isMajor ? accentColor : "#c87a42"}
              strokeWidth={isMajor ? "3" : "2"}
              strokeOpacity={isMajor ? "0.95" : "0.68"}
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Top status LED on the collar rim */}
      <circle
        cx="58"
        cy="34"
        r="5.5"
        fill={isSolved ? "#7fb08a" : isActive ? "#e3b23c" : "#3a3f49"}
        stroke="#0a0c10"
        strokeWidth="2.5"
      />
    </g>
  );
}

export function TelescopeBody({
  costs,
  solved,
  activeRing,
  calibrationPoints,
  unlimitedCalibration = false,
  onSelectRing,
  onNavigateArchive,
}: TelescopeBodyProps) {
  const solvedCount = (["range", "focus", "alignment"] as const).filter(
    (r) => solved[r],
  ).length;
  const allSolved = solvedCount === 3;

  return (
    <div className="obs-telescope-body-stage" data-testid="telescope-body">
      <div className="obs-telescope-body-status">
        <span className="obs-body-eyebrow">
          Optical tube · Tap a collar to trace its optic
        </span>
        <span className="obs-body-progress-pill" data-testid="rings-solved-pill">
          {solvedCount} / 3 Rings Aligned
        </span>
      </div>

      <div className="obs-copper-tube-wrap">
        {/* Modern unified cylindrical telescope barrel with 3 flush rotating collar dials */}
        <svg
          className="obs-copper-tube-svg"
          viewBox="0 0 880 260"
          role="img"
          aria-label="Modern copper and graphite telescope tube with Range, Focus, and Alignment rotating collar dials"
        >
          <defs>
            <linearGradient id="obs-tube-copper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d98a50" />
              <stop offset="22%" stopColor="#c7773f" />
              <stop offset="68%" stopColor="#a85c29" />
              <stop offset="100%" stopColor="#7b4019" />
            </linearGradient>
            <linearGradient id="obs-lens-glass" x1="0" y1="0" x2="1" y2="1">
              <stop
                offset="0%"
                stopColor={allSolved ? "#7fb08a" : "#4ba3e3"}
                stopOpacity="0.55"
              />
              <stop offset="55%" stopColor="#14233c" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#090e18" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Rear eyepiece flange on far left */}
          <path
            d="M 38 42 C 12 76, 12 184, 38 218"
            fill="none"
            stroke="#0a0c10"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Continuous single-piece cylindrical telescope body */}
          <path
            d="M 62 14 L 808 14 C 862 46, 862 214, 808 246 L 62 246 C 12 204, 12 56, 62 14 Z"
            fill="url(#obs-tube-copper)"
            stroke="#0a0c10"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />

          {/* Specular anodized highlight & lower shadow bands */}
          <rect
            x="64"
            y="24"
            width="730"
            height="18"
            rx="9"
            fill="rgba(255, 238, 214, 0.22)"
          />
          <rect
            x="64"
            y="218"
            width="730"
            height="18"
            rx="9"
            fill="rgba(10, 12, 16, 0.28)"
          />

          {/* Horizontal optical axis datum rail */}
          <line
            x1="88"
            y1="130"
            x2="768"
            y2="130"
            stroke="rgba(10, 12, 16, 0.35)"
            strokeWidth="2"
            strokeDasharray="6 6"
          />

          {/* Left bezel collar & digital telemetry housing */}
          <path
            d="M 72 14 C 36 68, 36 192, 72 246 L 54 246 C 18 192, 18 68, 54 14 Z"
            fill="#11141a"
          />
          <circle
            cx="88"
            cy="38"
            r="6.5"
            fill={allSolved ? "#7fb08a" : "#e3b23c"}
            stroke="#0a0c10"
            strokeWidth="3"
          />
          <rect
            x="72"
            y="54"
            width="42"
            height="24"
            rx="3.5"
            fill="#1b2230"
            stroke="#0a0c10"
            strokeWidth="3"
          />
          <text
            x="93"
            y="70"
            textAnchor="middle"
            fill="#bdd7ee"
            fontSize="10"
            fontWeight="700"
            fontFamily="var(--font-mono)"
          >
            {solvedCount}/3
          </text>
          <rect
            x="66"
            y="92"
            width="34"
            height="74"
            rx="5"
            fill="rgba(18, 24, 36, 0.38)"
            stroke="#0a0c10"
            strokeWidth="3"
          />

          {/* Three flush rotating collar dials along the single cylinder */}
          {RINGS.map(({ ring, collarX }) => (
            <RotatingCollarDialSvg
              key={ring}
              collarX={collarX}
              isSolved={solved[ring]}
              isActive={activeRing === ring}
            />
          ))}

          {/* Right recessed multi-element objective aperture */}
          <ellipse
            cx="812"
            cy="130"
            rx="38"
            ry="112"
            fill="#b86b35"
            stroke="#0a0c10"
            strokeWidth="4"
          />
          <ellipse
            cx="816"
            cy="130"
            rx="28"
            ry="92"
            fill="#1b2230"
            stroke="#0a0c10"
            strokeWidth="3.5"
          />
          <ellipse
            cx="820"
            cy="130"
            rx="19"
            ry="72"
            fill="url(#obs-lens-glass)"
            stroke="#0a0c10"
            strokeWidth="3"
          />
          <ellipse
            cx="817"
            cy="130"
            rx="10"
            ry="50"
            fill="none"
            stroke={allSolved ? "#7fb08a" : "#bdd7ee"}
            strokeWidth="2.2"
            strokeOpacity="0.75"
          />
        </svg>

        {/* Collar label buttons sit over each collar and open its trace */}
        {RINGS.map(({ ring, collarX }) => {
          const meta = RING_METADATA[ring];
          const cost = costs[ring];
          const isSolved = solved[ring];
          const isActive = activeRing === ring;
          const canAfford =
            isSolved || unlimitedCalibration || calibrationPoints >= cost;

          return (
            <div
              key={ring}
              className={`obs-collar-label-slot${isSolved ? " is-solved" : ""}${isActive ? " is-active" : ""}${!canAfford ? " is-short" : ""}`}
              style={{ left: `${((collarX + COLLAR_CENTER_OFFSET) / TUBE_VIEWBOX_WIDTH) * 100}%` }}
            >
              <button
                type="button"
                className="obs-collar-label"
                data-testid={`cog-ring-${ring}`}
                aria-pressed={isActive}
                aria-label={`${meta.label} collar: ${meta.componentTitle}`}
                onClick={() => onSelectRing(ring)}
              >
                <span className="obs-cog-ring-code">{meta.code}</span>
                <span className="obs-cog-ring-name">{meta.label}</span>
                <span
                  className={`obs-cog-badge${isSolved ? " is-solved" : !canAfford ? " is-short" : ""}`}
                  data-testid={`cog-status-${ring}`}
                >
                  {isSolved
                    ? "Aligned ✓"
                    : canAfford
                      ? `${cost} Cal`
                      : `Needs ${cost} Calibration`}
                </span>
              </button>

              {!isSolved && !canAfford && (
                <button
                  type="button"
                  className="obs-cog-archive-link"
                  data-testid={`cog-archive-link-${ring}`}
                  onClick={onNavigateArchive}
                >
                  Visit Archive
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
