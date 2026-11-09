"use client";

import type { IntervalStep } from "../../engine/archive-engine";
import {
  ascendingSequencePitches,
  type NoteLetter,
} from "../../engine/intervals";

const INTERVAL_NAMES = ["", "unison", "2nd", "3rd", "4th", "5th", "6th", "7th"];

interface IntervalRewardProps {
  notes: readonly NoteLetter[];
  steps: readonly IntervalStep[];
  total: number;
}

export function IntervalReward({ notes, steps, total }: IntervalRewardProps) {
  const pitches = ascendingSequencePitches(notes);

  return (
    <div className="obs-interval-reward" data-testid="interval-reward">
      <div className="obs-reward-notes" data-testid="interval-reward-pitches">
        {pitches.map((pitch, i) => (
          <span key={`${pitch}-${i}`} className="obs-reward-pitch">
            {i > 0 && <span aria-hidden="true">→</span>}
            <span>{pitch}</span>
          </span>
        ))}
      </div>
      <div className="obs-reward-steps" data-testid="interval-reward-steps">
        {steps.map((step, i) => (
          <span key={i} className="obs-reward-step">
            {step.from}→{step.to} {INTERVAL_NAMES[step.interval]}
          </span>
        ))}
      </div>
      <div className="obs-reward-points" data-testid="interval-reward-total">
        +{total} Calibration Earned
      </div>
    </div>
  );
}
