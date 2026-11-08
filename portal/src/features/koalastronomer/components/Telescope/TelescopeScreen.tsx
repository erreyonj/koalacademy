"use client";

import { useEffect } from "react";
import type {
  ControlMode,
  GameState,
  TelescopeDestination,
} from "../../engine/game-state";
import {
  calculateResetRefund,
  type DialDirection,
  type DialName,
  isTargetMatched,
} from "../../engine/telescope-engine";
import { DialAssembly } from "./DialAssembly";
import { DialControl } from "./DialControl";
import { ObservationSuccess } from "./ObservationSuccess";
import { formatRefundLabel } from "./TelescopeBriefing";

interface TelescopeScreenProps {
  state: GameState;
  controlMode: ControlMode;
  destination: TelescopeDestination;
  availableDestinations: readonly TelescopeDestination[];
  onSwitchDestination: (destinationId: string) => void;
  onDialMove: (dial: DialName, direction: DialDirection) => void;
  onReset: () => void;
  onComplete: () => void;
  onBack: () => void;
  onNavigateArchive: () => void;
}

export function TelescopeScreen({
  state,
  controlMode,
  destination,
  availableDestinations,
  onSwitchDestination,
  onDialMove,
  onReset,
  onComplete,
  onBack,
  onNavigateArchive,
}: TelescopeScreenProps) {
  const current = state.telescopeDialState ?? destination.startingConfiguration;
  const target = destination.targetConfiguration;
  const isMatched = isTargetMatched(current, target);

  const remainingBudget =
    destination.movementBudget - state.telescopeSpentPoints;
  const canMove = state.calibrationPoints > 0 && !isMatched;
  const refundLabel = formatRefundLabel(state.difficulty);
  const refundPreview = calculateResetRefund(
    state.telescopeSpentPoints,
    state.difficulty,
  );

  useEffect(() => {
    if (!isMatched) return;
    const timer = window.setTimeout(() => {
      onComplete();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [isMatched, onComplete]);

  const currentIdx = availableDestinations.findIndex(
    (d) => d.id === destination.id,
  );
  const canCycle = availableDestinations.length > 1 && !isMatched;

  const handleCycle = (delta: -1 | 1) => {
    if (!canCycle || currentIdx === -1) return;
    const nextIdx =
      (currentIdx + delta + availableDestinations.length) %
      availableDestinations.length;
    onSwitchDestination(availableDestinations[nextIdx].id);
  };

  return (
    <section
      className="obs-screen obs-telescope-screen"
      aria-label="Telescope Calibration"
      data-testid="telescope-screen"
    >
      <div className="obs-telescope-upper">
        {/* Left panel: Target Configuration */}
        <aside
          className="obs-target-card"
          aria-label="Target Configuration"
          data-testid="target-config-card"
        >
          <div className="obs-target-card-header">Target Configuration</div>
          <div className="obs-target-sector-name">{destination.name}</div>
          <ul className="obs-config-list">
            <li
              className={`obs-config-row${current.range === target.range ? " is-matched" : ""}`}
            >
              <span className="obs-config-dot obs-dot-range" aria-hidden="true">
                ⚙
              </span>
              <span className="obs-config-name">Range</span>
              <span className="obs-config-val">{target.range}</span>
            </li>
            <li
              className={`obs-config-row${current.focus === target.focus ? " is-matched" : ""}`}
            >
              <span className="obs-config-dot obs-dot-focus" aria-hidden="true">
                ◎
              </span>
              <span className="obs-config-name">Focus</span>
              <span className="obs-config-val">{target.focus}</span>
            </li>
            <li
              className={`obs-config-row${current.alignment === target.alignment ? " is-matched" : ""}`}
            >
              <span
                className="obs-config-dot obs-dot-alignment"
                aria-hidden="true"
              >
                ⌖
              </span>
              <span className="obs-config-name">Alignment</span>
              <span className="obs-config-val">{target.alignment}</span>
            </li>
          </ul>
        </aside>

        {/* Center circular brass telescope lens */}
        <DialAssembly
          current={current}
          target={target}
          destinationName={destination.name}
        />

        {/* Right panel: Calibration cost & movement budget status (no linkage hints) */}
        <aside className="obs-info-card" aria-label="Calibration status">
          <div className="obs-info-row">
            <span className="obs-info-gear" aria-hidden="true">
              ⚙
            </span>
            <p>Each move costs 1 Calibration.</p>
          </div>
          <hr className="obs-info-divider" />
          <div
            className="obs-budget-tracker"
            data-testid="movement-budget-status"
          >
            <span>
              Moves used: {state.telescopeSpentPoints} /{" "}
              {destination.movementBudget}
            </span>
            {remainingBudget <= 3 && remainingBudget >= 0 && !isMatched && (
              <span className="obs-budget-warn">
                {remainingBudget} par moves left
              </span>
            )}
            {remainingBudget < 0 && !isMatched && (
              <span className="obs-budget-warn">
                Over par budget — keep calibrating or reset dials
              </span>
            )}
          </div>

          {state.calibrationPoints === 0 && !isMatched && (
            <div
              className="obs-empty-points-alert"
              data-testid="out-of-points-banner"
              role="alert"
            >
              <p>
                Out of Calibration points! Recover more records in the Archive
                or reset dials.
              </p>
              <button
                type="button"
                className="obs-primary-cta obs-alert-archive-btn"
                onClick={onNavigateArchive}
              >
                Go to Archive
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom brass console with three colored gear dials */}
      <div className="obs-console-base">
        <button
          type="button"
          className="obs-console-cycle-btn"
          onClick={() => handleCycle(-1)}
          disabled={!canCycle}
          aria-label="Previous destination"
        >
          ‹
        </button>

        <div className="obs-dials-row">
          <DialControl
            name="range"
            label="Range"
            currentValue={current.range}
            targetValue={target.range}
            controlMode={controlMode}
            onMove={(dir) => onDialMove("range", dir)}
            disabled={!canMove}
          />
          <DialControl
            name="focus"
            label="Focus"
            currentValue={current.focus}
            targetValue={target.focus}
            controlMode={controlMode}
            onMove={(dir) => onDialMove("focus", dir)}
            disabled={!canMove}
          />
          <DialControl
            name="alignment"
            label="Alignment"
            currentValue={current.alignment}
            targetValue={target.alignment}
            controlMode={controlMode}
            onMove={(dir) => onDialMove("alignment", dir)}
            disabled={!canMove}
          />
        </div>

        <button
          type="button"
          className="obs-console-cycle-btn"
          onClick={() => handleCycle(1)}
          disabled={!canCycle}
          aria-label="Next destination"
        >
          ›
        </button>
      </div>

      <div className="obs-telescope-actions">
        <button
          type="button"
          className="obs-secondary-btn"
          onClick={onReset}
          disabled={isMatched}
          data-testid="reset-dials-btn"
        >
          Reset Dials ({refundLabel}
          {refundPreview > 0 ? ` · +${refundPreview}` : ""})
        </button>
        <button
          type="button"
          className="obs-secondary-btn"
          onClick={onBack}
          data-testid="back-to-atlas-btn"
        >
          Back to Atlas
        </button>
      </div>

      {isMatched && (
        <ObservationSuccess
          destinationName={destination.name}
          regionName={destination.name}
          onContinue={onComplete}
        />
      )}
    </section>
  );
}
