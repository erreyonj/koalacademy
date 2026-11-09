"use client";

interface ObservationSuccessProps {
  revealName: string;
  onContinue: () => void;
}

export function ObservationSuccess({
  revealName,
  onContinue,
}: ObservationSuccessProps) {
  return (
    <div
      className="obs-success-banner"
      data-testid="observation-success"
      role="status"
    >
      <div className="obs-success-title">{revealName} is now in view!</div>
      <button
        type="button"
        className="obs-primary-cta"
        onClick={onContinue}
        data-testid="observation-continue-btn"
      >
        Return to Atlas
      </button>
    </div>
  );
}
