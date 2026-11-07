"use client";

import { DURATION_LABELS, type NoteDuration } from "../pitches";

interface NoteValueGlyphProps {
  duration: NoteDuration;
  size?: number;
  className?: string;
}

/**
 * Standalone SVG note value symbol (whole, half, quarter, eighth, sixteenth)
 * rendered inside the dial center and along the left stethoscope track.
 */
export function NoteValueGlyph({
  duration,
  size = 44,
  className,
}: NoteValueGlyphProps) {
  const isFilled = duration === "q" || duration === "8" || duration === "16";
  const hasStem = duration !== "w";
  const hasOneFlag = duration === "8" || duration === "16";
  const hasSecondFlag = duration === "16";

  return (
    <svg
      viewBox="0 0 48 64"
      width={size}
      height={Math.round((size * 64) / 48)}
      className={className}
      aria-label={DURATION_LABELS[duration]}
      role="img"
    >
      <ellipse
        cx={duration === "w" ? 24 : 20}
        cy={46}
        rx={8.5}
        ry={6}
        transform={`rotate(-20 ${duration === "w" ? 24 : 20} 46)`}
        fill={isFilled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2.6}
      />
      {duration === "w" && (
        <ellipse
          cx={24}
          cy={46}
          rx={4.6}
          ry={4.8}
          transform="rotate(15 24 46)"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
        />
      )}
      {hasStem && (
        <line
          x1={27.2}
          y1={44}
          x2={27.2}
          y2={11}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      )}
      {hasOneFlag && (
        <path
          d="M27.2 11 C 34 15, 38 20, 36 29 C 35 23, 31 19, 27.2 17 Z"
          fill="currentColor"
        />
      )}
      {hasSecondFlag && (
        <path
          d="M27.2 20 C 34 24, 38 29, 36 38 C 35 32, 31 28, 27.2 26 Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}
