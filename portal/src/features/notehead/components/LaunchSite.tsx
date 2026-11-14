"use client";

import { playNote, resumePiano } from "@/components/keys-lite/piano";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  beginFlight,
  DEFAULT_GRAVITY,
  DEFAULT_MAX_PULL,
  DEFAULT_MAX_SPEED,
  DEGREE_SPACING,
  evaluateLaunch,
  type FlightState,
  pullToLaunchSpeed,
  stepFlight,
} from "../slingshot";
import {
  createLaunchWorld,
  pitchAtDegree,
  type NoteheadWorld,
} from "../world";
import { Sparkles } from "./Sparkles";

const VIEW_W = 200;
const VIEW_H = 360;
const CRADLE_SVG_Y = 312;
const TOP_PAD = 36;
const SHIP_RX = 14;
const SHIP_RY = 10;

type Phase = "idle" | "pulling" | "flight" | "sparkle";

function pixelsPerDegree(scaleLength: number) {
  const span = Math.max(1, scaleLength - 1);
  return (CRADLE_SVG_Y - TOP_PAD) / span;
}

function physicsToSvgY(y: number, scaleLength: number) {
  return CRADLE_SVG_Y - y * pixelsPerDegree(scaleLength);
}

export function LaunchSite() {
  const [world] = useState<NoteheadWorld>(() => createLaunchWorld(4));
  const [phase, setPhase] = useState<Phase>("idle");
  const [pullDepth, setPullDepth] = useState(0);
  const [flightY, setFlightY] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);
  const [hint, setHint] = useState("Pull the ship down, then release");

  const phaseRef = useRef<Phase>("idle");
  const pullOriginY = useRef(0);
  const pullDepthRef = useRef(0);
  const flightRef = useRef<FlightState | null>(null);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const heardTargetRef = useRef(false);

  const scaleLen = world.scale.length;
  const targetPitch = pitchAtDegree(world.scale, world.targetDegree);

  const announceTarget = useCallback(() => {
    if (!targetPitch) return;
    resumePiano();
    playNote(targetPitch);
    heardTargetRef.current = true;
  }, [targetPitch]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const shipPhysicsY =
    phase === "pulling"
      ? -pullDepth * 0.55
      : phase === "flight" || phase === "sparkle"
        ? flightY
        : 0;
  const shipSvgY = physicsToSvgY(shipPhysicsY, scaleLen);
  const guideSvgY = physicsToSvgY(
    world.targetDegree * DEGREE_SPACING,
    scaleLen,
  );
  // Flat at rest; sag only while the ship is pulled down.
  const bandSag = phase === "pulling" ? pullDepth * 28 : 0;
  const airborne = phase === "flight" || phase === "sparkle";

  const finishLanding = useCallback(
    (state: FlightState) => {
      const result = evaluateLaunch(
        state.apexY,
        world.targetDegree,
        scaleLen,
      );
      setFlightY(0);
      flightRef.current = null;
      if (result.hit) {
        setShowSparkles(true);
        setPhase("sparkle");
        setHint("Locked — try another launch");
        window.setTimeout(() => {
          setShowSparkles(false);
          setPhase("idle");
          setHint("Pull the ship down, then release");
          announceTarget();
        }, 720);
      } else {
        setPhase("idle");
        setHint("Try again — match the guide line at the apex");
        announceTarget();
      }
    },
    [announceTarget, scaleLen, world.targetDegree],
  );

  const runFlight = useCallback(
    (launchSpeed: number) => {
      let state = beginFlight(launchSpeed);
      flightRef.current = state;
      setFlightY(0);
      setPhase("flight");
      setHint("Listening…");
      lastTsRef.current = 0;

      const tick = (ts: number) => {
        if (!flightRef.current) return;
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dt = Math.min(0.032, (ts - lastTsRef.current) / 1000);
        lastTsRef.current = ts;

        state = stepFlight(
          flightRef.current,
          dt,
          DEFAULT_GRAVITY,
          scaleLen,
        );
        flightRef.current = state;
        setFlightY(state.y);

        for (const degree of state.crossedUp) {
          const pitch = pitchAtDegree(world.scale, degree);
          if (pitch) playNote(pitch);
        }

        if (state.phase === "landed") {
          finishLanding(state);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [finishLanding, scaleLen, world.scale],
  );

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== "idle") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pullOriginY.current = e.clientY;
    pullDepthRef.current = 0;
    setPullDepth(0);
    setPhase("pulling");
    setShowSparkles(false);
    if (!heardTargetRef.current) announceTarget();
    else {
      resumePiano();
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== "pulling") return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const pxPerUnit = rect.height / VIEW_H;
    const dyPx = e.clientY - pullOriginY.current;
    const depth = Math.max(0, Math.min(DEFAULT_MAX_PULL, dyPx / (pxPerUnit * 40)));
    pullDepthRef.current = depth;
    setPullDepth(depth);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== "pulling") return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const speed = pullToLaunchSpeed(
      pullDepthRef.current,
      DEFAULT_MAX_PULL,
      DEFAULT_MAX_SPEED,
    );
    pullDepthRef.current = 0;
    setPullDepth(0);
    if (speed < 0.8) {
      setPhase("idle");
      setHint("Pull a little farther, then release");
      return;
    }
    runFlight(speed);
  };

  return (
    <div className="notehead-stage" data-testid="launch-site">
      <div className="notehead-hud">
        <button
          type="button"
          className="notehead-goal-btn"
          data-testid="launch-goal-pitch"
          aria-label={`Play goal pitch ${targetPitch ?? ""}`}
          onClick={announceTarget}
        >
          Goal <strong>{targetPitch}</strong>
        </button>
        <span data-testid="launch-region">{world.regions[0]?.label}</span>
      </div>

      <div className="notehead-scene">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Notehead launch site. Pull the ship down and release to match the goal pitch."
          data-testid="launch-canvas"
          data-phase={phase}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <line
            className="notehead-guide"
            x1={24}
            x2={VIEW_W - 24}
            y1={guideSvgY}
            y2={guideSvgY}
            data-testid="launch-guide"
          />

          <path
            className="notehead-band"
            d={`M 40 ${CRADLE_SVG_Y} Q ${VIEW_W / 2} ${CRADLE_SVG_Y + bandSag} ${VIEW_W - 40} ${CRADLE_SVG_Y}`}
            data-testid="launch-band"
            aria-label="Frequency Band"
          />

          {airborne && (
            <>
              <circle
                className="notehead-ring"
                cx={VIEW_W / 2}
                cy={shipSvgY}
                r={22}
              />
              <circle
                className="notehead-ring"
                cx={VIEW_W / 2}
                cy={shipSvgY}
                r={34}
              />
              <circle
                className="notehead-ring"
                cx={VIEW_W / 2}
                cy={shipSvgY}
                r={46}
              />
            </>
          )}

          {showSparkles && <Sparkles cx={VIEW_W / 2} cy={guideSvgY} />}

          <ellipse
            className="notehead-ship"
            cx={VIEW_W / 2}
            cy={shipSvgY}
            rx={SHIP_RX}
            ry={SHIP_RY}
            data-testid="launch-ship"
            data-y={shipPhysicsY.toFixed(2)}
          />
        </svg>
      </div>

      <p className="notehead-hint" data-testid="launch-hint">
        {hint}
      </p>
    </div>
  );
}
