"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import type { DifficultyId } from "../modules/sim";

const RULES_INTERVAL_MS = 5200;

const START_RULES = [
  "You're the Captain of the Notehead",
  "During intergalactic travel you find a planet with high Borealis levels...",
  'But you crash and your ship\'s "Note-Tails" are lost',
  "Find the missing Note-Tails, gather Borealis, escape the planet!",
] as const;

const DIFFICULTY_OPTIONS = [
  {
    id: "easy" as const,
    title: "Easy",
    lines: [
      "Most health",
      "Least sensitive to Damage",
      "No Tonation chains",
    ],
  },
  {
    id: "medium" as const,
    title: "Medium",
    lines: ["Normal Health", "Regular Damage", "No Tonation Chains"],
  },
  {
    id: "hard" as const,
    title: "Hard",
    lines: ["Only 5 HP!", "Regular Damage", "Tonation can chain"],
  },
] as const;

type StartStep = "rules" | "pick";

function RulesCarousel({ lines }: { lines: readonly string[] }) {
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
    <div className="nh-rules-carousel">
      <p key={index} className="nh-rules-slide">
        {lines[index]}
      </p>
      <div className="nh-rules-nav">
        <button
          type="button"
          className="nh-rules-arrow"
          aria-label="Previous instruction"
          onClick={() => go(-1)}
        >
          <ArrowLeft size={16} strokeWidth={2.6} />
        </button>
        <span className="nh-rules-count">
          {index + 1} / {lines.length}
        </span>
        <button
          type="button"
          className="nh-rules-arrow"
          aria-label="Next instruction"
          onClick={() => go(1)}
        >
          <ArrowRight size={16} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

type Props = {
  difficulty: DifficultyId;
  onDifficulty: (id: DifficultyId) => void;
  onBegin: (id: DifficultyId) => void;
};

export function StartScreen({ difficulty, onDifficulty, onBegin }: Props) {
  const [startStep, setStartStep] = useState<StartStep>("rules");

  return (
    <section
      className="nh-overlay-card"
      aria-label="Notehead rules and setup"
      data-testid="notehead-start"
      data-start-step={startStep}
    >
      <div className="nh-start-desktop">
        <div className="nh-start-header">
          <span className="nh-eyebrow">Games</span>
          <h2 className="nh-start-brand">Notehead</h2>
          <RulesCarousel lines={START_RULES} />
        </div>

        <div
          className="nh-difficulty-grid"
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
                data-testid={`start-difficulty-${opt.id}`}
                className={`nh-diff-card${selected ? " is-selected" : ""}`}
                onClick={() => onDifficulty(opt.id)}
              >
                <span className="nh-diff-name">
                  <span>{opt.title}</span>
                  {selected && <span>●</span>}
                </span>
                <ul className="nh-diff-list">
                  {opt.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="nh-start-footer">
          <button
            type="button"
            className="nh-lock-tools"
            aria-disabled="true"
            data-testid="advanced-tools-lock"
            title="Advanced tools coming soon"
          >
            <Lock size={15} aria-hidden="true" />
            <span>Advanced Tools · Locked</span>
          </button>

          <div className="nh-start-actions">
            <button
              type="button"
              className="nh-primary-btn"
              data-testid="start-game-btn"
              onClick={() => onBegin(difficulty)}
            >
              Launch →
            </button>
          </div>
        </div>
      </div>

      <div className="nh-start-phone">
        {startStep === "rules" ? (
          <div className="nh-phone-rules">
            <span className="nh-eyebrow">Games</span>
            <h2 className="nh-start-brand">Notehead</h2>
            <RulesCarousel lines={START_RULES} />
            <div className="nh-phone-rules-actions">
              <button
                type="button"
                className="nh-primary-btn"
                data-testid="choose-difficulty-btn"
                onClick={() => setStartStep("pick")}
              >
                Choose difficulty
              </button>
            </div>
          </div>
        ) : (
          <div className="nh-phone-pick">
            <button
              type="button"
              className="nh-ghost-btn nh-phone-back"
              data-testid="difficulty-back-btn"
              onClick={() => setStartStep("rules")}
            >
              ← Rules
            </button>
            <div
              className="nh-phone-diff-stack"
              role="radiogroup"
              aria-label="Difficulty"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === opt.id}
                  data-testid={`phone-difficulty-${opt.id}`}
                  className={`nh-diff-card${
                    difficulty === opt.id ? " is-selected" : ""
                  }`}
                  onClick={() => onBegin(opt.id)}
                >
                  <span className="nh-diff-name">
                    <span>{opt.title}</span>
                    {difficulty === opt.id && <span>●</span>}
                  </span>
                  <ul className="nh-diff-list">
                    {opt.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
