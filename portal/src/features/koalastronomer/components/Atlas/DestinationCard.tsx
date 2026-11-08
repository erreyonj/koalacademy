"use client";

import { useEffect, useState } from "react";
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
import { LensView } from "../Telescope/LensView";

interface DestinationCardProps {
  destination: TelescopeDestination;
  difficulty?: Difficulty;
  isCompleted: boolean;
  isUnlocked: boolean;
  isInProgress: boolean;
  onObserve: () => void;
  onNavigateArchive: () => void;
}

export function DestinationCard({
  destination,
  difficulty = "easy",
  isCompleted,
  isUnlocked,
  isInProgress,
  onObserve,
  onNavigateArchive,
}: DestinationCardProps) {
  const totalCost = getDestinationTotalCost(destination, difficulty);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    setShowLog(false);
  }, [destination.id]);

  return (
    <aside className="obs-dest-card" data-testid="destination-detail-card">
      <div className="obs-dest-card-header">
        <h2>{destination.name}</h2>
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

        <p className="obs-dest-desc">{destination.description}</p>

        {isCompleted ? (
          <>
            <div className="obs-dest-section-pill">Sector Charted ✓</div>
            {showLog ? (
              <div
                className="obs-sector-log"
                data-testid="sector-log"
                role="region"
                aria-label={`${destination.name} sector log`}
              >
                <span className="obs-sector-log-eyebrow">
                  Sector log · {destination.name}
                </span>
                <LensView
                  sectorId={destination.id}
                  sectorName={destination.name}
                  solvedCount={3}
                />
                <p className="obs-sector-log-blurb">
                  {destination.profile.blurb}
                </p>
                <ul className="obs-sector-log-facts">
                  {destination.profile.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="obs-secondary-btn"
                  onClick={() => setShowLog(false)}
                  data-testid="close-sector-log-btn"
                >
                  Close Log
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="obs-primary-cta obs-observe-btn"
                onClick={() => setShowLog(true)}
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
              disabled={!isUnlocked}
              data-testid="begin-observation"
            >
              {!isUnlocked
                ? "Locked Sector"
                : isInProgress
                  ? "Resume Observation"
                  : "Observe"}
            </button>
          </>
        )}

        <button
          type="button"
          className="obs-secondary-btn obs-archive-link-btn"
          onClick={onNavigateArchive}
          data-testid="visit-archive-btn"
        >
          Visit Archive (+Calibration)
        </button>
      </div>
    </aside>
  );
}
