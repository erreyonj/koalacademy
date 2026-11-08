"use client";

import { useEffect, useRef, useState } from "react";
import {
  validateWordChallenge,
  type WordValidationResult,
} from "../../engine/archive-engine";
import type {
  ControlMode,
  WordChallenge as WordChallengeModel,
} from "../../engine/game-state";
import type { NoteLetter } from "../../engine/intervals";
import { playRecoveredInterval } from "../../hooks/useGameState";
import { IntervalReward } from "./IntervalReward";
import { LetterSelector } from "./LetterSelector";

interface WordChallengeProps {
  challenge: WordChallengeModel;
  controlMode: ControlMode;
  isCompleted: boolean;
  onComplete: (intervalValue: number) => void;
  onNextRecord?: () => void;
}

export function WordChallenge({
  challenge,
  controlMode,
  isCompleted,
  onComplete,
  onNextRecord,
}: WordChallengeProps) {
  const [pos1, pos2] = challenge.missingPositions;
  const correctFirst = challenge.answer[pos1].toUpperCase() as NoteLetter;
  const correctSecond = challenge.answer[pos2].toUpperCase() as NoteLetter;

  const [firstGuess, setFirstGuess] = useState<NoteLetter>(() =>
    isCompleted ? correctFirst : "A",
  );
  const [secondGuess, setSecondGuess] = useState<NoteLetter>(() =>
    isCompleted ? correctSecond : "A",
  );
  const [result, setResult] = useState<WordValidationResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const prevChallengeIdRef = useRef(challenge.id);
  useEffect(() => {
    if (prevChallengeIdRef.current === challenge.id) return;
    prevChallengeIdRef.current = challenge.id;
    const [p1, p2] = challenge.missingPositions;
    setFirstGuess(
      isCompleted ? (challenge.answer[p1].toUpperCase() as NoteLetter) : "A",
    );
    setSecondGuess(
      isCompleted ? (challenge.answer[p2].toUpperCase() as NoteLetter) : "A",
    );
    setResult(null);
    setShowSuccess(false);
  }, [challenge.id, challenge.answer, challenge.missingPositions, isCompleted]);

  const chars = challenge.answer.split("");

  const handleFirstChange = (letter: NoteLetter) => {
    setFirstGuess(letter);
    if (result?.error === "first-letter-wrong") {
      setResult(null);
    }
  };

  const handleSecondChange = (letter: NoteLetter) => {
    setSecondGuess(letter);
    if (result?.error === "second-letter-wrong") {
      setResult(null);
    }
  };

  const handleSubmit = () => {
    const validation = validateWordChallenge(
      challenge,
      firstGuess,
      secondGuess,
    );
    setResult(validation);

    if (validation.valid && validation.firstNote && validation.secondNote) {
      setShowSuccess(true);
      playRecoveredInterval(validation.firstNote, validation.secondNote);
      onComplete(validation.intervalValue!);
    }
  };

  const locked = showSuccess || isCompleted;

  return (
    <div className="obs-parchment-card" data-testid="word-challenge-card">
      {/* Decorative celestial line-art doodles in corners */}
      <svg
        className="obs-doodle obs-doodle-saturn"
        viewBox="0 0 80 56"
        aria-hidden="true"
      >
        <circle
          cx="40"
          cy="28"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <ellipse
          cx="40"
          cy="28"
          rx="32"
          ry="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          transform="rotate(-18 40 28)"
        />
      </svg>

      <svg
        className="obs-doodle obs-doodle-moon"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="32"
          r="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <circle
          cx="24"
          cy="24"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="40"
          cy="35"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="28"
          cy="41"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>

      <div className="obs-parchment-eyebrow">OBSERVATORY RECORD</div>
      <div className="obs-category-pill">{challenge.category}</div>

      <p className="obs-hint">{challenge.hint}</p>

      {/* Centered word with circular telescope bearings directly in the blank spaces */}
      <div
        className="obs-word-bearing-line"
        data-testid="challenge-word-display"
        aria-label="Damaged record letters and bearings"
      >
        {chars.map((char, idx) => {
          const isFirstMissing = idx === pos1;
          const isSecondMissing = idx === pos2;

          if (!isFirstMissing && !isSecondMissing) {
            return (
              <div key={idx} className="obs-static-letter-tile">
                <span className="obs-word-char">{char}</span>
                <span className="obs-tile-pedestal" aria-hidden="true" />
              </div>
            );
          }

          if (isFirstMissing) {
            return (
              <LetterSelector
                key={idx}
                position="first"
                value={locked ? (char as NoteLetter) : firstGuess}
                controlMode={controlMode}
                onChange={handleFirstChange}
                disabled={locked}
                error={result?.error === "first-letter-wrong"}
              />
            );
          }

          return (
            <LetterSelector
              key={idx}
              position="second"
              value={locked ? (char as NoteLetter) : secondGuess}
              controlMode={controlMode}
              onChange={handleSecondChange}
              disabled={locked}
              error={result?.error === "second-letter-wrong"}
            />
          );
        })}
      </div>

      {result?.error && !showSuccess && (
        <div className="obs-error-msg" data-testid="error-message" role="alert">
          {result.error === "first-letter-wrong"
            ? "First letter is incorrect"
            : "Second letter is incorrect"}
        </div>
      )}

      {showSuccess && result?.valid && (
        <IntervalReward
          firstNote={result.firstNote!}
          secondNote={result.secondNote!}
          intervalValue={result.intervalValue!}
        />
      )}

      <div className="obs-parchment-actions">
        <button
          type="button"
          className="obs-primary-cta"
          onClick={handleSubmit}
          disabled={locked}
          data-testid="submit-guess"
        >
          {isCompleted && !showSuccess ? "Record Recovered ✓" : "Recover Record"}
        </button>

        {showSuccess && onNextRecord && (
          <button
            type="button"
            className="obs-secondary-btn"
            onClick={onNextRecord}
            data-testid="next-record-btn"
          >
            Next Record →
          </button>
        )}
      </div>
    </div>
  );
}
