"use client";

import { ascendingIntervalPitches, type NoteLetter } from "../../engine/intervals";

interface IntervalRewardProps {
  firstNote: NoteLetter;
  secondNote: NoteLetter;
  intervalValue: number;
}

export function IntervalReward({
  firstNote,
  secondNote,
  intervalValue,
}: IntervalRewardProps) {
  const [firstPitch, secondPitch] = ascendingIntervalPitches(
    firstNote,
    secondNote,
  );

  return (
    <div className="obs-interval-reward" data-testid="interval-reward">
      <div className="obs-reward-notes" data-testid="interval-reward-pitches">
        <span>{firstPitch}</span>
        <span aria-hidden="true">→</span>
        <span>{secondPitch}</span>
      </div>
      <div className="obs-reward-points">
        +{intervalValue} Calibration Earned (Ascending Interval {intervalValue})
      </div>
    </div>
  );
}
