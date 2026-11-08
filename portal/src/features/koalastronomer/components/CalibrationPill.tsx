"use client";

interface CalibrationPillProps {
  points: number;
  completedChallenges: number;
  completedObservations: number;
}

export function CalibrationPill({
  points,
  completedChallenges,
  completedObservations,
}: CalibrationPillProps) {
  return (
    <div
      className="obs-calibration-pill"
      data-completed-challenges={completedChallenges}
      data-completed-observations={completedObservations}
    >
      <span className="obs-calibration-gear" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.4 2.6-.9-.5c-.1-.3-.2-.6-.4-.9l.4-.9a1 1 0 0 0-.2-1.1l-1.1-1.1a1 1 0 0 0-1.1-.2l-.9.4c-.3-.2-.6-.3-.9-.4l-.5-.9a1 1 0 0 0-.9-.5h-1.6a1 1 0 0 0-.9.5l-.5.9c-.3.1-.6.2-.9.4l-.9-.4a1 1 0 0 0-1.1.2L5.9 7.7a1 1 0 0 0-.2 1.1l.4.9c-.2.3-.3.6-.4.9l-.9.5a1 1 0 0 0-.5.9v1.6c0 .4.2.7.5.9l.9.5c.1.3.2.6.4.9l-.4.9a1 1 0 0 0 .2 1.1l1.1 1.1c.3.3.7.4 1.1.2l.9-.4c.3.2.6.3.9.4l.5.9c.2.3.5.5.9.5h1.6c.4 0 .7-.2.9-.5l.5-.9c.3-.1.6-.2.9-.4l.9.4c.4.2.8.1 1.1-.2l1.1-1.1c.3-.3.4-.7.2-1.1l-.4-.9c.2-.3.3-.6.4-.9l.9-.5c.3-.2.5-.5.5-.9V12c0-.4-.2-.7-.5-.9Z"
          />
        </svg>
      </span>
      <span className="obs-calibration-label">Calibration</span>
      <span className="obs-calibration-value" data-testid="points-display">
        {points}
      </span>
      <span className="obs-sr-only" data-testid="completed-observations">
        {completedObservations}
      </span>
    </div>
  );
}
