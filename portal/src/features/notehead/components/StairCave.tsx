"use client";

import { playNote, resumePiano } from "@/components/keys-lite/piano";
import { useCallback, useRef, useState } from "react";
import {
  SHIP_R,
  STAIR_BAND,
  STAIR_LEDGES,
  STAIR_TREADS,
  launchVelocity,
  stairStart,
} from "../levels";
import { bandPath, dropOnto, ledgeById, lowerLedge } from "../terrain";
import { Sparkles } from "./Sparkles";
import { useTerrainShot } from "./useTerrainShot";

const VIEW_W = 200;
const VIEW_H = 360;

export function StairCave() {
  const visitedRef = useRef(new Set<string>());
  const [visited, setVisited] = useState<string[]>([]);
  const [spark, setSpark] = useState(false);
  const [hint, setHint] = useState("Pull the band. A full pull clears every step.");

  const remember = useCallback((id: string) => {
    visitedRef.current.add(id);
    setVisited([...visitedRef.current]);
    return visitedRef.current.size >= STAIR_TREADS.length;
  }, []);

  const shot = useTerrainShot({
    ledges: STAIR_LEDGES,
    start: stairStart(),
    radius: SHIP_R,
    onPullStart: () => resumePiano(),
    onLaunch: () => {
      visitedRef.current = new Set();
      setVisited([]);
      setSpark(false);
      setHint("Down the steps…");
    },
    onMiss: () => {
      visitedRef.current = new Set();
      setVisited([]);
      setSpark(false);
      setHint("Missed the stairs — pull again");
    },
    onLand: (id, body) => {
      const ledge = ledgeById(STAIR_LEDGES, id);
      if (ledge && id !== "band") playNote(ledge.pitch);
      if (!id.startsWith("s")) {
        setHint("Short — pull farther to reach the top");
        return null;
      }
      const cleared = remember(id);
      if (cleared) {
        setSpark(true);
        setHint("Every step");
        return null;
      }
      const from = ledgeById(STAIR_TREADS, id);
      const next = lowerLedge(STAIR_TREADS, id);
      if (from && next) return dropOnto(from, next, body.x, SHIP_R);
      return null;
    },
    launchVelocity: (restingId, pull) => launchVelocity("stairs", restingId, pull),
  });

  const { body, phase, pull, pointer } = shot;
  const visualY = phase === "pulling" ? body.y + pull * 26 : body.y;
  const sag = phase === "pulling" ? pull * 30 : 0;

  return (
    <div className="notehead-stage" data-testid="stair-cave">
      <div className="notehead-hud">
        <button
          type="button"
          className="notehead-goal-btn"
          data-testid="stair-goal-pitch"
          aria-label="Play goal pitch G4"
          onClick={() => {
            resumePiano();
            playNote("G4");
          }}
        >
          Goal <strong>G4</strong>
        </button>
        <span>
          {visited.length}/{STAIR_TREADS.length} steps
        </span>
      </div>
      <div className="notehead-scene">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          data-testid="stair-canvas"
          data-phase={phase}
          role="img"
          aria-label="Stair cave. Pull the band and release so the ship comes down every step."
          {...pointer}
        >
          <defs>
            <linearGradient id="stair-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8eef2" />
              <stop offset="100%" stopColor="#f3c5d4" />
            </linearGradient>
          </defs>
          <rect width={VIEW_W} height={VIEW_H} fill="url(#stair-sky)" />
          <line className="notehead-guide" x1={16} x2={184} y1={22} y2={22} />
          {STAIR_TREADS.map((tread) => (
            <rect
              key={tread.id}
              className="notehead-terrain"
              x={tread.x0}
              y={tread.y}
              width={tread.x1 - tread.x0}
              height={VIEW_H - tread.y}
              data-testid={`stair-${tread.id}`}
              data-visited={visited.includes(tread.id) ? "true" : "false"}
            />
          ))}
          {STAIR_TREADS.map(
            (tread) =>
              visited.includes(tread.id) && (
                <line
                  key={`${tread.id}-mark`}
                  className="notehead-tread-mark"
                  x1={tread.x0}
                  x2={Math.min(tread.x1, tread.x0 + 36)}
                  y1={tread.y + 1.5}
                  y2={tread.y + 1.5}
                />
              ),
          )}
          <path
            className="notehead-band"
            d={bandPath(STAIR_BAND.x0, STAIR_BAND.x1, STAIR_BAND.y, sag)}
            data-testid="stair-band"
            aria-label="Frequency Band"
          />
          {phase === "flight" && (
            <circle className="notehead-ring" cx={body.x} cy={visualY} r={16} />
          )}
          {spark && <Sparkles cx={body.x} cy={visualY} testId="stair-sparkles" />}
          <ellipse
            className="notehead-ship is-lite"
            cx={body.x}
            cy={visualY}
            rx={8}
            ry={6}
            data-testid="stair-ship"
          />
        </svg>
      </div>
      <p className="notehead-hint" data-testid="stair-hint">
        {hint}
      </p>
    </div>
  );
}
