"use client";

import { useState } from "react";
import { getChallengeReward } from "../../engine/archive-engine";
import type {
  ControlMode,
  GameState,
  WordChallenge as WordChallengeModel,
} from "../../engine/game-state";
import { WordChallenge } from "./WordChallenge";

interface ArchiveScreenProps {
  state: GameState;
  controlMode: ControlMode;
  challenges: readonly WordChallengeModel[];
  onChallengeComplete: (challengeId: string, intervalValue: number) => void;
  onBack?: () => void;
}

export function ArchiveScreen({
  state,
  controlMode,
  challenges,
  onChallengeComplete,
  onBack,
}: ArchiveScreenProps) {
  const firstIncomplete =
    challenges.find((c) => !state.completedChallengeIds.includes(c.id)) ??
    challenges[0];

  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(
    firstIncomplete.id,
  );

  const selectedChallenge =
    challenges.find((c) => c.id === selectedChallengeId) ?? firstIncomplete;

  const handleSelectNextIncomplete = () => {
    const next = challenges.find(
      (c) =>
        c.id !== selectedChallenge.id &&
        !state.completedChallengeIds.includes(c.id),
    );
    if (next) {
      setSelectedChallengeId(next.id);
    }
  };

  return (
    <section
      className="obs-screen obs-archive-screen"
      aria-label="The Archive"
      data-testid="archive-screen"
    >
      <div className="obs-archive-layout">
        <aside className="obs-records-sidebar" aria-label="Recovered Records">
          <div className="obs-sidebar-header">
            <h2>Recovered Records</h2>
            <span className="obs-sidebar-count">
              {state.completedChallengeIds.length} / {challenges.length}
            </span>
          </div>

          <div className="obs-record-list" role="list">
            {challenges.map((challenge, idx) => {
              const isDone = state.completedChallengeIds.includes(challenge.id);
              const isSelected = selectedChallenge.id === challenge.id;
              const reward = getChallengeReward(
                challenge.intervalValue,
                state.difficulty,
              );

              return (
                <button
                  key={challenge.id}
                  type="button"
                  className={`obs-record-card${isSelected ? " is-selected" : ""}${isDone ? " is-completed" : ""}`}
                  onClick={() => setSelectedChallengeId(challenge.id)}
                  data-testid={`challenge-card-${challenge.id}`}
                >
                  <span className="obs-record-index">
                    REC-{String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="obs-record-meta">
                    <span className="obs-record-diff">
                      {challenge.difficulty}
                    </span>
                    <span className="obs-record-reward">+{reward}</span>
                  </span>
                  <span
                    className={`obs-record-status${isDone ? " is-done" : isSelected ? " is-active" : ""}`}
                    aria-hidden="true"
                  >
                    {isDone ? "✓" : isSelected ? "▶" : "○"}
                  </span>
                </button>
              );
            })}
          </div>

          {onBack && (
            <button
              type="button"
              className="obs-secondary-btn obs-return-atlas-btn"
              onClick={onBack}
              data-testid="return-to-atlas"
            >
              Return to Atlas
            </button>
          )}
        </aside>

        <div className="obs-archive-stage">
          <WordChallenge
            challenge={selectedChallenge}
            difficulty={state.difficulty}
            controlMode={controlMode}
            isCompleted={state.completedChallengeIds.includes(
              selectedChallenge.id,
            )}
            onComplete={(intervalValue) => {
              onChallengeComplete(selectedChallenge.id, intervalValue);
            }}
            onNextRecord={handleSelectNextIncomplete}
          />
        </div>
      </div>
    </section>
  );
}
