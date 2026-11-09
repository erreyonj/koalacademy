"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTelescopeProgress,
  type ControlMode,
  type DialName,
  type GameState,
  type TelescopeDestination,
} from "../../engine/game-state";
import {
  DIAL_NAMES,
  getComponentCost,
  getComponentFigure,
  getFailedTracePenalty,
  getFirstDialLineHint,
  isObservationSolved,
} from "../../engine/telescope-engine";
import { CampaignWinScreen } from "./CampaignWinScreen";
import { LensView } from "./LensView";
import { ObservationSuccess } from "./ObservationSuccess";
import {
  TelescopeBody,
  type CollarTraceProgress,
} from "./TelescopeBody";
import { TracePuzzle } from "./TracePuzzle";

interface TelescopeScreenProps {
  state: GameState;
  destination: TelescopeDestination;
  availableDestinations: readonly TelescopeDestination[];
  unlimitedCalibration?: boolean;
  alwaysShowStartDots?: boolean;
  controlMode?: ControlMode;
  onSwitchDestination: (destinationId: string) => void;
  onSolveComponent: (ring: DialName) => void;
  onRecordStuck: (ring: DialName) => void;
  onComplete: () => void;
  onBack: () => void;
  onNavigateArchive: () => void;
}

export function TelescopeScreen({
  state,
  destination,
  availableDestinations,
  unlimitedCalibration = false,
  alwaysShowStartDots = false,
  controlMode = "buttons",
  onSwitchDestination,
  onSolveComponent,
  onRecordStuck,
  onComplete,
  onBack,
  onNavigateArchive,
}: TelescopeScreenProps) {
  const progress =
    state.telescopeProgress?.destinationId === destination.id
      ? state.telescopeProgress
      : createTelescopeProgress(destination.id);

  const [activeRing, setActiveRing] = useState<DialName | null>(null);
  const [traceProgress, setTraceProgress] =
    useState<CollarTraceProgress | null>(null);

  const isMatched = isObservationSolved(progress);
  const isFinale = destination.id === "the-new-body";
  const solvedCount = DIAL_NAMES.filter((ring) => progress.solved[ring]).length;
  const failedTracePenalty = unlimitedCalibration
    ? 0
    : getFailedTracePenalty(state.difficulty);

  const minUnsolvedCost = DIAL_NAMES.reduce((min, ring) => {
    if (progress.solved[ring]) return min;
    const c = getComponentCost(destination, ring, state.difficulty);
    return Math.min(min, c);
  }, Number.POSITIVE_INFINITY);

  const cannotAffordNextRing =
    !isMatched &&
    !unlimitedCalibration &&
    Number.isFinite(minUnsolvedCost) &&
    state.calibrationPoints < minUnsolvedCost;

  // Close active ring puzzle when observation completes or sector changes
  useEffect(() => {
    setActiveRing(null);
    setTraceProgress(null);
  }, [destination.id]);

  useEffect(() => {
    if (isMatched) {
      setActiveRing(null);
      setTraceProgress(null);
    }
  }, [isMatched]);

  useEffect(() => {
    if (!activeRing) setTraceProgress(null);
  }, [activeRing]);

  const handleTraceChange = useCallback(
    (used: number, total: number, stuck: boolean) => {
      setTraceProgress({ used, total, stuck });
    },
    [],
  );

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

  const figures = {
    range: getComponentFigure(destination, "range", state.difficulty),
    focus: getComponentFigure(destination, "focus", state.difficulty),
    alignment: getComponentFigure(destination, "alignment", state.difficulty),
  };

  const costs = {
    range: getComponentCost(destination, "range", state.difficulty),
    focus: getComponentCost(destination, "focus", state.difficulty),
    alignment: getComponentCost(destination, "alignment", state.difficulty),
  };

  const ringLineCounts = {
    range: figures.range.edges.length,
    focus: figures.focus.edges.length,
    alignment: figures.alignment.edges.length,
  };

  const handleSelectRing = (ring: DialName) => {
    if (progress.solved[ring]) return;
    setActiveRing((curr) => (curr === ring ? null : ring));
  };

  const handleSolveRing = (ring: DialName) => {
    onSolveComponent(ring);
    setTraceProgress(null);
    setActiveRing(null);
  };

  return (
    <section
      className="obs-screen obs-telescope-screen"
      aria-label="Telescope Calibration"
      data-testid="telescope-screen"
    >
      <div className="obs-telescope-upper">
        <div className="obs-telescope-lens-col">
          <LensView
            sectorId={destination.id}
            sectorName={destination.name}
            revealName={destination.revealName}
            lensImage={destination.lensImage}
            lensClipGlobe={destination.lensClipGlobe}
            solvedCount={solvedCount}
          />
          {isMatched && !isFinale && (
            <ObservationSuccess
              revealName={destination.revealName}
              onContinue={onComplete}
            />
          )}
        </div>

        {/* Telescope body + anchored TracePuzzle card */}
        <div className="obs-telescope-center-column">
          <TelescopeBody
            costs={costs}
            ringLineCounts={ringLineCounts}
            solved={progress.solved}
            activeRing={activeRing}
            traceProgress={traceProgress}
            calibrationPoints={state.calibrationPoints}
            unlimitedCalibration={unlimitedCalibration}
            onSelectRing={handleSelectRing}
            onNavigateArchive={onNavigateArchive}
          />

          {activeRing && !progress.solved[activeRing] && (
            <TracePuzzle
              ring={activeRing}
              figure={figures[activeRing]}
              cost={costs[activeRing]}
              difficulty={state.difficulty}
              calibrationPoints={state.calibrationPoints}
              unlimitedCalibration={unlimitedCalibration}
              lineHint={getFirstDialLineHint(
                state,
                destination,
                activeRing,
                figures[activeRing],
                0,
                alwaysShowStartDots,
              )}
              failedTracePenalty={failedTracePenalty}
              controlMode={controlMode}
              onSolve={handleSolveRing}
              onStuck={onRecordStuck}
              onTraceChange={handleTraceChange}
              onClose={() => setActiveRing(null)}
              onNavigateArchive={onNavigateArchive}
            />
          )}
        </div>

        <aside
          className="obs-info-card"
          aria-label="Telescope optics"
          data-testid="target-config-card"
        >
          <div className="obs-target-card-header">Telescope Optics</div>
          <div className="obs-target-sector-name">{destination.name}</div>
          <div className="obs-info-row">
            <span className="obs-info-gear" aria-hidden="true">
              ⚙
            </span>
            <p data-testid="trace-cost-rule">
              Solving a collar trace deducts its Calibration cost.{" "}
              {failedTracePenalty > 0
                ? `Each failed trace costs ${failedTracePenalty} Calibration.`
                : "Failed traces are free."}
            </p>
          </div>

          {cannotAffordNextRing && (
            <div
              className="obs-empty-points-alert"
              data-testid="out-of-points-banner"
              role="alert"
            >
              <p>
                Needs {minUnsolvedCost} Calibration for the next ring (you have{" "}
                {state.calibrationPoints}). Recover more records in the Archive!
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

      {/* Bottom instrument console bar with sector switcher & back to Atlas */}
      <div className="obs-console-base">
        <button
          type="button"
          className="obs-console-arrow"
          onClick={() => handleCycle(-1)}
          disabled={!canCycle}
          aria-label="Previous unlocked sector"
        >
          ‹
        </button>

        <div className="obs-console-dials-row obs-console-summary-row">
          <button
            type="button"
            className="obs-secondary-btn"
            onClick={onBack}
            data-testid="telescope-back-atlas-btn"
          >
            ← Back to Atlas
          </button>
          <span className="obs-console-hint">
            Tap a collar label on the tube to trace its optic in one
            continuous line.
          </span>
        </div>

        <button
          type="button"
          className="obs-console-arrow"
          onClick={() => handleCycle(1)}
          disabled={!canCycle}
          aria-label="Next unlocked sector"
        >
          ›
        </button>
      </div>

      {isMatched && isFinale && (
        <CampaignWinScreen onContinue={onComplete} />
      )}
    </section>
  );
}
