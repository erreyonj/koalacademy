"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Ledge, TerrainBody } from "../terrain";
import { stepTerrain } from "../terrain";

const VIEW_H = 360;

type Phase = "idle" | "pulling" | "flight";

export function useTerrainShot({
  ledges,
  start,
  radius,
  onLand,
  onMiss,
  onPullStart,
  onLaunch,
  launchVelocity,
}: {
  ledges: readonly Ledge[];
  start: TerrainBody;
  radius: number;
  /** Return a body to keep flying (a drop onto the next step). */
  onLand: (id: string, body: TerrainBody) => TerrainBody | null;
  onMiss: () => void;
  onPullStart?: () => void;
  onLaunch?: () => void;
  launchVelocity: (restingId: string, pull: number) => { vx: number; vy: number };
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [body, setBody] = useState<TerrainBody>(start);
  const [pull, setPull] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const bodyRef = useRef(body);
  const pullRef = useRef(0);
  const originY = useRef(0);
  const ledgesRef = useRef(ledges);
  const onLandRef = useRef(onLand);
  const onMissRef = useRef(onMiss);
  const onPullStartRef = useRef(onPullStart);
  const onLaunchRef = useRef(onLaunch);
  const launchRef = useRef(launchVelocity);
  const startRef = useRef(start);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    ledgesRef.current = ledges;
    onLandRef.current = onLand;
    onMissRef.current = onMiss;
    onPullStartRef.current = onPullStart;
    onLaunchRef.current = onLaunch;
    launchRef.current = launchVelocity;
    startRef.current = start;
  });

  const kick = useCallback((next: TerrainBody) => {
    bodyRef.current = next;
    setBody(next);
    setPhase("flight");
  }, []);

  useEffect(() => {
    if (phase !== "flight") return;
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      const dt = last ? Math.min(0.032, (ts - last) / 1000) : 0.016;
      last = ts;
      const step = stepTerrain(
        bodyRef.current,
        ledgesRef.current,
        dt,
        radius,
      );
      const next = step.body;
      if (next.y > VIEW_H + 30 || next.x < -30 || next.x > 230) {
        const home = startRef.current;
        bodyRef.current = home;
        setBody(home);
        setPhase("idle");
        onMissRef.current();
        return;
      }
      if (step.landedId) {
        bodyRef.current = next;
        setBody(next);
        const follow = onLandRef.current(step.landedId, next);
        if (follow) {
          bodyRef.current = follow;
          setBody(follow);
          raf = requestAnimationFrame(tick);
          return;
        }
        setPhase("idle");
        return;
      }
      bodyRef.current = next;
      setBody(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, radius]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== "idle" || !bodyRef.current.restingOn) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    originY.current = event.clientY;
    onPullStartRef.current?.();
    pullRef.current = 0;
    setPull(0);
    setPhase("pulling");
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== "pulling") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pxPerUnit = rect.height / VIEW_H;
    const dy = event.clientY - originY.current;
    const depth = Math.max(0, Math.min(1, dy / (pxPerUnit * 70)));
    pullRef.current = depth;
    setPull(depth);
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (phaseRef.current !== "pulling") return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const depth = pullRef.current;
    pullRef.current = 0;
    setPull(0);
    const resting = bodyRef.current.restingOn;
    if (!resting || depth < 0.12) {
      setPhase("idle");
      return;
    }
    const velocity = launchRef.current(resting, depth);
    onLaunchRef.current?.();
    kick({
      ...bodyRef.current,
      ...velocity,
      restingOn: null,
    });
  };

  return {
    phase,
    body,
    pull,
    kick,
    pointer: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
