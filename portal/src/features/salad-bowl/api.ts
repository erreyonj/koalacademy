import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, hasAnonSession } from "@/lib/supabase/client";
import type {
  SbCommandResult,
  SbCommandType,
  SbResponseRow,
  SbSeat,
  SbState,
} from "./types";

/**
 * Feature-scoped data access. Reads go straight to Postgres under RLS;
 * every mutation goes through the salad-bowl Edge Function, which verifies
 * the JWT and calls the service-role-only sb_command.
 */

const SEAT_KEY = "ka-salad-bowl-seat";

export function loadSeat(): SbSeat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SEAT_KEY);
    return raw ? (JSON.parse(raw) as SbSeat) : null;
  } catch {
    return null;
  }
}

export function saveSeat(seat: SbSeat | null): void {
  if (typeof window === "undefined") return;
  try {
    if (seat) window.localStorage.setItem(SEAT_KEY, JSON.stringify(seat));
    else window.localStorage.removeItem(SEAT_KEY);
  } catch {
    // Private-mode storage failures only cost auto-rejoin.
  }
}

function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface CommandOptions {
  /**
   * Provide for commands that must not double-apply on retry (draws,
   * scoring). Omitted commands get a fresh key per call.
   */
  idempotencyKey?: string;
}

export async function command(
  type: SbCommandType,
  payload: Record<string, unknown> = {},
  options: CommandOptions = {},
): Promise<SbCommandResult> {
  const supabase = getSupabase();
  if (!(await hasAnonSession())) {
    return {
      ok: false,
      error: "captcha_required",
      message: "Session expired — refresh the page to verify again.",
    };
  }
  const { data, error } = await supabase.functions.invoke("salad-bowl", {
    body: {
      type,
      payload,
      idempotencyKey: options.idempotencyKey ?? newIdempotencyKey(),
    },
  });
  if (error) {
    return {
      ok: false,
      error: "network",
      message: "Couldn't reach the game server. Check the connection and try again.",
    };
  }
  return data as SbCommandResult;
}

export async function fetchState(gameId: string): Promise<SbState | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("sb_state", { p_game: gameId });
  if (error) throw new Error(error.message);
  const state = data as unknown as SbState | { game: null };
  if (!state || !("game" in state) || state.game == null) return null;
  return state as SbState;
}

/** Rows visible to the caller under RLS: own cards, or everything for host. */
export async function fetchResponses(gameId: string): Promise<SbResponseRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sb_responses")
    .select("id, text, status, flag_reason, submitted_by")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    text: row.text,
    status: row.status,
    flagReason: row.flag_reason,
    submittedBy: row.submitted_by,
  }));
}

/**
 * Private per-game broadcast topic. The payload is only a version tick;
 * subscribers refetch sb_state when it moves past what they hold.
 */
export function subscribeToGame(
  gameId: string,
  handlers: {
    onTick: (version: number) => void;
    onStatus?: (
      status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR",
    ) => void;
  },
): RealtimeChannel {
  const supabase = getSupabase();
  // Private channels require the current JWT on the realtime socket.
  void supabase.realtime.setAuth();
  const channel = supabase
    .channel(`sb:game:${gameId}`, { config: { private: true } })
    .on("broadcast", { event: "state" }, (message) => {
      const v = Number((message.payload as { v?: number })?.v ?? 0);
      handlers.onTick(v);
    })
    .subscribe((status) => handlers.onStatus?.(status));
  return channel;
}

export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  const supabase = getSupabase();
  await supabase.removeChannel(channel);
}
