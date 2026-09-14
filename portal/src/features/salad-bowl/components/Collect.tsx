"use client";

import { useEffect, useState, type FormEvent } from "react";
import { fetchResponses } from "../api";
import { allCardsIn, playersMissingCards } from "../engine";
import { cleanText, isSubmittable, normKey } from "../normalize";
import type { SbResponseRow, SbState } from "../types";
import type { SaladBowlSession } from "../useSaladBowl";
import { ActionError, Panel } from "./bits";

/**
 * Free-for-all collection. Students submit their 1–3 cards and can retract
 * a pending one; the host watches quota progress and locks the bowl.
 */
export function Collect({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  return isHost ? (
    <HostProgress session={session} state={state} />
  ) : (
    <StudentEntry session={session} state={state} />
  );
}

function StudentEntry({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mine, setMine] = useState<SbResponseRow[]>([]);

  const quota = state.game.responsesPerPlayer;
  const me = state.players.find((p) => p.id === state.me?.playerId);
  const cardsIn = me?.cardsIn ?? 0;
  const done = cardsIn >= quota;

  useEffect(() => {
    let cancelled = false;
    fetchResponses(state.game.id)
      .then((rows) => {
        if (!cancelled) setMine(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [state.game.id, state.game.version]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || done) return;
    const clean = cleanText(text);
    if (!isSubmittable(clean)) {
      setError("Use 1–60 characters with at least one letter or number.");
      return;
    }
    // Fast local duplicate hint; the server is the real check.
    if (mine.some((r) => normKey(r.text) === normKey(clean) && r.status !== "rejected")) {
      setError("You already put that one in.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await session.send("submit_response", { text: clean });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't add that card.");
      return;
    }
    setText("");
    if (result.status === "flagged") {
      setNotice(
        (result.message as string) ??
          "That one can't go in the bowl — try a different card.",
      );
    } else {
      setNotice("In the bowl!");
    }
  }

  async function retract(id: string) {
    if (busy) return;
    setBusy(true);
    const result = await session.send("retract_response", { responseId: id });
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't remove that card.");
  }

  return (
    <>
      <Panel title={`Your cards (${cardsIn}/${quota})`}>
        {done ? (
          <p className="sb-note" role="status">
            All your cards are in. Waiting on the rest of the class…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="sb-card" style={{ border: 0, padding: 0 }}>
            <label className="sb-field">
              Write a card — a word or short phrase the class could guess
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={60}
                autoComplete="off"
                placeholder="e.g. air guitar"
              />
            </label>
            <ActionError message={error} />
            {notice ? (
              <p className="sb-note" role="status">
                {notice}
              </p>
            ) : null}
            <button
              type="submit"
              className="notation-btn sb-btn-primary sb-btn-wide"
              disabled={busy || !isSubmittable(text)}
            >
              Drop it in the bowl
            </button>
          </form>
        )}
        {mine.length > 0 ? (
          <ul className="sb-list">
            {mine.map((r) => (
              <li key={r.id} data-state={r.status}>
                <span>
                  {r.text}
                  <span className="sb-row-meta">
                    {" "}
                    {r.status === "flagged"
                      ? "— needs a replacement"
                      : r.status === "rejected"
                        ? "— removed by teacher, write another"
                        : r.status === "accepted"
                          ? "— approved"
                          : "— waiting for teacher"}
                  </span>
                </span>
                {r.status === "pending" || r.status === "flagged" ? (
                  <span className="sb-row-actions">
                    <button
                      type="button"
                      className="notation-btn"
                      onClick={() => retract(r.id)}
                    >
                      Remove
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
      <ClassProgress state={state} />
    </>
  );
}

function ClassProgress({ state }: { state: SbState }) {
  const students = state.players.filter((p) => !p.isHost && !p.removed);
  const quota = state.game.responsesPerPlayer;
  const ready = students.filter((p) => p.cardsIn >= quota).length;
  return (
    <Panel title="Class progress">
      <p className="sb-note" role="status">
        {ready} of {students.length} players have all their cards in.
      </p>
      <ul className="sb-list">
        {students.map((p) => (
          <li key={p.id} data-state={p.cardsIn >= quota ? "done" : undefined}>
            <span>{p.displayName}</span>
            <span className="sb-row-meta">
              {p.cardsIn}/{quota}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function HostProgress({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmWaive, setConfirmWaive] = useState(false);
  const missing = playersMissingCards(state);
  const complete = allCardsIn(state);

  async function lock(waive: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("lock_responses", waive ? { waive: true } : {});
    setBusy(false);
    if (!result.ok) {
      if (result.error === "quota_unmet") {
        setConfirmWaive(true);
      } else {
        setError(result.message ?? "Couldn't lock the bowl.");
      }
    }
  }

  return (
    <>
      <ClassProgress state={state} />
      <Panel title="Lock the bowl">
        <p className="sb-note">
          Locking stops new cards. You review everything on the next screen
          before teams are drawn.
        </p>
        <ActionError message={error} />
        {!complete && confirmWaive ? (
          <p className="sb-error" role="alert">
            {missing.length} {missing.length === 1 ? "player" : "players"}{" "}
            still owe cards ({missing.map((p) => p.displayName).join(", ")}).
            Lock anyway?
          </p>
        ) : null}
        <div className="sb-actions">
          <button
            type="button"
            className="notation-btn sb-btn-primary sb-btn-big"
            disabled={busy || (!complete && !confirmWaive)}
            onClick={() => lock(!complete)}
          >
            {complete
              ? "Lock the bowl"
              : confirmWaive
                ? "Lock anyway (waive missing cards)"
                : "Lock the bowl"}
          </button>
          {!complete && !confirmWaive ? (
            <button
              type="button"
              className="notation-btn"
              onClick={() => setConfirmWaive(true)}
            >
              Some players can&apos;t finish…
            </button>
          ) : null}
        </div>
      </Panel>
    </>
  );
}
