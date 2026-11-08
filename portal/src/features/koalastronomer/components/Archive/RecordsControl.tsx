"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getChallengeReward } from "../../engine/archive-engine";
import type { Difficulty, WordChallenge } from "../../engine/game-state";

const SET_LABELS: Record<WordChallenge["set"], string> = {
  primary: "Primary",
  "backup-1": "Backup A",
  "backup-2": "Backup B",
};

interface RecordsControlProps {
  sectorName: string;
  challenges: readonly WordChallenge[];
  completedChallengeIds: readonly string[];
  selectedChallengeId: string | null;
  difficulty: Difficulty;
  onSelect: (challengeId: string) => void;
}

/** Collapsed Recovered Records list that sits beside the music transport. */
export function RecordsControl({
  sectorName,
  challenges,
  completedChallengeIds,
  selectedChallengeId,
  difficulty,
  onSelect,
}: RecordsControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const doneCount = challenges.filter((c) =>
    completedChallengeIds.includes(c.id),
  ).length;

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="obs-records-control" ref={rootRef}>
      <button
        type="button"
        className={`obs-records-toggle${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="records-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Records</span>
        <span className="obs-records-count" data-testid="records-count">
          {doneCount} / {challenges.length}
        </span>
        <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="obs-records-popover"
          role="listbox"
          aria-label={`Recovered Records · ${sectorName}`}
          data-testid="records-popover"
        >
          <span className="obs-records-popover-title">
            Recovered Records · {sectorName}
          </span>
          {challenges.map((challenge, idx) => {
            const isDone = completedChallengeIds.includes(challenge.id);
            const isSelected = selectedChallengeId === challenge.id;
            return (
              <button
                key={challenge.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`obs-record-row${isSelected ? " is-selected" : ""}${isDone ? " is-completed" : ""}`}
                data-testid={`challenge-card-${challenge.id}`}
                onClick={() => {
                  onSelect(challenge.id);
                  setOpen(false);
                }}
              >
                <span className="obs-record-index">
                  REC-{String(idx + 1).padStart(2, "0")}
                </span>
                <span className="obs-record-set">
                  {SET_LABELS[challenge.set]}
                </span>
                <span className="obs-record-reward">
                  +{getChallengeReward(challenge.intervalValue, difficulty)}
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
      )}
    </div>
  );
}
