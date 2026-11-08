"use client";

import type {
  Difficulty,
  TelescopeDestination,
} from "../../engine/game-state";
import {
  getDestinationTotalCost,
  getFailedTracePenalty,
} from "../../engine/telescope-engine";
import { RulesCarousel } from "../IntroScreen";

export function getTelescopeBriefingRules(
  difficulty: Difficulty,
): readonly string[] {
  const penalty = getFailedTracePenalty(difficulty);
  return [
    "1. Tap each collar label on the telescope tube (Range, Focus, and Alignment) to open its internal optic trace.",
    "2. Trace every line in the figure exactly once in a single continuous path without lifting.",
    "3. Count the lines at each dot. If some dots have an odd number, start on one of them.",
    penalty > 0
      ? `4. Solving a collar deducts its Calibration cost. Getting stuck or abandoning a started trace costs ${penalty} Calibration.`
      : "4. Solving a collar deducts its Calibration cost. Getting stuck or clearing a trace costs 0 Calibration.",
  ];
}

export function formatHintPolicyLabel(difficulty: Difficulty): string {
  switch (difficulty) {
    case "easy":
      return "1st dial line hint only";
    case "medium":
      return "6–9 line lattices · Capped cost";
    case "hard":
      return "8–11 line meshes · 1 Cal/line";
  }
}

interface TelescopeBriefingProps {
  destination: TelescopeDestination;
  difficulty: Difficulty;
  onBeginCalibration: () => void;
  onBackToAtlas: () => void;
  onVisitArchive: () => void;
}

export function TelescopeBriefing({
  destination,
  difficulty,
  onBeginCalibration,
  onBackToAtlas,
  onVisitArchive,
}: TelescopeBriefingProps) {
  const totalCost = getDestinationTotalCost(destination, difficulty);
  const hintLabel = formatHintPolicyLabel(difficulty);

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

      <RulesCarousel lines={getTelescopeBriefingRules(difficulty)} />

      <div className="obs-briefing-metrics">
        <div className="obs-briefing-metric">
          <span className="obs-metric-label">Total Sector Cost</span>
          <span className="obs-metric-value">Cost {totalCost} Calibration</span>
        </div>
        <div className="obs-briefing-metric">
          <span className="obs-metric-label">Difficulty Profile</span>
          <span className="obs-metric-value">
            {difficulty.toUpperCase()} ({hintLabel})
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
        <h3 className="obs-rules-modal-title">Align the Three Collar Dials</h3>
        <RulesCarousel lines={getTelescopeBriefingRules(difficulty)} />
        <p className="obs-rules-modal-note">
          Current difficulty: <strong>{difficulty.toUpperCase()}</strong> —{" "}
          <strong>{formatHintPolicyLabel(difficulty)}</strong>. Count the lines
          at each dot: if some dots have an odd number, start on one of them.
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
