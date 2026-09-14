"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ensureAnonSession,
  hasAnonSession,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { isTurnstileConfigured } from "@/lib/turnstile/config";
import {
  command,
  fetchState,
  loadSeat,
  saveSeat,
  subscribeToGame,
  unsubscribe,
} from "./api";
import { clockSkewMs } from "./engine";
import type {
  SbCommandResult,
  SbCommandType,
  SbSeat,
  SbState,
} from "./types";

export type SbConnection = "connecting" | "live" | "polling" | "offline";

/** Refetch cadence: fast while realtime is down, slow drift-guard when live. */
const POLL_MS_FALLBACK = 3000;
const POLL_MS_LIVE = 20000;

export interface SaladBowlSession {
  configured: boolean;
  ready: boolean;
  /** Waiting on an invisible Turnstile token before the first anonymous sign-in. */
  needsCaptcha: boolean;
  /** Increment to remount the Turnstile widget after a failed verification. */
  captchaAttempt: number;
  seat: SbSeat | null;
  state: SbState | null;
  connection: SbConnection;
  /** Device-clock correction for the shared timer. */
  skewMs: number;
  error: string | null;
  completeCaptcha: (token: string) => Promise<void>;
  failCaptcha: (message: string) => void;
  send: (
    type: SbCommandType,
    payload?: Record<string, unknown>,
    options?: { idempotencyKey?: string },
  ) => Promise<SbCommandResult>;
  takeSeat: (seat: SbSeat) => void;
  leaveSeat: () => void;
  refetch: () => Promise<void>;
}

export function useSaladBowl(): SaladBowlSession {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const [seat, setSeat] = useState<SbSeat | null>(null);
  const [state, setState] = useState<SbState | null>(null);
  const [connection, setConnection] = useState<SbConnection>("connecting");
  const [skewMs, setSkewMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const versionRef = useRef(0);
  const seatRef = useRef<SbSeat | null>(null);
  const fetchingRef = useRef(false);
  seatRef.current = seat;

  const finishBoot = useCallback(() => {
    const stored = loadSeat();
    if (stored) setSeat(stored);
    setReady(true);
    setNeedsCaptcha(false);
  }, []);

  const refetch = useCallback(async () => {
    const current = seatRef.current;
    if (!current || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const fetchedAt = Date.now();
      const next = await fetchState(current.gameId);
      if (seatRef.current?.gameId !== current.gameId) return;
      if (!next) {
        // Expired, deleted, or this device was removed from the game.
        setSeat(null);
        saveSeat(null);
        setState(null);
        return;
      }
      versionRef.current = Math.max(versionRef.current, next.game.version);
      setSkewMs(clockSkewMs(next.serverTime, fetchedAt));
      setState(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the game.");
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const failCaptcha = useCallback((message: string) => {
    setError(message);
    setCaptchaAttempt((n) => n + 1);
  }, []);

  const completeCaptcha = useCallback(
    async (token: string) => {
      try {
        await ensureAnonSession(token);
        setError(null);
        finishBoot();
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        setError(
          code === "captcha_failed"
            ? "Verification failed — trying again…"
            : "Couldn't start a session. Refresh and try again.",
        );
        setCaptchaAttempt((n) => n + 1);
      }
    },
    [finishBoot],
  );

  // Boot: reuse stored session, or Turnstile → anonymous sign-in, or direct
  // anonymous sign-in when CAPTCHA is disabled locally.
  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (await hasAnonSession()) {
          if (!cancelled) finishBoot();
          return;
        }
        if (isTurnstileConfigured()) {
          if (!cancelled) setNeedsCaptcha(true);
          return;
        }
        await ensureAnonSession();
        if (!cancelled) finishBoot();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't start a session.",
          );
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, finishBoot]);

  // Realtime subscription + polling fallback for the current seat.
  useEffect(() => {
    if (!seat) {
      setState(null);
      setConnection("connecting");
      versionRef.current = 0;
      return;
    }
    let channel: RealtimeChannel | null = null;
    let live = false;
    let disposed = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const schedulePoll = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(
        () => void refetch(),
        live ? POLL_MS_LIVE : POLL_MS_FALLBACK,
      );
    };

    void refetch();
    channel = subscribeToGame(seat.gameId, {
      onTick: (version) => {
        if (version > versionRef.current) void refetch();
      },
      onStatus: (status) => {
        if (disposed) return;
        live = status === "SUBSCRIBED";
        setConnection(live ? "live" : "polling");
        schedulePoll();
        if (live) void refetch();
      },
    });
    setConnection("connecting");
    schedulePoll();

    // Sleep/lock/background recovery: refetch the authoritative state as
    // soon as the tab is usable again instead of trusting a stale countdown.
    const onWake = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    const onOnline = () => {
      setConnection((prev) => (prev === "offline" ? "polling" : prev));
      void refetch();
    };
    const onOffline = () => setConnection("offline");
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("pageshow", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      disposed = true;
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("pageshow", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (channel) void unsubscribe(channel);
    };
  }, [seat, refetch]);

  const send = useCallback(
    async (
      type: SbCommandType,
      payload: Record<string, unknown> = {},
      options: { idempotencyKey?: string } = {},
    ): Promise<SbCommandResult> => {
      const current = seatRef.current;
      const body =
        current && !("gameId" in payload)
          ? { gameId: current.gameId, ...payload }
          : payload;
      const result = await command(type, body, options);
      // Commands drive a broadcast tick, but refetch immediately so the
      // acting device never waits on the socket round-trip.
      if (result.ok) void refetch();
      return result;
    },
    [refetch],
  );

  const takeSeat = useCallback((next: SbSeat) => {
    versionRef.current = 0;
    setSeat(next);
    saveSeat(next);
  }, []);

  const leaveSeat = useCallback(() => {
    setSeat(null);
    saveSeat(null);
    setState(null);
    versionRef.current = 0;
  }, []);

  return useMemo(
    () => ({
      configured,
      ready,
      needsCaptcha,
      captchaAttempt,
      seat,
      state,
      connection,
      skewMs,
      error,
      completeCaptcha,
      failCaptcha,
      send,
      takeSeat,
      leaveSeat,
      refetch,
    }),
    [
      configured,
      ready,
      needsCaptcha,
      captchaAttempt,
      seat,
      state,
      connection,
      skewMs,
      error,
      completeCaptcha,
      failCaptcha,
      send,
      takeSeat,
      leaveSeat,
      refetch,
    ],
  );
}
