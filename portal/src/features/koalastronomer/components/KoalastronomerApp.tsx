"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DESTINATIONS } from "../data/destinations";
import { WORD_CHALLENGES } from "../data/word-challenges";
import { getAvailableDestinations } from "../engine/atlas-engine";
import {
  getArchiveSector,
  getAvailableChallenges,
  getRecordTotal,
  isGameOver,
} from "../engine/sector-archive";
import type { ControlMode, DialName, Screen } from "../engine/game-state";
import { useGameState } from "../hooks/useGameState";
import "../koalastronomer.css";
import { ArchiveScreen } from "./Archive/ArchiveScreen";
import { RecordsControl } from "./Archive/RecordsControl";
import { AtlasScreen } from "./Atlas/AtlasScreen";
import { CalibrationPill } from "./CalibrationPill";
import { DevPanel } from "./DevPanel";
import { GameOverScreen } from "./GameOverScreen";
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
  const [alwaysShowStartDots, setAlwaysShowStartDots] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    null,
  );
  const music = useThemeMusic(ducked);
  const { start: startMusic } = music;

  const currentDestination = DESTINATIONS.find(
    (d) => d.id === state.currentDestinationId,
  );
  const availableDestinations = getAvailableDestinations(DESTINATIONS, state);
  const archiveSector = getArchiveSector(state, DESTINATIONS);
  const availableChallenges = getAvailableChallenges(
    state,
    WORD_CHALLENGES,
    DESTINATIONS,
  );
  const recordTotal = getRecordTotal(
    state,
    WORD_CHALLENGES,
    availableChallenges,
  );
  const gameOver =
    !unlimitedCalibration &&
    isGameOver(state, DESTINATIONS, WORD_CHALLENGES);
  const availableRecordIds = availableChallenges.map((c) => c.id).join(",");

  useEffect(() => {
    const ids = availableRecordIds.split(",").filter(Boolean);
    if (selectedRecordId && ids.includes(selectedRecordId)) return;
    // Stay on a recovered record so Next Record / Calibrate Telescope can show.
    setSelectedRecordId(
      ids.find((id) => !state.completedChallengeIds.includes(id)) ??
        ids[0] ??
        null,
    );
  }, [
    archiveSector.id,
    availableRecordIds,
    selectedRecordId,
    state.completedChallengeIds,
  ]);

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

  // Hide the mobile site header once the game has started (non-intro screens)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (state.currentScreen !== "intro") {
      document.documentElement.dataset.gameActive = "true";
    } else {
      delete document.documentElement.dataset.gameActive;
    }
    return () => {
      delete document.documentElement.dataset.gameActive;
    };
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
    (challengeId: string, reward: number) => {
      startMusic();
      setDucked(true);
      actions.challengeComplete(challengeId, reward);
    },
    [actions, startMusic],
  );

  const handleSolveComponent = useCallback(
    (ring: DialName) => {
      startMusic();
      actions.solveComponent(ring, {
        free: unlimitedCalibration,
      });
    },
    [actions, startMusic, unlimitedCalibration],
  );

  const handleRecordStuck = useCallback(
    (ring: DialName) => {
      actions.recordStuck(ring, { free: unlimitedCalibration });
    },
    [actions, unlimitedCalibration],
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
            <span
              className="obs-outer-badge"
              data-testid="sector-progress-badge"
            >
              Sectors {state.completedDestinationIds.length} /{" "}
              {DESTINATIONS.length} · Records{" "}
              {state.completedChallengeIds.length} / {recordTotal}
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
                currentDestination && state.telescopeProgress,
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
              challenges={availableChallenges}
              selectedChallengeId={selectedRecordId}
              onSelectChallenge={setSelectedRecordId}
              onChallengeComplete={handleChallengeComplete}
              onCalibrate={() => handleSelectObservation(archiveSector.id)}
            />
          )}

          {state.currentScreen === "atlas" && (
            <AtlasScreen
              state={state}
              destinations={DESTINATIONS}
              onSelectDestination={handleSelectObservation}
              onNavigateArchive={() => handleNavigate("archive")}
              onNewGame={actions.resetGame}
            />
          )}

          {state.currentScreen === "telescope-briefing" &&
            currentDestination && (
              <TelescopeBriefing
                destination={currentDestination}
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
              destination={currentDestination}
              availableDestinations={availableDestinations}
              unlimitedCalibration={unlimitedCalibration}
              alwaysShowStartDots={alwaysShowStartDots}
              controlMode={controlMode}
              onSwitchDestination={handleSelectObservation}
              onSolveComponent={handleSolveComponent}
              onRecordStuck={handleRecordStuck}
              onComplete={actions.observationComplete}
              onBack={() => handleNavigate("atlas")}
              onNavigateArchive={() => handleNavigate("archive")}
            />
          )}
        </main>

        {state.currentScreen === "telescope" && showTelescopeRules && (
          <TelescopeRulesModal
            difficulty={state.difficulty}
            onClose={() => setShowTelescopeRules(false)}
          />
        )}

        {gameOver && (
          <GameOverScreen
            calibrationPoints={state.calibrationPoints}
            onRestart={actions.resetGame}
          />
        )}

        <div className="obs-transport-row">
          {state.currentScreen === "archive" && (
            <RecordsControl
              sectorName={archiveSector.name}
              challenges={availableChallenges}
              completedChallengeIds={state.completedChallengeIds}
              selectedChallengeId={selectedRecordId}
              difficulty={state.difficulty}
              onSelect={setSelectedRecordId}
            />
          )}
          <MusicTransport
            playing={music.playing}
            volume={music.volume}
            onToggle={music.toggle}
            onVolume={music.setVolume}
          />
        </div>
      </div>

      <DevPanel
        calibrationPoints={state.calibrationPoints}
        difficulty={state.difficulty}
        progress={state.telescopeProgress}
        destination={currentDestination ?? null}
        unlimited={unlimitedCalibration}
        alwaysShowStartDots={alwaysShowStartDots}
        onUnlimitedChange={setUnlimitedCalibration}
        onAlwaysShowStartDotsChange={setAlwaysShowStartDots}
        onGrantCalibration={actions.grantCalibration}
        onSetCalibration={actions.setCalibration}
        onSolveComponent={handleSolveComponent}
      />
    </div>
  );
}
