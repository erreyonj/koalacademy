"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isMyTurn,
  roundInfo,
  scoresForRound,
  totalScores,
} from "../engine";
import type { SbState } from "../types";
import type { SaladBowlSession } from "../useSaladBowl";
import { ActionError, BowlCount, Panel, TurnTimer } from "./bits";

/** Round intro, turns, round scoreboard, and final results. */
export function Play({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  switch (state.game.status) {
    case "round_intro":
      return <RoundIntro session={session} state={state} />;
    case "turn_ready":
      return <TurnReady session={session} state={state} />;
    case "turn_active":
      return <TurnActive session={session} state={state} />;
    case "round_end":
      return <RoundEnd session={session} state={state} />;
    case "finished":
      return <Final session={session} state={state} />;
    default:
      return null;
  }
}

function playerName(state: SbState, playerId: string | null | undefined) {
  return (
    state.players.find((p) => p.id === playerId)?.displayName ?? "someone"
  );
}

function teamName(state: SbState, teamId: string | null | undefined) {
  return state.teams.find((t) => t.id === teamId)?.name ?? "a team";
}

function RoundIntro({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const info = roundInfo(state.game.round);
  const isHost = state.me?.isHost ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("begin_round");
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't start the round.");
  }

  return (
    <>
      <Panel title={info.title}>
        <p className="sb-note" style={{ fontSize: "1.05rem" }}>
          {info.rule}
        </p>
        <p className="sb-note">
          Same bowl every round: every card comes back, so listen even when
          it&apos;s not your turn — remembering cards wins Round{" "}
          {state.game.round < 3 ? 3 : 2}.
        </p>
        <p className="sb-note">
          One pass per turn. The clock runs {state.game.turnSeconds} seconds.
        </p>
      </Panel>
      <Scoreboard state={state} />
      {isHost ? (
        <Panel>
          <ActionError message={error} />
          <button
            type="button"
            className="notation-btn sb-btn-primary sb-btn-wide sb-btn-big"
            disabled={busy}
            onClick={begin}
          >
            Start Round {state.game.round}
          </button>
        </Panel>
      ) : null}
    </>
  );
}

function TurnReady({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  const mine = isMyTurn(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = roundInfo(state.game.round);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send(
      "start_turn",
      {},
      { idempotencyKey: `start-${state.game.id}-${state.game.version}` },
    );
    setBusy(false);
    if (!result.ok && result.error !== "bad_state") {
      setError(result.message ?? "Couldn't start the turn.");
    }
  }

  return (
    <>
      <Panel title={info.title}>
        <p className="sb-note" style={{ fontSize: "1.15rem" }} role="status">
          Up next: <strong>{playerName(state, state.upNext?.playerId)}</strong>{" "}
          for <strong>{teamName(state, state.upNext?.teamId)}</strong>.
        </p>
        <BowlCount state={state} />
        {mine ? (
          <>
            <p className="sb-note">
              Your iPad is the bowl. When you tap start, the first card and
              the clock appear — keep the screen where only you can see it.
            </p>
            <ActionError message={error} />
            <button
              type="button"
              className="notation-btn sb-btn-primary sb-btn-wide sb-btn-big"
              disabled={busy}
              onClick={start}
            >
              Start my turn
            </button>
          </>
        ) : (
          <p className="sb-note">
            {isHost
              ? "Start it from their iPad, or use the button below if theirs is stuck."
              : "Get ready to guess when the clock starts."}
          </p>
        )}
        {isHost && !mine ? (
          <>
            <ActionError message={error} />
            <div className="sb-actions">
              <button
                type="button"
                className="notation-btn"
                disabled={busy}
                onClick={start}
              >
                Start for them
              </button>
            </div>
          </>
        ) : null}
      </Panel>
      <Scoreboard state={state} />
    </>
  );
}

function TurnActive({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  const turn = state.turn;
  const mine = turn?.status === "active" && turn.playerId === state.me?.playerId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Card text from the last local command response beats waiting on a refetch.
  // Clear when the server card changes (e.g. teacher Foul / next on another device).
  const [liveCard, setLiveCard] = useState<string | null>(null);
  const turnIdRef = useRef<string | null>(null);
  const serverCardRef = useRef<string | null>(null);
  if (turn && turnIdRef.current !== turn.id) {
    turnIdRef.current = turn.id;
    serverCardRef.current = turn.cardText;
    setLiveCard(null);
  } else if (turn && turn.cardText !== serverCardRef.current) {
    serverCardRef.current = turn.cardText;
    setLiveCard(null);
  }

  const act = useCallback(
    async (type: "mark_correct" | "pass_card" | "end_turn", idem: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      const result = await session.send(
        type,
        {},
        { idempotencyKey: idem },
      );
      setBusy(false);
      if (!result.ok) {
        if (result.error === "time_up") {
          setError("Time! The card goes back in the bowl.");
        } else if (result.error !== "bad_state" && result.error !== "no_turn") {
          setError(result.message ?? "That didn't register — try again.");
        }
        return;
      }
      if (typeof result.card === "string") setLiveCard(result.card);
    },
    [busy, session],
  );

  // The active device reports expiry; the server validates against its own
  // clock. Idempotency key pins one end_turn per turn.
  const onExpired = useCallback(() => {
    if (turn && (mine || isHost)) {
      void act("end_turn", `end-${turn.id}`);
    }
  }, [turn, mine, isHost, act]);

  // Correct/pass need a fresh key per tap, but stable across retries of the
  // same tap: generate on tap.
  const tapKey = () =>
    `${turn?.id}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

  if (!turn) return null;
  const cardText = liveCard ?? turn.cardText;

  return (
    <>
      <TurnTimer state={state} skewMs={session.skewMs} onExpired={onExpired} />
      {mine || (isHost && cardText != null) ? (
        <>
          <div className="sb-clue" aria-live="polite">
            {cardText ?? "…"}
          </div>
          <ActionError message={error} />
          <div className="sb-actions">
            <button
              type="button"
              className="notation-btn sb-btn-primary sb-btn-big"
              style={{ flex: 2 }}
              disabled={busy || state.game.isPaused}
              onClick={() => act("mark_correct", tapKey())}
            >
              Got it! (+1)
            </button>
            <button
              type="button"
              className="notation-btn sb-btn-big"
              style={{ flex: 1 }}
              disabled={busy || turn.passUsed || state.game.isPaused}
              onClick={() => act("pass_card", tapKey())}
            >
              {turn.passUsed ? "Pass used" : "Pass (1)"}
            </button>
          </div>
          <p className="sb-note" role="status">
            {turn.points} this turn ·{" "}
            {playerName(state, turn.playerId)} giving clues for{" "}
            {teamName(state, turn.teamId)}
          </p>
        </>
      ) : (
        <Panel>
          <p className="sb-note" style={{ fontSize: "1.2rem" }} role="status">
            <strong>{playerName(state, turn.playerId)}</strong> is giving
            clues — <strong>{teamName(state, turn.teamId)}</strong>, shout
            your guesses!
          </p>
          <p className="sb-note" role="status">
            {turn.points} scored this turn.
          </p>
        </Panel>
      )}
      <BowlCount state={state} />
      <Scoreboard state={state} compact />
    </>
  );
}

function RoundEnd({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roundScores = scoresForRound(state, state.game.round);

  async function next() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("next_round");
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't continue.");
  }

  return (
    <>
      <Panel title={`Round ${state.game.round} — bowl empty!`}>
        <ul className="sb-list">
          {roundScores.map(({ team, points }) => (
            <li key={team.id}>
              <span>{team.name}</span>
              <span className="sb-team-score">{points}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Scoreboard state={state} />
      {isHost ? (
        <Panel>
          <ActionError message={error} />
          <button
            type="button"
            className="notation-btn sb-btn-primary sb-btn-wide sb-btn-big"
            disabled={busy}
            onClick={next}
          >
            {state.game.round >= 3 ? "Final scores" : `On to Round ${state.game.round + 1}`}
          </button>
        </Panel>
      ) : null}
    </>
  );
}

function Final({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  const totals = totalScores(state);
  const winner = totals[0];
  const tie = totals.length > 1 && totals[1].points === winner?.points;

  return (
    <>
      <Panel title="Final scores">
        <p className="sb-note" style={{ fontSize: "1.3rem" }} role="status">
          {tie ? (
            <strong>It&apos;s a tie!</strong>
          ) : (
            <>
              <strong>{winner?.team.name}</strong> takes it!
            </>
          )}
        </p>
        <ul className="sb-list">
          {totals.map(({ team, points }) => (
            <li key={team.id}>
              <span>{team.name}</span>
              <span className="sb-team-score">{points}</span>
            </li>
          ))}
        </ul>
      </Panel>
      {isHost ? (
        <Panel title="Play again?">
          <p className="sb-note">
            &ldquo;Clear the bowl&rdquo; in the teacher bar wipes all cards,
            teams, and scores but keeps everyone joined — straight back to the
            lobby for a rematch.
          </p>
        </Panel>
      ) : null}
    </>
  );
}

function Scoreboard({
  state,
  compact = false,
}: {
  state: SbState;
  compact?: boolean;
}) {
  const totals = totalScores(state);
  if (totals.length === 0) return null;
  if (compact) {
    return (
      <p className="sb-bowlcount" aria-label="Scores">
        {totals.map(({ team, points }) => (
          <span key={team.id}>
            {team.name}: {points}
          </span>
        ))}
      </p>
    );
  }
  return (
    <Panel title="Scores so far">
      <ul className="sb-list">
        {totals.map(({ team, points }) => (
          <li key={team.id}>
            <span>{team.name}</span>
            <span className="sb-team-score">{points}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
