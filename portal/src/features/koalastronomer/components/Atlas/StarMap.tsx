"use client";

import { isDestinationUnlocked } from "../../engine/atlas-engine";
import type { TelescopeDestination } from "../../engine/game-state";

interface StarMapProps {
  destinations: readonly TelescopeDestination[];
  completedDestinationIds: readonly string[];
  revealedRegions: readonly string[];
  selectedDestinationId: string;
  onSelectDestination: (destinationId: string) => void;
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  "mercury-sector": { x: 155, y: 365 },
  "outer-belt": { x: 255, y: 280 },
  "distant-region": { x: 375, y: 205 },
  "the-new-body": { x: 475, y: 145 },
};

const CONSTELLATIONS: Record<
  string,
  {
    lines: Array<[number, number, number, number]>;
    stars: Array<[number, number]>;
  }
> = {
  "mercury-sector": {
    lines: [
      [115, 290, 148, 255],
      [148, 255, 192, 272],
      [192, 272, 168, 316],
    ],
    stars: [
      [115, 290],
      [148, 255],
      [192, 272],
      [168, 316],
    ],
  },
  "outer-belt": {
    lines: [
      [210, 175, 250, 145],
      [250, 145, 295, 165],
      [295, 165, 272, 210],
    ],
    stars: [
      [210, 175],
      [250, 145],
      [295, 165],
      [272, 210],
    ],
  },
  "distant-region": {
    lines: [
      [330, 105, 375, 85],
      [375, 85, 420, 115],
      [375, 85, 385, 138],
    ],
    stars: [
      [330, 105],
      [375, 85],
      [420, 115],
      [385, 138],
    ],
  },
  "the-new-body": {
    lines: [
      [430, 255, 480, 230],
      [480, 230, 515, 275],
      [515, 275, 465, 310],
      [465, 310, 430, 255],
    ],
    stars: [
      [430, 255],
      [480, 230],
      [515, 275],
      [465, 310],
    ],
  },
};

export function StarMap({
  destinations,
  completedDestinationIds,
  revealedRegions,
  selectedDestinationId,
  onSelectDestination,
}: StarMapProps) {
  return (
    <div
      className="obs-star-map-wrap"
      data-testid="star-map"
      data-revealed={revealedRegions.join(",")}
    >
      <svg
        viewBox="0 0 620 520"
        className="obs-star-map-svg"
        role="img"
        aria-label="Celestial Atlas star chart"
      >
        <defs>
          <radialGradient id="obs-chart-sky" cx="50%" cy="48%" r="52%">
            <stop offset="0%" stopColor="#1e355e" />
            <stop offset="65%" stopColor="#122241" />
            <stop offset="100%" stopColor="#0b152b" />
          </radialGradient>
          <radialGradient id="obs-nebula-glow" cx="35%" cy="35%" r="50%">
            <stop offset="0%" stopColor="#6a7fdb" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#6a7fdb" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer circular brass/slate dome ring */}
        <circle
          cx="310"
          cy="260"
          r="242"
          fill="#223454"
          stroke="#0f1b31"
          strokeWidth="6"
        />
        <circle
          cx="310"
          cy="260"
          r="226"
          fill="url(#obs-chart-sky)"
          stroke="#7b93b8"
          strokeWidth="3"
        />
        <circle cx="310" cy="260" r="210" fill="url(#obs-nebula-glow)" />

        {/* Astrolabe radial rings and spokes */}
        {[70, 125, 175, 215].map((r) => (
          <circle
            key={r}
            cx="310"
            cy="260"
            r={r}
            fill="none"
            stroke="#8ea7cc"
            strokeOpacity="0.24"
            strokeWidth="1.2"
          />
        ))}
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <line
            key={deg}
            x1="310"
            y1="34"
            x2="310"
            y2="486"
            stroke="#8ea7cc"
            strokeOpacity="0.18"
            strokeWidth="1"
            transform={`rotate(${deg} 310 260)`}
          />
        ))}

        {/* Center golden compass starburst */}
        <g transform="translate(310 285)" aria-hidden="true">
          <polygon
            points="0,-24 5,-6 24,0 5,6 0,24 -5,6 -24,0 -5,-6"
            fill="#e8b968"
            opacity="0.85"
          />
          <polygon
            points="0,-16 4,-4 16,0 4,4 0,16 -4,4 -16,0 -4,-4"
            fill="#fdf5e6"
            transform="rotate(45)"
            opacity="0.7"
          />
        </g>

        {/* Sector constellations (dim until revealed, glowing when revealed) */}
        {Object.entries(CONSTELLATIONS).map(([regionId, data]) => {
          const isRevealed = revealedRegions.includes(regionId);
          return (
            <g
              key={regionId}
              className={`obs-map-region${isRevealed ? " is-revealed" : ""}`}
              data-region={regionId}
            >
              {data.lines.map(([x1, y1, x2, y2], idx) => (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isRevealed ? "#8ce0ff" : "#8ea7cc"}
                  strokeWidth={isRevealed ? "2.6" : "1.3"}
                  strokeOpacity={isRevealed ? "0.95" : "0.35"}
                />
              ))}
              {data.stars.map(([cx, cy], idx) => (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={isRevealed ? "4.5" : "2.5"}
                  fill={isRevealed ? "#ffffff" : "#b8cbe6"}
                  opacity={isRevealed ? "1" : "0.45"}
                />
              ))}
            </g>
          );
        })}

        {/* Curved dashed trajectory path across the 4 nodes */}
        <path
          d="M 155 365 Q 205 320 255 280 T 375 205 T 475 145"
          fill="none"
          stroke="#fdf5e6"
          strokeWidth="3.5"
          strokeDasharray="8 8"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>

      {/* Interactive destination nodes positioned over the SVG path */}
      <div className="obs-map-nodes">
        {destinations.map((dest) => {
          const pos = NODE_POSITIONS[dest.id] ?? { x: 310, y: 260 };
          const isCompleted = completedDestinationIds.includes(dest.id);
          const isUnlocked = isDestinationUnlocked(
            dest,
            completedDestinationIds,
          );
          const isSelected = selectedDestinationId === dest.id;

          return (
            <button
              key={dest.id}
              type="button"
              className={`obs-map-node${isSelected ? " is-selected" : ""}${isCompleted ? " is-completed" : ""}${!isUnlocked ? " is-locked" : ""}`}
              style={{
                left: `${(pos.x / 620) * 100}%`,
                top: `${(pos.y / 520) * 100}%`,
              }}
              onClick={() => onSelectDestination(dest.id)}
              data-testid={`destination-${dest.id}`}
              data-status={
                isCompleted ? "completed" : isUnlocked ? "unlocked" : "locked"
              }
            >
              <span className="obs-node-badge" aria-hidden="true">
                {isCompleted ? "✓" : isUnlocked ? "🪐" : "🔒"}
              </span>
              <span className="obs-node-label">{dest.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
