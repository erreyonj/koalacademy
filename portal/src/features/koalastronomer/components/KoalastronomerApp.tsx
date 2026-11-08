"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DESTINATIONS } from "../data/destinations";
import { WORD_CHALLENGES } from "../data/word-challenges";
import { getAvailableDestinations } from "../engine/atlas-engine";
import type { ControlMode, Screen } from "../engine/game-state";
import type { DialDirection, DialName } from "../engine/telescope-engine";
import { useGameState } from "../hooks/useGameState";
import "../koalastronomer.css";
import { ArchiveScreen } from "./Archive/ArchiveScreen";
import { AtlasScreen } from "./Atlas/AtlasScreen";
import { CalibrationPill } from "./CalibrationPill";
import { DevPanel } from "./DevPanel";
import { IntroScreen } from "./IntroScreen";
import { Navigation } from "./Navigation";
import {
  TelescopeBriefing,
  TelescopeRulesModal,
} from "./Telescope/TelescopeBriefing";
import { TelescopeScreen } from "./Telescope/TelescopeScreen";
import { MusicTransport, useThemeMusic } from "./ThemeMusic";

const NOTE_DUCK_MS = 900;

export function KoalastronomerApp() {
  const { state, actions } = useGameState();
  const [controlMode, setControlMode] = useState<ControlMode>("touch");
  const [showTelescopeRules, setShowTelescopeRules] = useState(false);
  const [ducked, setDucked] = useState(false);
  const [unlimitedCalibration, setUnlimitedCalibration] = useState(false);
  const music = useThemeMusic(ducked);
  const { start: startMusic } = music;

  const currentDestination = DESTINATIONS.find(
    (d) => d.id === state.currentDestinationId,
  );
  const availableDestinations = getAvailableDestinations(DESTINATIONS, state);

  useEffect(() => {
    if (!ducked) return;
    const timer = window.setTimeout(() => setDucked(false), NOTE_DUCK_MS);
    return () => window.clearTimeout(timer);
  }, [ducked]);

  useEffect(() => {
    if (state.currentScreen !== "telescope") {
      setShowTelescopeRules(false);
    }
  }, [state.currentScreen]);

  const handleEnterObservatory = useCallback(() => {
    startMusic();
    actions.enterObservatory();
  }, [actions, startMusic]);

  const handleNavigate = useCallback(
    (screen: Screen) => {
      startMusic();
      actions.navigate(screen);
    },
    [actions, startMusic],
  );

  const handleSelectObservation = useCallback(
    (destinationId: string) => {
      startMusic();
      actions.selectObservation(destinationId);
    },
    [actions, startMusic],
  );

  const handleBeginCalibration = useCallback(
    (destinationId?: string) => {
      startMusic();
      actions.beginCalibration(destinationId);
    },
    [actions, startMusic],
  );

  const handleChallengeComplete = useCallback(
    (challengeId: string, intervalValue: number) => {
      startMusic();
      setDucked(true);
      actions.challengeComplete(challengeId, intervalValue);
    },
    [actions, startMusic],
  );

  const handleDialMove = useCallback(
    (dial: DialName, direction: DialDirection) => {
      startMusic();
      actions.dialMove(dial, direction, {
        free: unlimitedCalibration,
      });
    },
    [actions, startMusic, unlimitedCalibration],
  );

  const isIntro = state.currentScreen === "intro";

  return (
    <div className="obs-outer-frame">
      {/* Outer frame chrome (outside .obs-shell, mirroring Staff DeCode) */}
      <header className="obs-outer-topbar">
        <div className="obs-outer-left">
          <span className="obs-outer-title">Koalastronomer</span>
          <span
            className={`obs-outer-badge${state.difficulty === "hard" ? " is-hard" : ""}`}
          >
            {state.difficulty}
          </span>
          {!isIntro && (
            <span className="obs-outer-badge" data-testid="sector-progress-badge">
              Sectors {state.completedDestinationIds.length} /{" "}
              {DESTINATIONS.length} · Records{" "}
              {state.completedChallengeIds.length} / {WORD_CHALLENGES.length}
            </span>
          )}
        </div>

        <div className="obs-outer-right">
          <button
            type="button"
            className={`obs-outer-btn${controlMode === "touch" ? " is-on" : ""}`}
            data-testid="touch-screen-toggle"
            aria-pressed={controlMode === "touch"}
            onClick={() =>
              setControlMode((mode) =>
                mode === "touch" ? "buttons" : "touch",
              )
            }
          >
            Touch Screen
          </button>

          {state.currentScreen === "telescope" && (
            <button
              type="button"
              className={`obs-outer-btn${showTelescopeRules ? " is-on" : ""}`}
              data-testid="telescope-rules-toggle"
              aria-pressed={showTelescopeRules}
              onClick={() => setShowTelescopeRules((open) => !open)}
            >
              Rules
            </button>
          )}

          {!isIntro && (
            <button
              type="button"
              className="obs-outer-btn"
              onClick={actions.resetGame}
              data-testid="outer-reset-btn"
            >
              <RotateCcw
                size={13}
                style={{
                  display: "inline",
                  verticalAlign: "-2px",
                  marginRight: "4px",
                }}
              />
              Reset
            </button>
          )}
        </div>
      </header>

      <div
        className="obs-shell"
        data-testid="koalastronomer-stage"
        data-screen={state.currentScreen}
        data-control-mode={controlMode}
      >
        {!isIntro && (
          <div className="obs-hud-row">
            <Navigation
              currentScreen={state.currentScreen}
              hasActiveObservation={Boolean(
                currentDestination && state.telescopeDialState,
              )}
              onNavigate={handleNavigate}
            />

            <CalibrationPill
              points={state.calibrationPoints}
              completedChallenges={state.completedChallengeIds.length}
              completedObservations={state.completedDestinationIds.length}
            />
          </div>
        )}

        <main className="obs-stage-main">
          {isIntro && (
            <IntroScreen
              difficulty={state.difficulty}
              onSelectDifficulty={actions.setDifficulty}
              onEnter={handleEnterObservatory}
            />
          )}

          {state.currentScreen === "archive" && (
            <ArchiveScreen
              state={state}
              controlMode={controlMode}
              challenges={WORD_CHALLENGES}
              onChallengeComplete={handleChallengeComplete}
              onBack={() => handleNavigate("atlas")}
            />
          )}

          {state.currentScreen === "atlas" && (
            <AtlasScreen
              state={state}
              destinations={DESTINATIONS}
              onSelectDestination={handleSelectObservation}
              onNavigateArchive={() => handleNavigate("archive")}
            />
          )}

          {state.currentScreen === "telescope-briefing" &&
            currentDestination && (
              <TelescopeBriefing
                destination={currentDestination}
                calibrationPoints={state.calibrationPoints}
                difficulty={state.difficulty}
                onBeginCalibration={() =>
                  handleBeginCalibration(currentDestination.id)
                }
                onBackToAtlas={() => handleNavigate("atlas")}
                onVisitArchive={() => handleNavigate("archive")}
              />
            )}

          {state.currentScreen === "telescope" && currentDestination && (
            <TelescopeScreen
              state={state}
              controlMode={controlMode}
              destination={currentDestination}
              availableDestinations={availableDestinations}
              onSwitchDestination={(destId) => handleBeginCalibration(destId)}
              onDialMove={handleDialMove}
              onReset={actions.resetDials}
              onComplete={actions.observationComplete}
              onBack={() => handleNavigate("atlas")}
              onNavigateArchive={() => handleNavigate("archive")}
            />
          )}
        </main>

        {showTelescopeRules && state.currentScreen === "telescope" && (
          <TelescopeRulesModal
            difficulty={state.difficulty}
            onClose={() => setShowTelescopeRules(false)}
          />
        )}

        <MusicTransport
          playing={music.playing}
          volume={music.volume}
          onToggle={music.toggle}
          onVolume={music.setVolume}
        />

        {!isIntro && (
          <footer className="obs-shell-footer">
            <span className="obs-footer-progress">
              Sectors Charted: {state.completedDestinationIds.length} /{" "}
              {DESTINATIONS.length} · Records Recovered:{" "}
              {state.completedChallengeIds.length} / {WORD_CHALLENGES.length}
            </span>
            <button
              type="button"
              className="obs-reset-game-btn"
              onClick={actions.resetGame}
              data-testid="reset-game-btn"
            >
              Reset Progress
            </button>
          </footer>
        )}
      </div>

      <DevPanel
        calibrationPoints={state.calibrationPoints}
        dialState={state.telescopeDialState}
        destination={currentDestination ?? null}
        unlimited={unlimitedCalibration}
        onUnlimitedChange={setUnlimitedCalibration}
        onGrantCalibration={actions.grantCalibration}
        onSetCalibration={actions.setCalibration}
        onDialMove={handleDialMove}
      />
    </div>
  );
}
