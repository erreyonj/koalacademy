"use client";

interface ObservationSuccessProps {
  destinationName: string;
  regionName: string;
}

export function ObservationSuccess({
  destinationName,
  regionName,
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
    </div>
  );
}
