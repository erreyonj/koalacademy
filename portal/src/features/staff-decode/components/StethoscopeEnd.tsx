"use client";

import { type NoteDuration } from "../pitches";
import { NoteValueGlyph } from "./NoteGlyph";

interface StethoscopeEndProps {
  duration: NoteDuration;
  size?: number;
  className?: string;
}

/**
 * Drawn stethoscope chestpiece — same metal-ring language as the mini dial,
 * with the live note value sitting in the diaphragm.
 */
export function StethoscopeEnd({
  duration,
  size = 52,
  className,
}: StethoscopeEndProps) {
  const glyph = Math.round(size * 0.38);
  return (
    <div className={`sd-steth-end${className ? ` ${className}` : ""}`} style={{ width: size }}>
      <svg
        viewBox="0 0 64 72"
        width={size}
        height={Math.round((size * 72) / 64)}
        aria-hidden="true"
      >
        {/* Short tube stub into the chestpiece */}
        <rect
          x="28"
          y="2"
          width="8"
          height="14"
          rx="3"
          fill="#5e6973"
          stroke="#2b333b"
          strokeWidth="2"
        />
        <rect
          x="26"
          y="12"
          width="12"
          height="8"
          rx="2"
          fill="#8d99a6"
          stroke="#2b333b"
          strokeWidth="1.5"
        />

        {/* Outer rim */}
        <circle
          cx="32"
          cy="42"
          r="26"
          fill="#8d99a6"
          stroke="#2b333b"
          strokeWidth="3"
        />
        {/* Bezel */}
        <circle
          cx="32"
          cy="42"
          r="20"
          fill="#6a7580"
          stroke="#2b333b"
          strokeWidth="2"
        />
        {/* Diaphragm */}
        <circle
          cx="32"
          cy="42"
          r="15"
          fill="#dce3ec"
          stroke="#45505b"
          strokeWidth="1.8"
        />
        <circle
          cx="32"
          cy="42"
          r="12.5"
          fill="#eef2f6"
          stroke="#95a0ab"
          strokeWidth="1"
        />
      </svg>
      <span className="sd-steth-end-glyph" style={{ color: "#121212" }}>
        <NoteValueGlyph duration={duration} size={glyph} />
      </span>
    </div>
  );
}
