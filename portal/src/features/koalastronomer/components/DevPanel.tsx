"use client";

/**
 * CLEANUP before shipping to students:
 * 1. Delete this file.
 * 2. Remove the `<DevPanel />` import + mount from KoalastronomerApp.tsx.
 * 3. Optional: drop `grantCalibration` / free dialMove option from useGameState
 *    if nothing else uses them.
 *
 * Dev-only: never mounts when NODE_ENV !== "development".
 */

import { useCallback, useEffect, useState } from "react";
import type { TelescopeDestination } from "../engine/game-state";
import type { DialDirection, DialName } from "../engine/telescope-engine";

const HIDE_KEY = "koalastronomer-dev-panel-hidden";

type DialState = {
  range: number;
  focus: number;
  alignment: number;
};

type DevPanelProps = {
  calibrationPoints: number;
  dialState: DialState | null;
  destination: TelescopeDestination | null;
  unlimited: boolean;
  onUnlimitedChange: (next: boolean) => void;
  onGrantCalibration: (amount: number) => void;
  onSetCalibration: (points: number) => void;
  onDialMove: (dial: DialName, direction: DialDirection) => void;
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
  dialState,
  destination,
  unlimited,
  onUnlimitedChange,
  onGrantCalibration,
  onSetCalibration,
  onDialMove,
}: DevPanelProps) {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
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

  const target = destination?.targetConfiguration;

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
            Unlimited Calibration
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

          {dialState && (
            <div className="obs-dev-dials" data-testid="obs-dev-dials">
              <span>
                R <b>{dialState.range}</b>
              </span>
              <span>
                F <b>{dialState.focus}</b>
              </span>
              <span>
                A <b>{dialState.alignment}</b>
              </span>
            </div>
          )}

          {destination && (
            <p className="obs-dev-dest">
              Sector: {destination.name}
              <br />
              Budget: {destination.movementBudget}
            </p>
          )}

          <label className="obs-dev-toggle">
            <input
              type="checkbox"
              checked={showTarget}
              onChange={(e) => setShowTarget(e.target.checked)}
            />
            Reveal target (spoiler)
          </label>

          {showTarget && target && (
            <div className="obs-dev-target" data-testid="obs-dev-target">
              Target R{target.range} · F{target.focus} · A{target.alignment}
            </div>
          )}

          <details className="obs-dev-cheatsheet">
            <summary>Gear linkage</summary>
            <ul>
              <li>
                <b>Range CW</b>: R+1, F−1
              </li>
              <li>
                <b>Focus CW</b>: F+1, R−1, A−1
              </li>
              <li>
                <b>Align CW</b>: A+1, F−1
              </li>
              <li>CCW reverses those deltas. Mod 7.</li>
            </ul>
            <p className="obs-dev-hint">
              Mercury (0,0,0 → 2,1,3): R CW×3, F CW×1, A CCW×3
            </p>
          </details>

          {dialState && (
            <div className="obs-dev-nudge">
              <span>Nudge</span>
              {(
                [
                  ["range", "R"],
                  ["focus", "F"],
                  ["alignment", "A"],
                ] as const
              ).map(([dial, label]) => (
                <span key={dial} className="obs-dev-nudge-group">
                  <button
                    type="button"
                    className="obs-dev-btn"
                    onClick={() => onDialMove(dial, "counterclockwise")}
                  >
                    {label}−
                  </button>
                  <button
                    type="button"
                    className="obs-dev-btn"
                    onClick={() => onDialMove(dial, "clockwise")}
                  >
                    {label}+
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
