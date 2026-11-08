"use client";

interface ObservationSuccessProps {
  destinationName: string;
  regionName: string;
  onContinue: () => void;
}

export function ObservationSuccess({
  destinationName,
  regionName,
  onContinue,
}: ObservationSuccessProps) {
  return (
    <div
      className="obs-success-banner"
      data-testid="observation-success"
      role="status"
    >
      <div className="obs-success-star" aria-hidden="true">
        ✦
      </div>
      <div className="obs-success-title">Observation Complete!</div>
      <div className="obs-success-subtitle">
        {destinationName} locked in — revealing {regionName} on the Atlas.
      </div>
      <button
        type="button"
        className="obs-primary-cta obs-success-continue"
        onClick={onContinue}
        data-testid="observation-continue-btn"
      >
        View Star Chart →
      </button>
    </div>
  );
}
