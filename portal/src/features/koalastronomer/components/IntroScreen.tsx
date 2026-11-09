"use client";

import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import type { Difficulty } from "../engine/game-state";

const RULES_INTERVAL_MS = 4500;
const HERO_RULES_INTERVAL_MS = 7000;

export const INTRO_RULES: readonly string[] = [
  "You're a legendary Astronomer and have discovered a new celestial body...",
  "But an unknown interference has altered your observatory records.",
  "Recover the damaged records in the Archive by rebuilding words with the musical alphabet (A to G).",
  "Choose a sky sector in the Atlas, then calibrate the telescope's Range, Focus, and Alignment collars.",
  "Trace each collar's optic in one continuous line.",
  "Calibrate all four sectors to bring the new body into view.",
];

export function RulesCarousel({
  lines,
  hero = false,
}: {
  lines: readonly string[];
  hero?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(0);

  useEffect(() => {
    if (lines.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, hero ? HERO_RULES_INTERVAL_MS : RULES_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [lines.length, hold, hero]);

  function go(delta: number) {
    setIndex((current) => (current + delta + lines.length) % lines.length);
    setHold((current) => current + 1);
  }

  return (
    <div
      className={`obs-rules-carousel${hero ? " obs-rules-carousel--hero" : ""}`}
      data-testid="rules-carousel"
    >
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
  hintPolicy: string;
  rules: string;
}> = [
  {
    id: "easy",
    title: "Easy",
    records: "4 A–G records per sector · 2 missing letters · 2 backup sets if Calibration runs dry",
    sectors: "4–6 line figures · 55 Cal total across 4 sectors",
    hintPolicy: "1 'Follow this line' hint on the very first dial only",
    rules: "Failed traces are free · Pay 1 Cal per line on solve",
  },
  {
    id: "medium",
    title: "Medium",
    records: "4 A–G records per sector · 3 missing letters · 2 backup sets if Calibration runs dry",
    sectors: "6–9 line double-loop lattices · Capped 4–6 Cal per ring",
    hintPolicy: "No line hints · Count odd-degree crossroads",
    rules: "Failed traces are free · Fixed 55 Cal total sector cost",
  },
  {
    id: "hard",
    title: "Hard",
    records: "6 records per sector (4 A–G + 2 astronomy bonus) · 3–4 missing letters · 1 backup set, then Game Over",
    sectors: "8–11 line multi-mesh optics · Unlabeled nodes",
    hintPolicy: "No hints or node labels · Pure graph analysis",
    rules: "Failed traces cost 1 Cal · Pay 1 Cal per line",
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
        <RulesCarousel lines={INTRO_RULES} hero />
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
              <span className="obs-diff-meta">{opt.hintPolicy}</span>
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
