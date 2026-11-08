"use client";

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
  selectedChallengeId: string | null;
  onSelectChallenge: (challengeId: string) => void;
  onChallengeComplete: (challengeId: string, intervalValue: number) => void;
}

export function getDefaultChallengeId(
  challenges: readonly WordChallengeModel[],
  completedChallengeIds: readonly string[],
): string | null {
  return (
    challenges.find((c) => !completedChallengeIds.includes(c.id))?.id ??
    challenges[0]?.id ??
    null
  );
}

export function ArchiveScreen({
  state,
  controlMode,
  challenges,
  selectedChallengeId,
  onSelectChallenge,
  onChallengeComplete,
}: ArchiveScreenProps) {
  const fallbackId = getDefaultChallengeId(
    challenges,
    state.completedChallengeIds,
  );
  const selectedChallenge =
    challenges.find((c) => c.id === selectedChallengeId) ??
    challenges.find((c) => c.id === fallbackId);

  if (!selectedChallenge) return null;

  const handleSelectNextIncomplete = () => {
    const next = challenges.find(
      (c) =>
        c.id !== selectedChallenge.id &&
        !state.completedChallengeIds.includes(c.id),
    );
    if (next) onSelectChallenge(next.id);
  };

  return (
    <section
      className="obs-screen obs-archive-screen"
      aria-label="The Archive"
      data-testid="archive-screen"
    >
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
    </section>
  );
}
