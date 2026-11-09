"use client";

import { type CSSProperties, useState } from "react";
import {
  getBlankNotes,
  validateWordChallenge,
  type WordValidationResult,
} from "../../engine/archive-engine";
import type {
  ControlMode,
  Difficulty,
  WordChallenge as WordChallengeModel,
} from "../../engine/game-state";
import type { NoteLetter } from "../../engine/intervals";
import { playRecoveredInterval } from "../../hooks/useGameState";
import { IntervalReward } from "./IntervalReward";
import { LetterSelector } from "./LetterSelector";

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

interface WordChallengeProps {
  challenge: WordChallengeModel;
  difficulty?: Difficulty;
  controlMode: ControlMode;
  isCompleted: boolean;
  onComplete: (reward: number) => void;
  /** Shown once this record is recovered and another is still unrecovered. */
  onNextRecord?: () => void;
  /** Shown once this record is recovered and no unrecovered records remain. */
  onCalibrate?: () => void;
}

function initialGuesses(
  challenge: WordChallengeModel,
  difficulty: Difficulty,
  isCompleted: boolean,
): NoteLetter[] {
  const notes = getBlankNotes(challenge, difficulty);
  return isCompleted ? notes : notes.map(() => "A");
}

export function WordChallenge({
  challenge,
  difficulty = "easy",
  controlMode,
  isCompleted,
  onComplete,
  onNextRecord,
  onCalibrate,
}: WordChallengeProps) {
  const blanks = challenge.blanks[difficulty];
  const [guesses, setGuesses] = useState<NoteLetter[]>(() =>
    initialGuesses(challenge, difficulty, isCompleted),
  );
  const [result, setResult] = useState<WordValidationResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const chars = challenge.answer.split("");
  const wrongIndex = result && !result.valid ? result.wrongIndex : null;

  const handleChange = (bearing: number, letter: NoteLetter) => {
    setGuesses((prev) => prev.map((g, i) => (i === bearing ? letter : g)));
    if (wrongIndex === bearing) {
      setResult(null);
    }
  };

  const handleSubmit = () => {
    const validation = validateWordChallenge(challenge, difficulty, guesses);
    setResult(validation);

    if (validation.valid) {
      setShowSuccess(true);
      playRecoveredInterval(validation.notes);
      onComplete(validation.total);
    }
  };

  const locked = showSuccess || isCompleted;

  return (
    <div className="obs-parchment-card" data-testid="word-challenge-card">
      <div className="obs-parchment-header">
        <span className="obs-parchment-eyebrow">
          OBSERVATORY TELEMETRY LOG · {challenge.title}
        </span>
      </div>

      <p className="obs-hint">{challenge.hint}</p>

      <div
        className="obs-word-bearing-line"
        data-testid="challenge-word-display"
        data-letters={chars.length}
        data-bearings={blanks.length}
        aria-label="Damaged record letters and bearings"
        style={
          {
            "--obs-word-letters": chars.length,
            "--obs-word-bearings": blanks.length,
          } as CSSProperties
        }
      >
        {chars.map((char, idx) => {
          const bearing = blanks.indexOf(idx);

          if (bearing === -1) {
            return (
              <div key={idx} className="obs-static-letter-tile">
                <span className="obs-word-char">{char}</span>
                <span className="obs-tile-pedestal" aria-hidden="true" />
              </div>
            );
          }

          return (
            <LetterSelector
              key={idx}
              index={bearing}
              value={locked ? (char as NoteLetter) : guesses[bearing]}
              controlMode={controlMode}
              onChange={(letter) => handleChange(bearing, letter)}
              disabled={locked}
              error={wrongIndex === bearing}
            />
          );
        })}
      </div>

      {wrongIndex !== null && !showSuccess && (
        <div className="obs-error-msg" data-testid="error-message" role="alert">
          {ORDINALS[wrongIndex] ?? `Bearing ${wrongIndex + 1}`} letter is
          incorrect
        </div>
      )}

      {showSuccess && result?.valid && (
        <IntervalReward
          notes={result.notes}
          steps={result.steps}
          total={result.total}
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

        {locked && onNextRecord && (
          <button
            type="button"
            className="obs-secondary-btn"
            onClick={onNextRecord}
            data-testid="next-record-btn"
          >
            Next Record →
          </button>
        )}

        {locked && !onNextRecord && onCalibrate && (
          <button
            type="button"
            className="obs-secondary-btn"
            onClick={onCalibrate}
            data-testid="calibrate-telescope-btn"
          >
            Calibrate Telescope →
          </button>
        )}
      </div>
    </div>
  );
}
