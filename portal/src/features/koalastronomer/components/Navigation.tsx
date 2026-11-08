"use client";

import type { Screen } from "../engine/game-state";

interface NavigationProps {
  currentScreen: Screen;
  hasActiveObservation: boolean;
  onNavigate: (screen: Screen) => void;
}

const SCREEN_TITLES: Record<Screen, string> = {
  intro: "Koalastronomer",
  archive: "The Archive",
  atlas: "The Atlas",
  "telescope-briefing": "Telescope Briefing",
  telescope: "Telescope",
};

export function Navigation({
  currentScreen,
  hasActiveObservation,
  onNavigate,
}: NavigationProps) {
  const isTelescopeActive =
    currentScreen === "telescope" || currentScreen === "telescope-briefing";

  return (
    <header className="obs-topbar">
      <nav className="obs-screen-tabs" aria-label="Observatory navigation">
        <button
          type="button"
          className={`obs-tab-btn${currentScreen === "archive" ? " is-active" : ""}`}
          onClick={() => onNavigate("archive")}
          data-testid="nav-archive"
        >
          Archive
        </button>
        <button
          type="button"
          className={`obs-tab-btn${currentScreen === "atlas" ? " is-active" : ""}`}
          onClick={() => onNavigate("atlas")}
          data-testid="nav-atlas"
        >
          Atlas
        </button>
        {hasActiveObservation && (
          <button
            type="button"
            className={`obs-tab-btn${isTelescopeActive ? " is-active" : ""}`}
            onClick={() => onNavigate("telescope")}
            data-testid="nav-telescope"
          >
            Telescope
          </button>
        )}
      </nav>

      <div className="obs-title-plaque" data-testid="screen-title-plaque">
        <span className="obs-plaque-star" aria-hidden="true">
          ✦
        </span>
        <h1 className="obs-plaque-heading">{SCREEN_TITLES[currentScreen]}</h1>
        <span className="obs-plaque-star" aria-hidden="true">
          ✦
        </span>
      </div>
    </header>
  );
}
