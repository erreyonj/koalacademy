"use client";

import { useState } from "react";
import { REGIONS, type RegionId } from "../world";
import { CanyonRun } from "./CanyonRun";
import { LaunchSite } from "./LaunchSite";
import { StairCave } from "./StairCave";
import "../notehead.css";

export function NoteheadApp() {
  const [region, setRegion] = useState<RegionId>("launch");

  return (
    <div className="notehead-page" data-testid="notehead-stage" data-region={region}>
      <nav className="notehead-regions" aria-label="Prototype regions">
        {REGIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={region === entry.id ? "is-on" : ""}
            aria-pressed={region === entry.id}
            data-testid={`region-${entry.id}`}
            onClick={() => setRegion(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>
      {region === "launch" && <LaunchSite />}
      {region === "stairs" && <StairCave />}
      {region === "notch" && <CanyonRun />}
    </div>
  );
}
