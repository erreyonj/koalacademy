"use client";

import { playNote, resumePiano } from "@/components/keys-lite/piano";
import { useState } from "react";
import {
  NOTCH_BLOCK,
  NOTCH_FLOOR,
  NOTCH_LEDGES,
  NOTCH_POCKET,
  SHIP_R,
  launchVelocity,
  notchStart,
} from "../levels";
import { bandPath, ledgeById, type Ledge } from "../terrain";
import { Sparkles } from "./Sparkles";
import { useTerrainShot } from "./useTerrainShot";

const VIEW_W = 200;
const VIEW_H = 360;

export function CanyonRun() {
  const [spark, setSpark] = useState(false);
  const [hint, setHint] = useState(
    "Pull the floor band. A short pull finds the pocket; a hard pull clears the block.",
  );

  const shot = useTerrainShot({
    ledges: NOTCH_LEDGES,
    start: notchStart(),
    radius: SHIP_R,
    onPullStart: () => resumePiano(),
    onLaunch: () => {
      setSpark(false);
      setHint("Flying…");
    },
    onMiss: () => {
      setSpark(false);
      setHint("Fell away — pull again");
    },
    onLand: (id) => {
      const ledge = ledgeById(NOTCH_LEDGES, id);
      if (ledge) playNote(ledge.pitch);
      if (id === "block") {
        setSpark(true);
        setHint("High block");
      } else if (id === "pocket") {
        setHint("Pocket — pull toward the block");
      } else {
        setHint("Back on the floor band");
      }
      return null;
    },
    launchVelocity: (restingId, pull) => launchVelocity("notch", restingId, pull),
  });

  const { body, phase, pull, pointer } = shot;

  const sagFor = (ledge: Ledge) => {
    const occupied = body.restingOn === ledge.id;
    if (phase === "pulling" && occupied) return 6 + pull * 34;
    if (occupied) return 8;
    return 0;
  };

  const visualY = phase === "pulling" ? body.y + pull * 22 : body.y;

  return (
    <div className="notehead-stage" data-testid="notch-run">
      <div className="notehead-hud">
        <button
          type="button"
          className="notehead-goal-btn"
          data-testid="notch-goal-pitch"
          aria-label="Play goal pitch A4"
          onClick={() => {
            resumePiano();
            playNote(NOTCH_BLOCK.pitch);
          }}
        >
          Goal <strong>{NOTCH_BLOCK.pitch}</strong>
        </button>
        <span>Notch</span>
      </div>
      <div className="notehead-scene">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          data-testid="notch-canvas"
          data-phase={phase}
          role="img"
          aria-label="Notch. Pull a frequency band to launch between the pocket and the high block."
          {...pointer}
        >
          <defs>
            <linearGradient id="notch-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f6e4ea" />
              <stop offset="42%" stopColor="#f48aaa" />
              <stop offset="100%" stopColor="#d62868" />
            </linearGradient>
          </defs>
          <rect width={VIEW_W} height={VIEW_H} fill="url(#notch-sky)" />
          <line className="notehead-guide" x1={8} x2={192} y1={18} y2={18} />
          <path
            className="notehead-terrain"
            d="M 0 40 H 112 V 90 L 68 132 V 156 H 108 V 198 L 150 268 L 78 360 H 0 Z"
          />
          <path className="notehead-terrain" d="M 0 332 L 118 308 L 200 286 V 360 H 0 Z" />
          <rect
            className="notehead-terrain"
            x={NOTCH_BLOCK.x0 - 2}
            y={NOTCH_BLOCK.y}
            width={NOTCH_BLOCK.x1 - NOTCH_BLOCK.x0 + 6}
            height={34}
            data-testid="notch-block"
          />
          <path
            className={`notehead-band${body.restingOn === NOTCH_POCKET.id ? " is-hot" : ""}`}
            d={bandPath(
              NOTCH_POCKET.x0,
              NOTCH_POCKET.x1,
              NOTCH_POCKET.y,
              sagFor(NOTCH_POCKET),
            )}
            data-testid="notch-pocket-band"
            aria-label="Frequency Band"
          />
          <path
            className={`notehead-band${body.restingOn === NOTCH_FLOOR.id ? " is-hot" : ""}`}
            d={bandPath(
              NOTCH_FLOOR.x0,
              NOTCH_FLOOR.x1,
              NOTCH_FLOOR.y,
              sagFor(NOTCH_FLOOR),
            )}
            data-testid="notch-floor-band"
            aria-label="Frequency Band"
          />
          {phase === "flight" && (
            <>
              <circle className="notehead-ring" cx={body.x} cy={visualY} r={14} />
              <circle className="notehead-ring" cx={body.x} cy={visualY} r={22} />
            </>
          )}
          {spark && (
            <Sparkles cx={body.x} cy={visualY} testId="notch-sparkles" />
          )}
          <ellipse
            className="notehead-ship is-lite"
            cx={body.x}
            cy={visualY}
            rx={8}
            ry={6}
            data-testid="notch-ship"
          />
        </svg>
      </div>
      <p className="notehead-hint" data-testid="notch-hint">
        {hint}
      </p>
    </div>
  );
}
