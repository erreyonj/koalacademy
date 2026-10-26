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
      <div className="tools-buttons">
        <button type="button" className="tools-button" onClick={onFourth}>
          ← Fourth ({prettyPitch(fourthLabel)})
        </button>
        <button type="button" className="tools-button" onClick={onFifth}>
          Fifth ({prettyPitch(fifthLabel)}) →
        </button>
        <button
          type="button"
          className="tools-button"
          aria-pressed={mode === "minor"}
          onClick={onRelative}
        >
          Relative
        </button>
        <button type="button" className="tools-button" onClick={onReset}>
          Reset
        </button>
      </div>
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
