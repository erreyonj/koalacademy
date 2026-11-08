"use client";

/**
 * CLEANUP before shipping to students:
 * 1. Delete this file.
 * 2. Remove the `<DevPanel />` import + mount from KoalastronomerApp.tsx.
 * 3. Optional: drop `grantCalibration` / `setCalibration` / free solve option
 *    from useGameState if nothing else uses them.
 *
 * Dev-only: never mounts when NODE_ENV !== "development".
 */

import { useCallback, useEffect, useState } from "react";
import type {
  DialName,
  Difficulty,
  TelescopeDestination,
  TelescopeProgress,
} from "../engine/game-state";
import {
  DIAL_NAMES,
  getDestinationTotalCost,
  RING_METADATA,
} from "../engine/telescope-engine";

const HIDE_KEY = "koalastronomer-dev-panel-hidden";

type DevPanelProps = {
  calibrationPoints: number;
  difficulty: Difficulty;
  progress: TelescopeProgress | null;
  destination: TelescopeDestination | null;
  unlimited: boolean;
  alwaysShowStartDots: boolean;
  onUnlimitedChange: (next: boolean) => void;
  onAlwaysShowStartDotsChange: (next: boolean) => void;
  onGrantCalibration: (amount: number) => void;
  onSetCalibration: (points: number) => void;
  onSolveComponent: (ring: DialName) => void;
};

function readHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (hidden) {
      window.localStorage.setItem(HIDE_KEY, "1");
    } else {
      window.localStorage.removeItem(HIDE_KEY);
    }
  } catch {
    // ignore
  }
}

export function DevPanel({
  calibrationPoints,
  difficulty,
  progress,
  destination,
  unlimited,
  alwaysShowStartDots,
  onUnlimitedChange,
  onAlwaysShowStartDotsChange,
  onGrantCalibration,
  onSetCalibration,
  onSolveComponent,
}: DevPanelProps) {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1") {
      writeHidden(false);
      setHidden(false);
    } else {
      setHidden(readHidden());
    }
    setReady(true);
  }, []);

  const hide = useCallback(() => {
    writeHidden(true);
    setHidden(true);
  }, []);

  const show = useCallback(() => {
    writeHidden(false);
    setHidden(false);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (!ready) {
    return null;
  }

  if (hidden) {
    return (
      <button
        type="button"
        className="obs-dev-reopen"
        data-testid="obs-dev-reopen"
        onClick={show}
        title="Show Koalastronomer dev panel (?dev=1)"
      >
        DEV
      </button>
    );
  }

  return (
    <aside
      className={`obs-dev-panel${collapsed ? " is-collapsed" : ""}`}
      data-testid="obs-dev-panel"
      aria-label="Koalastronomer developer panel"
    >
      <header className="obs-dev-panel-header">
        <strong>Dev sandbox</strong>
        <div className="obs-dev-panel-header-actions">
          <button
            type="button"
            className="obs-dev-btn obs-dev-btn-ghost"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            className="obs-dev-btn obs-dev-btn-ghost"
            onClick={hide}
            title="Hide until ?dev=1 or DEV chip"
          >
            Hide
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="obs-dev-panel-body">
          <label className="obs-dev-toggle">
            <input
              type="checkbox"
              checked={unlimited}
              data-testid="obs-dev-unlimited"
              onChange={(e) => {
                const next = e.target.checked;
                onUnlimitedChange(next);
                if (next) onSetCalibration(999);
              }}
            />
            Unlimited Calibration (free solves)
          </label>

          <label className="obs-dev-toggle">
            <input
              type="checkbox"
              checked={alwaysShowStartDots}
              data-testid="obs-dev-show-start-dots"
              onChange={(e) => onAlwaysShowStartDotsChange(e.target.checked)}
            />
            Always show start dots
          </label>

          <div className="obs-dev-row">
            <span className="obs-dev-metric">Cal: {calibrationPoints}</span>
            <button
              type="button"
              className="obs-dev-btn"
              onClick={() => onGrantCalibration(50)}
            >
              +50
            </button>
            <button
              type="button"
              className="obs-dev-btn"
              onClick={() => onSetCalibration(999)}
            >
              Fill 999
            </button>
          </div>

          {destination && (
            <p className="obs-dev-dest">
              Sector: {destination.name} (Cost{" "}
              {getDestinationTotalCost(destination, difficulty)} Cal)
            </p>
          )}

          {destination && progress && (
            <div className="obs-dev-nudge" data-testid="obs-dev-solve-rings">
              <span>Solve ring</span>
              {DIAL_NAMES.map((ring) => {
                const isSolved = progress.solved[ring];
                return (
                  <button
                    key={ring}
                    type="button"
                    className="obs-dev-btn"
                    data-testid={`obs-dev-solve-${ring}`}
                    disabled={isSolved}
                    onClick={() => onSolveComponent(ring)}
                  >
                    {RING_METADATA[ring].label} {isSolved ? "✓" : ""}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
