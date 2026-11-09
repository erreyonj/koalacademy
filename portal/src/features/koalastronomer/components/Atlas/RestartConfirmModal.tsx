"use client";

interface RestartConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestartConfirmModal({
  onConfirm,
  onCancel,
}: RestartConfirmModalProps) {
  return (
    <div
      className="obs-rules-modal-backdrop"
      data-testid="restart-confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="obs-restart-title"
      aria-describedby="obs-restart-note"
    >
      <div className="obs-rules-modal-card">
        <h3 id="obs-restart-title" className="obs-rules-modal-title">
          Start a new chart?
        </h3>
        <p id="obs-restart-note" className="obs-rules-modal-note">
          This clears Calibration, recovered records, and charted sectors.
          Difficulty stays the same.
        </p>
        <div className="obs-parchment-actions">
          <button
            type="button"
            className="obs-secondary-btn"
            onClick={onCancel}
            data-testid="restart-cancel-btn"
          >
            Keep exploring
          </button>
          <button
            type="button"
            className="obs-primary-cta"
            onClick={onConfirm}
            data-testid="restart-confirm-btn"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
