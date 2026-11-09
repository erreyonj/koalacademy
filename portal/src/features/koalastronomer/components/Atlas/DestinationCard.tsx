"use client";

import { useState } from "react";
import { getAtlasLabel } from "../../engine/atlas-engine";
import type {
  Difficulty,
  TelescopeDestination,
} from "../../engine/game-state";
import {
  DIAL_NAMES,
  getComponentCost,
  getComponentFigure,
  getDestinationTotalCost,
  RING_METADATA,
} from "../../engine/telescope-engine";
import { RestartConfirmModal } from "./RestartConfirmModal";

interface DestinationCardProps {
  destination: TelescopeDestination;
  difficulty?: Difficulty;
  calibrationPoints: number;
  /** Rings already aligned on an in-progress observation for this sector. */
  solvedRings?: Partial<Record<(typeof DIAL_NAMES)[number], boolean>>;
  isCompleted: boolean;
  isUnlocked: boolean;
  isInProgress: boolean;
  showLog: boolean;
  onShowLogChange: (open: boolean) => void;
  onObserve: () => void;
  onNavigateArchive: () => void;
  onNewGame?: () => void;
}

export function DestinationCard({
  destination,
  difficulty = "easy",
  calibrationPoints,
  solvedRings,
  isCompleted,
  isUnlocked,
  isInProgress,
  showLog,
  onShowLogChange,
  onObserve,
  onNavigateArchive,
  onNewGame,
}: DestinationCardProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const atlasLabel = getAtlasLabel(destination, isCompleted);
  const totalCost = getDestinationTotalCost(destination, difficulty);
  const remainingCost = DIAL_NAMES.reduce((sum, ring) => {
    if (solvedRings?.[ring]) return sum;
    return sum + getComponentCost(destination, ring, difficulty);
  }, 0);
  const canAfford = calibrationPoints >= remainingCost;
  const canObserve = isUnlocked && canAfford;
  const showNewGame =
    Boolean(onNewGame) && isCompleted && destination.id === "the-new-body";

  return (
    <aside className="obs-dest-card" data-testid="destination-detail-card">
      <div className="obs-dest-card-header">
        <h2>{atlasLabel}</h2>
      </div>

      <div className="obs-dest-card-body">
        <div className="obs-dest-emblem" aria-hidden="true">
          <svg viewBox="0 0 96 64" width="76" height="50">
            <circle
              cx="48"
              cy="32"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <ellipse
              cx="48"
              cy="32"
              rx="34"
              ry="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              transform="rotate(-16 48 32)"
            />
          </svg>
        </div>

        {!showLog && (
          <p className="obs-dest-desc">{destination.description}</p>
        )}

        {isCompleted ? (
          <>
            <div className="obs-dest-section-pill">Sector Charted ✓</div>
            {showLog ? (
              <div
                className="obs-sector-log"
                data-testid="sector-log"
                role="region"
                aria-label={`${atlasLabel} sector log`}
              >
                <span className="obs-sector-log-eyebrow">
                  Sector log · {atlasLabel}
                </span>
                <div
                  className="obs-sector-log-scroll"
                  data-testid="sector-log-scroll"
                >
                  <p className="obs-sector-log-blurb">
                    {destination.profile.blurb}
                  </p>
                  <ul className="obs-sector-log-facts">
                    {destination.profile.facts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className="obs-secondary-btn"
                  onClick={() => onShowLogChange(false)}
                  data-testid="close-sector-log-btn"
                >
                  Close Log
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="obs-primary-cta obs-observe-btn"
                onClick={() => onShowLogChange(true)}
                data-testid="view-sector-log-btn"
              >
                View Sector Log
              </button>
            )}
          </>
        ) : (
          <>
            <div className="obs-dest-section-pill">Telescope Collar Dials</div>

            <ul className="obs-config-list" aria-label="Telescope ring costs">
              {DIAL_NAMES.map((ring) => {
                const meta = RING_METADATA[ring];
                const cost = getComponentCost(destination, ring, difficulty);
                const lines = getComponentFigure(
                  destination,
                  ring,
                  difficulty,
                ).edges.length;
                return (
                  <li key={ring} className="obs-config-row">
                    <span
                      className={`obs-config-dot obs-dot-${ring}`}
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </span>
                    <span className="obs-config-name">
                      {meta.label} ({lines}L)
                    </span>
                    <span className="obs-config-val">{cost} Cal</span>
                  </li>
                );
              })}
            </ul>

            <div
              className="obs-est-moves"
              data-testid="destination-cost-summary"
            >
              <span>Cost {totalCost} Calibration</span>
              <span className="obs-est-moves-val">⚙ {totalCost}</span>
            </div>

            <button
              type="button"
              className="obs-primary-cta obs-observe-btn"
              onClick={onObserve}
              disabled={!canObserve}
              aria-disabled={!canObserve}
              data-testid="begin-observation"
              title={
                isUnlocked && !canAfford
                  ? `Need ${remainingCost} Calibration (have ${calibrationPoints})`
                  : undefined
              }
            >
              {!isUnlocked
                ? "Locked Sector"
                : !canAfford
                  ? `Observe`
                  : isInProgress
                    ? "Resume Observation"
                    : "Observe"}
            </button>
          </>
        )}

        {showNewGame ? (
          <button
            type="button"
            className="obs-primary-cta obs-new-game-btn"
            onClick={() => setConfirmRestart(true)}
            data-testid="new-game-btn"
          >
            New Game
          </button>
        ) : (
          <button
            type="button"
            className="obs-secondary-btn obs-archive-link-btn"
            onClick={onNavigateArchive}
            data-testid="visit-archive-btn"
          >
            Visit Archive (+Calibration)
          </button>
        )}
      </div>

      {confirmRestart && onNewGame && (
        <RestartConfirmModal
          onCancel={() => setConfirmRestart(false)}
          onConfirm={onNewGame}
        />
      )}
    </aside>
  );
}
