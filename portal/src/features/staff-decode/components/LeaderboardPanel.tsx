"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchScores } from "../api";
import {
  cohortLabel,
  difficultyTitle,
  formatClock,
  groupScoresByCohort,
  sortScoresByTimeThenDifficulty,
  type StaffDecodeScore,
} from "../leaderboard";

type SortMode = "cohort" | "time";

type Props = {
  onClose: () => void;
};

export function LeaderboardPanel({ onClose }: Props) {
  const [scores, setScores] = useState<StaffDecodeScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("cohort");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchScores();
        if (cancelled) return;
        setScores(rows);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setScores([]);
        setError(err instanceof Error ? err.message : "Leaderboard isn't available.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cohortGroups = useMemo(
    () => (scores ? groupScoresByCohort(scores) : []),
    [scores],
  );
  const timeSorted = useMemo(
    () => (scores ? sortScoresByTimeThenDifficulty(scores) : []),
    [scores],
  );

  return (
    <section
      className="sd-overlay-card sd-leaderboard-panel"
      aria-label="Staff DeCode leaderboard"
      data-testid="leaderboard-panel"
    >
      <div className="sd-leaderboard-header">
        <div>
          <span className="sd-eyebrow">Staff DeCode · Scores</span>
          <h2 className="sd-start-title">Leaderboard</h2>
        </div>
        <div className="sd-end-actions">
          <button
            type="button"
            className="sd-ghost-btn"
            data-testid="leaderboard-sort-toggle"
            aria-pressed={sortMode === "time"}
            onClick={() =>
              setSortMode((mode) => (mode === "cohort" ? "time" : "cohort"))
            }
          >
            {sortMode === "cohort" ? "Sort by time · difficulty" : "Group by cohort"}
          </button>
          <button
            type="button"
            className="sd-primary-btn"
            data-testid="leaderboard-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      {error && <p className="sd-log-error">{error}</p>}
      {scores === null && !error && (
        <p className="sd-rules-copy">Loading scores…</p>
      )}
      {scores && scores.length === 0 && !error && (
        <p className="sd-rules-copy">No scores yet — crack a vault and log one.</p>
      )}

      {scores && scores.length > 0 && sortMode === "cohort" && (
        <div className="sd-leaderboard-body" data-testid="leaderboard-by-cohort">
          {cohortGroups.map((group) => (
            <section key={group.cohort} className="sd-leaderboard-group">
              <h3 className="sd-leaderboard-group-title">{group.label}</h3>
              <ol className="sd-leaderboard-list">
                {group.scores.map((score, index) => (
                  <ScoreRow
                    key={score.id}
                    rank={index + 1}
                    score={score}
                    showCohort={false}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {scores && scores.length > 0 && sortMode === "time" && (
        <div className="sd-leaderboard-body" data-testid="leaderboard-by-time">
          <ol className="sd-leaderboard-list">
            {timeSorted.map((score, index) => (
              <ScoreRow
                key={score.id}
                rank={index + 1}
                score={score}
                showCohort
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function ScoreRow({
  rank,
  score,
  showCohort,
}: {
  rank: number;
  score: StaffDecodeScore;
  showCohort: boolean;
}) {
  return (
    <li className="sd-leaderboard-row">
      <span className="sd-leaderboard-rank">{rank}</span>
      <span className="sd-leaderboard-alias">{score.alias}</span>
      <span className="sd-leaderboard-cohort">
        {showCohort ? cohortLabel(score.cohort) : ""}
      </span>
      <span className="sd-badge sd-leaderboard-diff">
        {difficultyTitle(score.difficulty)}
      </span>
      <span className="sd-leaderboard-time">{formatClock(score.elapsedSec)}</span>
    </li>
  );
}
