"use client";

import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import type { Difficulty } from "../engine/game-state";

const RULES_INTERVAL_MS = 4500;

export const INTRO_RULES: readonly string[] = [
  "1. Visit the Archive to reconstruct damaged observatory records using the musical alphabet (A through G).",
  "2. Each recovered record plays its ascending musical interval and awards that interval number in Calibration points.",
  "3. Open the Celestial Atlas to select an unlocked sky sector and review its target telescope configuration.",
  "4. Spend 1 Calibration per gear move on the brass telescope to align Range, Focus, and Alignment and chart the sector.",
  "5. Resetting the telescope dials returns them to their starting positions and refunds Calibration based on your chosen difficulty.",
];

export function RulesCarousel({ lines }: { lines: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(0);

  useEffect(() => {
    if (lines.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, RULES_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [lines.length, hold]);

  function go(delta: number) {
    setIndex((current) => (current + delta + lines.length) % lines.length);
    setHold((current) => current + 1);
  }

  return (
    <div className="obs-rules-carousel" data-testid="rules-carousel">
      <p key={index} className="obs-rules-slide">
        {lines[index]}
      </p>
      <div className="obs-rules-nav">
        <button
          type="button"
          className="obs-rules-arrow"
          aria-label="Previous instruction"
          onClick={() => go(-1)}
        >
          <ArrowLeft size={16} strokeWidth={2.6} />
        </button>
        <span className="obs-rules-count">
          {index + 1} / {lines.length}
        </span>
        <button
          type="button"
          className="obs-rules-arrow"
          aria-label="Next instruction"
          onClick={() => go(1)}
        >
          <ArrowRight size={16} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

interface IntroScreenProps {
  difficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onEnter: () => void;
}

const DIFFICULTY_OPTIONS: ReadonlyArray<{
  id: Difficulty;
  title: string;
  records: string;
  sectors: string;
  refund: string;
  rules: string;
}> = [
  {
    id: "easy",
    title: "Easy",
    records: "16 Archive records · Ascending intervals",
    sectors: "4 Atlas sectors · Par move budgets",
    refund: "50% Calibration refund on dial reset",
    rules: "Two-turn cushion when recalibrating",
  },
  {
    id: "medium",
    title: "Medium",
    records: "16 Archive records · Ascending intervals",
    sectors: "4 Atlas sectors · Par move budgets",
    refund: "25% Calibration refund on dial reset",
    rules: "Lighter refund when resetting dials",
  },
  {
    id: "hard",
    title: "Hard",
    records: "16 Archive records · Ascending intervals",
    sectors: "4 Atlas sectors · Par move budgets",
    refund: "0% Calibration refund on dial reset",
    rules: "Every gear movement is permanent",
  },
];

export function IntroScreen({
  difficulty,
  onSelectDifficulty,
  onEnter,
}: IntroScreenProps) {
  return (
    <section
      className="obs-intro-overlay"
      aria-label="Koalastronomer rules and setup"
      data-testid="intro-screen"
    >
      <div className="obs-intro-header">
        <span className="obs-intro-eyebrow">
          Toolkit · Games · Musical Interval Observatory
        </span>
        <h2 className="obs-intro-title">Restore the observatory.</h2>
        <RulesCarousel lines={INTRO_RULES} />
      </div>

      <div
        className="obs-difficulty-grid"
        role="radiogroup"
        aria-label="Difficulty"
      >
        {DIFFICULTY_OPTIONS.map((opt) => {
          const selected = difficulty === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`difficulty-${opt.id}`}
              className={`obs-diff-card${selected ? " is-selected" : ""}`}
              onClick={() => onSelectDifficulty(opt.id)}
            >
              <span className="obs-diff-name">
                <span>{opt.title}</span>
                {selected && <span>●</span>}
              </span>
              <span className="obs-diff-meta">{opt.records}</span>
              <span className="obs-diff-meta">{opt.sectors}</span>
              <span className="obs-diff-meta">{opt.refund}</span>
              <span className="obs-diff-meta">{opt.rules}</span>
            </button>
          );
        })}
      </div>

      <div className="obs-intro-footer">
        <button
          type="button"
          className="obs-lock-tools"
          aria-disabled="true"
          data-testid="advanced-tools-lock"
          title="Advanced tools coming soon: custom sector generators and chromatic intervals"
        >
          <Lock size={15} aria-hidden="true" />
          <span>Advanced Tools · Locked</span>
        </button>

        <button
          type="button"
          className="obs-primary-cta"
          data-testid="enter-observatory-btn"
          onClick={onEnter}
        >
          Enter Observatory →
        </button>
      </div>
    </section>
  );
}
