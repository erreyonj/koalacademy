import type { SbState } from "./types";

/**
 * Pure game logic shared by screens and unit tests. The server is the
 * authority; everything here only interprets sb_state for display.
 */

export const ROUNDS = [
  {
    round: 1,
    title: "Round 1 — Describe",
    rule: "Say anything except the words on the card. No rhymes-with, no spelling.",
  },
  {
    round: 2,
    title: "Round 2 — Charades",
    rule: "Act it out. No words, no sounds, no pointing at objects in the room.",
  },
  {
    round: 3,
    title: "Round 3 — One Word",
    rule: "Say exactly one word. Choose it well — that's all you get.",
  },
] as const;

export function roundInfo(round: number) {
  return ROUNDS[Math.min(Math.max(round, 1), 3) - 1];
}

/**
 * Milliseconds left on the active turn, from the server timestamps. While
 * the game is master-paused the frozen remainder wins. `skewMs` corrects the
 * device clock against serverTime captured at fetch.
 */
export function remainingMs(
  state: Pick<SbState, "game" | "turn">,
  nowMs: number,
  skewMs = 0,
): number {
  const turn = state.turn;
  if (!turn || turn.status !== "active") return 0;
  if (state.game.isPaused && turn.remainingMs != null) {
    return Math.max(0, turn.remainingMs);
  }
  const ends = Date.parse(turn.endsAt);
  if (Number.isNaN(ends)) return 0;
  return Math.max(0, ends - (nowMs + skewMs));
}

/** Device-clock skew: positive when the device clock runs behind the server. */
export function clockSkewMs(serverTimeIso: string, fetchedAtMs: number): number {
  const server = Date.parse(serverTimeIso);
  if (Number.isNaN(server)) return 0;
  return server - fetchedAtMs;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Total points per team across all rounds so far. */
export function totalScores(state: Pick<SbState, "teams" | "scores">) {
  const totals = new Map<string, number>(state.teams.map((t) => [t.id, 0]));
  for (const s of state.scores) {
    totals.set(s.teamId, (totals.get(s.teamId) ?? 0) + s.points);
  }
  return state.teams
    .map((t) => ({ team: t, points: totals.get(t.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.team.position - b.team.position);
}

export function scoresForRound(
  state: Pick<SbState, "teams" | "scores">,
  round: number,
) {
  return state.teams.map((t) => ({
    team: t,
    points:
      state.scores.find((s) => s.teamId === t.id && s.round === round)
        ?.points ?? 0,
  }));
}

/** The player whose turn is coming (turn_ready) or running (turn_active). */
export function activePlayerId(state: SbState): string | null {
  if (state.game.status === "turn_active") {
    return state.turn?.status === "active" ? state.turn.playerId : null;
  }
  if (state.game.status === "turn_ready") {
    return state.upNext?.playerId ?? null;
  }
  return null;
}

export function isMyTurn(state: SbState): boolean {
  return (
    state.me != null &&
    activePlayerId(state) != null &&
    activePlayerId(state) === state.me.playerId
  );
}

/** Non-host, non-removed players still owing cards (lobby quota display). */
export function playersMissingCards(state: SbState) {
  return state.players.filter(
    (p) =>
      !p.isHost && !p.removed && p.cardsIn < state.game.responsesPerPlayer,
  );
}

/**
 * Whether every required slot is in, matching the server's lock_responses
 * check — the lock button enables without a waiver only when this is true.
 */
export function allCardsIn(state: SbState): boolean {
  return playersMissingCards(state).length === 0;
}

export function teamMembers(state: SbState, teamId: string) {
  return state.players
    .filter((p) => p.teamId === teamId && !p.removed)
    .sort(
      (a, b) =>
        (a.teamOrder ?? 0) - (b.teamOrder ?? 0) || a.id.localeCompare(b.id),
    );
}

/** Largest minus smallest team size — the server round-robin keeps this <= 1. */
export function teamSizeSpread(state: SbState): number {
  const sizes = state.teams.map((t) => teamMembers(state, t.id).length);
  if (sizes.length === 0) return 0;
  return Math.max(...sizes) - Math.min(...sizes);
}
