"use client";

import { CIRCLE, prettyPitch } from "@/lib/circle-of-fifths";
import type { KeyMode } from "@/lib/circle-of-fifths";

interface CofControlsProps {
  tonicIndex: number;
  mode: KeyMode;
  fourthLabel: string;
  fifthLabel: string;
  onFourth: () => void;
  onFifth: () => void;
  onRelative: () => void;
  onReset: () => void;
  onJump: (tonicIndex: number) => void;
}

export function CofControls({
  tonicIndex,
  mode,
  fourthLabel,
  fifthLabel,
  onFourth,
  onFifth,
  onRelative,
  onReset,
  onJump,
}: CofControlsProps) {
  return (
    <div className="cof-controls" role="toolbar" aria-label="Circle of fifths controls">
      <button type="button" className="notation-btn" onClick={onFourth}>
        ← Fourth ({prettyPitch(fourthLabel)})
      </button>
      <button type="button" className="notation-btn" onClick={onFifth}>
        Fifth ({prettyPitch(fifthLabel)}) →
      </button>
      <button
        type="button"
        className="notation-btn"
        aria-pressed={mode === "minor"}
        onClick={onRelative}
      >
        Relative
      </button>
      <button type="button" className="notation-btn" onClick={onReset}>
        Reset
      </button>
      <label className="notation-label cof-jump">
        Key jump
        <select
          value={String(tonicIndex)}
          aria-label="Jump to tonic"
          onChange={(event) => onJump(Number(event.target.value))}
        >
          {CIRCLE.map((tonic, index) => (
            <option key={tonic} value={index}>
              {prettyPitch(tonic)} {mode}
            </option>
          ))}
        </select>
      </label>
      {/* Slot for later actions: parallel keys, rim-click, drag-spin. */}
      <span className="cof-controls-slot" aria-hidden="true" />
    </div>
  );
}
