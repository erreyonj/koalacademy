"use client";

import type { TelescopeDestination } from "../../engine/game-state";

interface DestinationCardProps {
  destination: TelescopeDestination;
  isCompleted: boolean;
  isUnlocked: boolean;
  isInProgress: boolean;
  onObserve: () => void;
  onNavigateArchive: () => void;
}

export function DestinationCard({
  destination,
  isCompleted,
  isUnlocked,
  isInProgress,
  onObserve,
  onNavigateArchive,
}: DestinationCardProps) {
  const { range, focus, alignment } = destination.targetConfiguration;

  return (
    <aside className="obs-dest-card" data-testid="destination-detail-card">
      <div className="obs-dest-card-header">
        <h2>{destination.name}</h2>
      </div>

      <div className="obs-dest-card-body">
        <div className="obs-dest-emblem" aria-hidden="true">
          <svg viewBox="0 0 96 64" width="84" height="56">
            <circle
              cx="48"
              cy="32"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <ellipse
              cx="48"
              cy="32"
              rx="34"
              ry="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              transform="rotate(-16 48 32)"
            />
          </svg>
        </div>

        <p className="obs-dest-desc">{destination.description}</p>

        <div className="obs-dest-section-pill">Telescope Configuration</div>

        <ul className="obs-config-list" aria-label="Target configuration">
          <li className="obs-config-row">
            <span className="obs-config-dot obs-dot-range" aria-hidden="true">
              ⚙
            </span>
            <span className="obs-config-name">Range</span>
            <span className="obs-config-val">{range}</span>
          </li>
          <li className="obs-config-row">
            <span className="obs-config-dot obs-dot-focus" aria-hidden="true">
              ◎
            </span>
            <span className="obs-config-name">Focus</span>
            <span className="obs-config-val">{focus}</span>
          </li>
          <li className="obs-config-row">
            <span
              className="obs-config-dot obs-dot-alignment"
              aria-hidden="true"
            >
              ⌖
            </span>
            <span className="obs-config-name">Alignment</span>
            <span className="obs-config-val">{alignment}</span>
          </li>
        </ul>

        <div className="obs-est-moves">
          <span>Est. Moves</span>
          <span className="obs-est-moves-val">
            ⚙ {destination.movementBudget}
          </span>
        </div>

        <button
          type="button"
          className="obs-primary-cta obs-observe-btn"
          onClick={onObserve}
          disabled={!isUnlocked || isCompleted}
          data-testid="begin-observation"
        >
          {isCompleted
            ? "Observed ✓"
            : !isUnlocked
              ? "Locked Sector"
              : isInProgress
                ? "Resume Observation"
                : "Observe"}
        </button>

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
