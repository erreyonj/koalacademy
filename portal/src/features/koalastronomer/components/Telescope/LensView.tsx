"use client";

import { useMemo } from "react";

interface LensViewProps {
  sectorId: string;
  sectorName: string;
  solvedCount: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  glow: boolean;
}

const STAR_COUNT = 46;
const LENS_RADIUS = 92;

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function buildStarField(sectorId: string): Star[] {
  const rand = seededRandom(sectorId);
  const stars: Star[] = [];
  while (stars.length < STAR_COUNT) {
    const x = (rand() * 2 - 1) * LENS_RADIUS;
    const y = (rand() * 2 - 1) * LENS_RADIUS;
    if (x * x + y * y > (LENS_RADIUS - 6) ** 2) continue;
    const bright = rand() > 0.86;
    stars.push({
      x: 100 + x,
      y: 100 + y,
      r: bright ? 1.9 + rand() * 1.2 : 0.6 + rand() * 0.9,
      glow: bright,
    });
  }
  return stars;
}

/**
 * Front view through the objective lens. The sector's star field starts
 * blurred and dim, sharpening with each aligned collar until it is fully in view.
 */
export function LensView({ sectorId, sectorName, solvedCount }: LensViewProps) {
  const stars = useMemo(() => buildStarField(sectorId), [sectorId]);
  const clamped = Math.max(0, Math.min(3, solvedCount));
  const blur = (3 - clamped) * 2.5;
  const starOpacity = 0.25 + clamped * 0.25;
  const inView = clamped === 3;
  const filterId = `obs-lens-blur-${sectorId}`;
  const clipId = `obs-lens-clip-${sectorId}`;

  return (
    <figure
      className={`obs-lens-view${inView ? " is-in-view" : ""}`}
      data-testid="lens-view"
      data-solved={clamped}
    >
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`${sectorName} through the telescope lens, ${clamped} of 3 collars aligned`}
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
          <clipPath id={clipId}>
            <circle cx="100" cy="100" r={LENS_RADIUS} />
          </clipPath>
          <radialGradient id={`${clipId}-sky`} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#1b2a48" />
            <stop offset="100%" stopColor="#060a14" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="99" fill="#11141a" />
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="none"
          stroke="#b86b35"
          strokeWidth="5"
        />

        <g clipPath={`url(#${clipId})`}>
          <rect width="200" height="200" fill={`url(#${clipId}-sky)`} />
          <g filter={blur > 0 ? `url(#${filterId})` : undefined}>
            {stars.map((star, i) => (
              <circle
                key={i}
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill={star.glow ? "#f1d79a" : "#dfe9f5"}
                opacity={starOpacity}
              />
            ))}
          </g>
          <g
            className="obs-lens-reticle"
            stroke={inView ? "#7fb08a" : "#bdd7ee"}
            strokeOpacity="0.55"
            strokeWidth="0.9"
            fill="none"
          >
            <line x1="100" y1="14" x2="100" y2="186" />
            <line x1="14" y1="100" x2="186" y2="100" />
            <circle cx="100" cy="100" r="28" />
            <circle cx="100" cy="100" r="58" strokeDasharray="3 4" />
          </g>
        </g>

        <circle
          cx="100"
          cy="100"
          r={LENS_RADIUS}
          fill="none"
          stroke="#0a0c10"
          strokeWidth="3"
        />
      </svg>
      <figcaption className="obs-lens-caption">
        {inView ? `${sectorName} · In view` : `Signal ${clamped} / 3`}
      </figcaption>
    </figure>
  );
}
