"use client";

import { useState } from "react";
import {
  getAvailableDestinations,
  getRevealedRegions,
  isCampaignWon,
  isDestinationUnlocked,
} from "../../engine/atlas-engine";
import type {
  GameState,
  TelescopeDestination,
} from "../../engine/game-state";
import { LensView } from "../Telescope/LensView";
import { DestinationCard } from "./DestinationCard";
import { StarMap } from "./StarMap";

interface AtlasScreenProps {
  state: GameState;
  destinations: readonly TelescopeDestination[];
  onSelectDestination: (destinationId: string) => void;
  onNavigateArchive: () => void;
  onNewGame?: () => void;
}

export function AtlasScreen({
  state,
  destinations,
  onSelectDestination,
  onNavigateArchive,
  onNewGame,
}: AtlasScreenProps) {
  const availableDestinations = getAvailableDestinations(destinations, state);
  const campaignWon = isCampaignWon(
    state.completedDestinationIds,
    destinations,
  );
  const defaultDest =
    destinations.find((d) => d.id === state.currentDestinationId) ??
    (campaignWon ? destinations[destinations.length - 1] : undefined) ??
    availableDestinations[0] ??
    destinations[0];

  const [selectedDestId, setSelectedDestId] = useState<string>(defaultDest.id);
  const [showLog, setShowLog] = useState(false);

  const handleSelect = (destinationId: string) => {
    setSelectedDestId(destinationId);
    setShowLog(false);
  };

  const selectedDest =
    destinations.find((d) => d.id === selectedDestId) ?? defaultDest;

  const revealedRegions = getRevealedRegions(
    destinations,
    state.completedDestinationIds,
  );

  const isCompleted = state.completedDestinationIds.includes(selectedDest.id);
  const isUnlocked = isDestinationUnlocked(
    selectedDest,
    state.completedDestinationIds,
  );
  const isInProgress =
    state.currentDestinationId === selectedDest.id &&
    state.telescopeProgress !== null;

  return (
    <section
      className="obs-screen obs-atlas-screen"
      aria-label="The Atlas"
      data-testid="atlas-screen"
    >
      <div className="obs-atlas-layout">
        {showLog && isCompleted ? (
          <div className="obs-atlas-lens" data-testid="atlas-sector-lens">
            <LensView
              sectorId={selectedDest.id}
              sectorName={selectedDest.name}
              revealName={selectedDest.revealName}
              lensImage={selectedDest.lensImage}
              lensClipGlobe={selectedDest.lensClipGlobe}
              solvedCount={3}
            />
          </div>
        ) : (
          <StarMap
            destinations={destinations}
            completedDestinationIds={state.completedDestinationIds}
            revealedRegions={revealedRegions}
            selectedDestinationId={selectedDest.id}
            nextDestinationId={availableDestinations[0]?.id ?? null}
            onSelectDestination={handleSelect}
          />
        )}

        <DestinationCard
          destination={selectedDest}
          difficulty={state.difficulty}
          isCompleted={isCompleted}
          isUnlocked={isUnlocked}
          isInProgress={isInProgress}
          showLog={showLog && isCompleted}
          onShowLogChange={setShowLog}
          onObserve={() => onSelectDestination(selectedDest.id)}
          onNavigateArchive={onNavigateArchive}
          onNewGame={campaignWon ? onNewGame : undefined}
        />
      </div>
    </section>
  );
}
