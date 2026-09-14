"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatClock, remainingMs } from "../engine";
import type { SbState } from "../types";
import type { SbConnection } from "../useSaladBowl";

export function Panel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="sb-card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

export function ConnectionBadge({ connection }: { connection: SbConnection }) {
  const label =
    connection === "live"
      ? "Live"
      : connection === "polling"
        ? "Syncing"
        : connection === "offline"
          ? "Offline"
          : "Connecting";
  return (
    <span className="sb-status" data-connection={connection} role="status">
      {label}
    </span>
  );
}

/**
 * Shared countdown. Renders from server timestamps corrected by clock skew;
 * `onExpired` fires once when the clock crosses zero (the active device uses
 * it to submit the authoritative end_turn).
 */
export function TurnTimer({
  state,
  skewMs,
  onExpired,
}: {
  state: SbState;
  skewMs: number;
  onExpired?: () => void;
}) {
  const [ms, setMs] = useState(() => remainingMs(state, Date.now(), skewMs));
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [state.turn?.id]);

  useEffect(() => {
    const tick = () => {
      const next = remainingMs(state, Date.now(), skewMs);
      setMs(next);
      if (next <= 0 && !firedRef.current && state.turn?.status === "active") {
        firedRef.current = true;
        onExpired?.();
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [state, skewMs, onExpired]);

  const seconds = Math.ceil(ms / 1000);
  return (
    <div
      className="sb-timer"
      role="timer"
      aria-label={`${seconds} seconds left`}
      data-low={seconds > 0 && seconds <= 10}
      data-zero={seconds <= 0}
    >
      {state.game.isPaused ? "PAUSED" : formatClock(ms)}
    </div>
  );
}

export function BowlCount({ state }: { state: SbState }) {
  if (!state.bowl) return null;
  return (
    <p className="sb-bowlcount" aria-label="Bowl status">
      <span>{state.bowl.inBowl} in the bowl</span>
      <span>{state.bowl.guessed} guessed</span>
    </p>
  );
}

export function PauseOverlay({ isHost }: { isHost: boolean }) {
  return (
    <div className="sb-overlay" role="alertdialog" aria-label="Game paused">
      <h2>Paused</h2>
      <p>
        {isHost
          ? "Resume from the teacher bar below."
          : "Eyes up front — the teacher paused the game."}
      </p>
    </div>
  );
}

/** Inline action error line, cleared by the caller on the next attempt. */
export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="sb-error" role="alert">
      {message}
    </p>
  );
}
