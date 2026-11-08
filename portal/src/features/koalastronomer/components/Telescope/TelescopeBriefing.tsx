"use client";

import type {
  Difficulty,
  TelescopeDestination,
} from "../../engine/game-state";
import { RESET_REFUND_RATE } from "../../engine/telescope-engine";
import { RulesCarousel } from "../IntroScreen";

export const TELESCOPE_BRIEFING_RULES: readonly string[] = [
  "1. Adjust the Range, Focus, and Alignment dials until all three numbers match the sector's Target Configuration.",
  "2. Every notch you turn a dial costs 1 Calibration point from your observatory reserve.",
  "3. The brass gears are mechanically linked — turning one dial will also shift its neighbors around the 0–6 ring.",
  "4. If you want a fresh attempt, Reset Dials returns the gears to their starting numbers and refunds Calibration based on difficulty.",
];

export function formatRefundLabel(difficulty: Difficulty): string {
  const pct = Math.round((RESET_REFUND_RATE[difficulty] ?? 0) * 100);
  return pct > 0 ? `${pct}% refund` : "no refund";
}

interface TelescopeBriefingProps {
  destination: TelescopeDestination;
  calibrationPoints: number;
  difficulty: Difficulty;
  onBeginCalibration: () => void;
  onBackToAtlas: () => void;
  onVisitArchive: () => void;
}

export function TelescopeBriefing({
  destination,
  calibrationPoints,
  difficulty,
  onBeginCalibration,
  onBackToAtlas,
  onVisitArchive,
}: TelescopeBriefingProps) {
  const { range, focus, alignment } = destination.targetConfiguration;
  const refundLabel = formatRefundLabel(difficulty);

  return (
    <section
      className="obs-briefing-card"
      aria-label="Telescope calibration briefing"
      data-testid="telescope-briefing-screen"
    >
      <div className="obs-briefing-header">
        <span className="obs-intro-eyebrow">
          Telescope Calibration · Sector Briefing
        </span>
        <h2 className="obs-intro-title">{destination.name}</h2>
        <p className="obs-briefing-desc">{destination.description}</p>
      </div>

      <RulesCarousel lines={TELESCOPE_BRIEFING_RULES} />

      <div className="obs-briefing-metrics">
        <div className="obs-briefing-metric">
          <span className="obs-metric-label">Target Configuration</span>
          <span className="obs-metric-value">
            R {range} · F {focus} · A {alignment}
          </span>
        </div>
        <div className="obs-briefing-metric">
          <span className="obs-metric-label">Est. Moves</span>
          <span className="obs-metric-value">
            ⚙ {destination.movementBudget}
          </span>
        </div>
        <div className="obs-briefing-metric">
          <span className="obs-metric-label">Available Calibration</span>
          <span className="obs-metric-value">{calibrationPoints}</span>
        </div>
        <div className="obs-briefing-metric">
          <span className="obs-metric-label">Dial Reset Policy</span>
          <span className="obs-metric-value">
            {difficulty.toUpperCase()} ({refundLabel})
          </span>
        </div>
      </div>

      <div className="obs-briefing-actions">
        <button
          type="button"
          className="obs-secondary-btn"
          onClick={onBackToAtlas}
          data-testid="briefing-back-atlas-btn"
        >
          ← Back to Atlas
        </button>

        <button
          type="button"
          className="obs-secondary-btn"
          onClick={onVisitArchive}
          data-testid="briefing-visit-archive-btn"
        >
          Visit Archive (+Calibration)
        </button>

        <button
          type="button"
          className="obs-primary-cta"
          onClick={onBeginCalibration}
          data-testid="begin-calibration-btn"
        >
          Begin Calibration →
        </button>
      </div>
    </section>
  );
}

interface TelescopeRulesModalProps {
  difficulty: Difficulty;
  onClose: () => void;
}

export function TelescopeRulesModal({
  difficulty,
  onClose,
}: TelescopeRulesModalProps) {
  return (
    <div
      className="obs-rules-modal-backdrop"
      data-testid="telescope-rules-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Telescope calibration rules"
    >
      <div className="obs-rules-modal-card">
        <span className="obs-intro-eyebrow">Telescope Calibration Rules</span>
        <h3 className="obs-rules-modal-title">Align the Brass Optics</h3>
        <RulesCarousel lines={TELESCOPE_BRIEFING_RULES} />
        <p className="obs-rules-modal-note">
          Current difficulty: <strong>{difficulty.toUpperCase()}</strong> —
          Reset Dials gives <strong>{formatRefundLabel(difficulty)}</strong> of
          points spent on this turn.
        </p>
        <button
          type="button"
          className="obs-primary-cta"
          onClick={onClose}
          data-testid="close-telescope-rules-btn"
        >
          Resume Calibration
        </button>
      </div>
    </div>
  );
}
