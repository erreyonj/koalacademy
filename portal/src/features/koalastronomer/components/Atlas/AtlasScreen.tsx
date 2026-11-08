"use client";

import { useState } from "react";
import {
  getAvailableDestinations,
  getRevealedRegions,
  isDestinationUnlocked,
} from "../../engine/atlas-engine";
import type {
  GameState,
  TelescopeDestination,
} from "../../engine/game-state";
import { DestinationCard } from "./DestinationCard";
import { StarMap } from "./StarMap";

interface AtlasScreenProps {
  state: GameState;
  destinations: readonly TelescopeDestination[];
  onSelectDestination: (destinationId: string) => void;
  onNavigateArchive: () => void;
}

export function AtlasScreen({
  state,
  destinations,
  onSelectDestination,
  onNavigateArchive,
}: AtlasScreenProps) {
  const availableDestinations = getAvailableDestinations(destinations, state);
  const defaultDest =
    destinations.find((d) => d.id === state.currentDestinationId) ??
    availableDestinations[0] ??
    destinations[0];

  const [selectedDestId, setSelectedDestId] = useState<string>(defaultDest.id);

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
    state.telescopeDialState !== null;

  return (
    <section
      className="obs-screen obs-atlas-screen"
      aria-label="The Atlas"
      data-testid="atlas-screen"
    >
      <div className="obs-atlas-layout">
        <StarMap
          destinations={destinations}
          completedDestinationIds={state.completedDestinationIds}
          revealedRegions={revealedRegions}
          selectedDestinationId={selectedDest.id}
          onSelectDestination={setSelectedDestId}
        />

        <DestinationCard
          destination={selectedDest}
          isCompleted={isCompleted}
          isUnlocked={isUnlocked}
          isInProgress={isInProgress}
          onObserve={() => onSelectDestination(selectedDest.id)}
          onNavigateArchive={onNavigateArchive}
        />
      </div>
    </section>
  );
}
