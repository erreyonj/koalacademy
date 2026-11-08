"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playNote, resumePiano } from "@/components/keys-lite/piano";
import { DESTINATIONS } from "../data/destinations";
import { completeChallenge } from "../engine/archive-engine";
import {
  createInitialState,
  type Difficulty,
  type GameState,
  type NoteLetter,
  parseSavedGameState,
  type Screen,
  STORAGE_KEY,
  serializeGameState,
} from "../engine/game-state";
import { ascendingIntervalPitches } from "../engine/intervals";
import {
  applyDialMovement,
  completeObservation,
  type DialDirection,
  type DialName,
  openTelescopeBriefing,
  resetCurrentObservation,
  startObservation,
} from "../engine/telescope-engine";

const SAVE_DEBOUNCE_MS = 120;

function writeStateToStorage(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeGameState(state));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function playRecoveredInterval(
  firstNote: NoteLetter,
  secondNote: NoteLetter,
): [string, string] {
  const [firstPitch, secondPitch] = ascendingIntervalPitches(
    firstNote,
    secondNote,
  );
  resumePiano();
  playNote(firstPitch);
  window.setTimeout(() => {
    playNote(secondPitch);
  }, 360);
  return [firstPitch, secondPitch];
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const hydratedRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  // Load saved state from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setState(parseSavedGameState(raw));
    }
    hydratedRef.current = true;
  }, []);

  // Debounced persistence + immediate sync helper
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      writeStateToStorage(state);
      debounceTimerRef.current = null;
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state]);

  const updateState = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setState((prev) => {
        const next = updater(prev);
        if (hydratedRef.current) {
          writeStateToStorage(next);
        }
        return next;
      });
    },
    [],
  );

  const handleSetDifficulty = useCallback(
    (difficulty: Difficulty) => {
      updateState((prev) => ({ ...prev, difficulty }));
    },
    [updateState],
  );

  const handleEnterObservatory = useCallback(() => {
    resumePiano();
    updateState((prev) => ({ ...prev, currentScreen: "atlas" }));
  }, [updateState]);

  const handleChallengeComplete = useCallback(
    (challengeId: string, intervalValue: number) => {
      updateState((prev) =>
        completeChallenge(prev, challengeId, intervalValue),
      );
    },
    [updateState],
  );

  const handleSelectObservation = useCallback(
    (destinationId: string) => {
      const destination = DESTINATIONS.find((d) => d.id === destinationId);
      if (!destination) return;
      resumePiano();
      updateState((prev) => openTelescopeBriefing(prev, destination));
    },
    [updateState],
  );

  const handleBeginCalibration = useCallback(
    (destinationId?: string) => {
      resumePiano();
      updateState((prev) => {
        const targetId = destinationId ?? prev.currentDestinationId;
        const destination = DESTINATIONS.find((d) => d.id === targetId);
        if (!destination) return prev;
        return startObservation(prev, destination);
      });
    },
    [updateState],
  );

  const handleDialMove = useCallback(
    (
      dial: DialName,
      direction: DialDirection,
      options?: { free?: boolean },
    ) => {
      resumePiano();
      updateState((prev) => {
        const funded =
          options?.free && prev.calibrationPoints < 1
            ? { ...prev, calibrationPoints: 999 }
            : prev;
        const moved = applyDialMovement(funded, dial, direction);
        const restored =
          options?.free && moved !== funded
            ? {
                ...moved,
                // Keep economy display topped up; spent still tracks for budget UI.
                calibrationPoints: Math.max(moved.calibrationPoints, 999),
              }
            : moved;
        const destination = DESTINATIONS.find(
          (d) => d.id === restored.currentDestinationId,
        );
        if (
          destination &&
          restored.telescopeDialState &&
          restored.telescopeDialState.range ===
            destination.targetConfiguration.range &&
          restored.telescopeDialState.focus ===
            destination.targetConfiguration.focus &&
          restored.telescopeDialState.alignment ===
            destination.targetConfiguration.alignment &&
          !restored.completedDestinationIds.includes(destination.id)
        ) {
          return {
            ...restored,
            completedDestinationIds: [
              ...restored.completedDestinationIds,
              destination.id,
            ],
          };
        }
        return restored;
      });
    },
    [updateState],
  );

  const handleGrantCalibration = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount === 0) return;
      updateState((prev) => ({
        ...prev,
        calibrationPoints: Math.max(
          0,
          Math.floor(prev.calibrationPoints + amount),
        ),
      }));
    },
    [updateState],
  );

  const handleSetCalibration = useCallback(
    (points: number) => {
      if (!Number.isFinite(points)) return;
      updateState((prev) => ({
        ...prev,
        calibrationPoints: Math.max(0, Math.floor(points)),
      }));
    },
    [updateState],
  );

  const handleResetDials = useCallback(() => {
    updateState((prev) => {
      const destination = DESTINATIONS.find(
        (d) => d.id === prev.currentDestinationId,
      );
      if (!destination) return prev;
      return resetCurrentObservation(prev, destination, prev.difficulty);
    });
  }, [updateState]);

  const handleObservationComplete = useCallback(() => {
    updateState((prev) =>
      prev.currentDestinationId
        ? completeObservation(prev, prev.currentDestinationId)
        : prev,
    );
  }, [updateState]);

  const handleNavigate = useCallback(
    (screen: Screen) => {
      updateState((prev) => {
        if (
          (screen === "telescope" || screen === "telescope-briefing") &&
          (!prev.currentDestinationId || !prev.telescopeDialState)
        ) {
          return prev;
        }
        return { ...prev, currentScreen: screen };
      });
    },
    [updateState],
  );

  const handleResetGame = useCallback(() => {
    setState((prev) => {
      const fresh = createInitialState(prev.difficulty);
      writeStateToStorage(fresh);
      return fresh;
    });
  }, []);

  return {
    state,
    actions: {
      setDifficulty: handleSetDifficulty,
      enterObservatory: handleEnterObservatory,
      challengeComplete: handleChallengeComplete,
      selectObservation: handleSelectObservation,
      beginCalibration: handleBeginCalibration,
      dialMove: handleDialMove,
      grantCalibration: handleGrantCalibration,
      setCalibration: handleSetCalibration,
      resetDials: handleResetDials,
      observationComplete: handleObservationComplete,
      navigate: handleNavigate,
      resetGame: handleResetGame,
    },
  };
}
