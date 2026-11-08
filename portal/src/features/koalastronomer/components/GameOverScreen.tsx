"use client";

import { useEffect, useState } from "react";

const RESET_COUNTDOWN_SECONDS = 10;

interface GameOverScreenProps {
  calibrationPoints: number;
  onRestart: () => void;
}

export function GameOverScreen({
  calibrationPoints,
  onRestart,
}: GameOverScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onRestart();
      return;
    }
    const timer = window.setTimeout(
      () => setSecondsLeft((current) => current - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [secondsLeft, onRestart]);

  return (
    <div
      className="obs-rules-modal-backdrop"
      data-testid="game-over-screen"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="obs-game-over-title"
    >
      <div className="obs-rules-modal-card obs-game-over-card">
        <span className="obs-intro-eyebrow">Hard Mode · Calibration depleted</span>
        <h3 id="obs-game-over-title" className="obs-rules-modal-title">
          Observatory Offline
        </h3>
        <p className="obs-rules-modal-note">
          Every Archive record is recovered, and your remaining{" "}
          <strong>{calibrationPoints} Calibration</strong> can&apos;t fund the
          next collar. The interference wins this round.
        </p>
        <p className="obs-game-over-countdown" data-testid="game-over-countdown">
          Restarting in {secondsLeft}s
        </p>
        <button
          type="button"
          className="obs-primary-cta"
          onClick={onRestart}
          data-testid="game-over-restart-btn"
        >
          Restart Now
        </button>
      </div>
    </div>
  );
}
