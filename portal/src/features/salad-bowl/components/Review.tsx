"use client";

import { useEffect, useState } from "react";
import { fetchResponses } from "../api";
import type { SbResponseRow, SbState } from "../types";
import type { SaladBowlSession } from "../useSaladBowl";
import { ActionError, Panel } from "./bits";

/**
 * Teacher moderation. Every free-for-all card passes through here: approve,
 * edit, or reject each one (pending near-duplicates and blocked terms arrive
 * pre-flagged), then draw teams.
 */
export function Review({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  const [rows, setRows] = useState<SbResponseRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [banTerm, setBanTerm] = useState("");

  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    fetchResponses(state.game.id)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isHost, state.game.id, state.game.version]);

  if (!isHost) {
    return (
      <Panel title="Hold tight">
        <p className="sb-note" role="status">
          The teacher is checking the bowl. Teams are next.
        </p>
      </Panel>
    );
  }

  const pending = rows.filter((r) => r.status === "pending");
  const flagged = rows.filter((r) => r.status === "flagged");
  const accepted = rows.filter((r) => r.status === "accepted");
  const playerName = (id: string | null) =>
    id
      ? (state.players.find((p) => p.id === id)?.displayName ?? "?")
      : "Teacher deck";

  async function review(
    responseId: string,
    action: "approve" | "reject" | "edit",
    text?: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("review_response", {
      responseId,
      action,
      ...(text != null ? { text } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error === "duplicate"
          ? "That would duplicate a card already in the bowl."
          : (result.message ?? "Couldn't update that card."),
      );
      return;
    }
    setEditing(null);
  }

  async function approveAll() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("review_response", {
      action: "approve_all_pending",
    });
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't approve.");
  }

  async function addBanned() {
    if (busy || banTerm.trim().length < 2) return;
    setBusy(true);
    setError(null);
    const result = await session.send("add_banned_word", { term: banTerm.trim() });
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't add that term.");
    else setBanTerm("");
  }

  async function drawTeams() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("randomize_teams");
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't draw teams yet.");
  }

  function renderRow(r: SbResponseRow) {
    if (editing?.id === r.id) {
      return (
        <li key={r.id} data-state={r.status}>
          <span style={{ flex: 1 }}>
            <input
              className="sb-field"
              style={{ width: "100%" }}
              value={editing.text}
              maxLength={60}
              onChange={(e) => setEditing({ id: r.id, text: e.target.value })}
              aria-label={`Edit card ${r.text}`}
            />
          </span>
          <span className="sb-row-actions">
            <button
              type="button"
              className="notation-btn sb-btn-primary"
              onClick={() => review(r.id, "edit", editing.text)}
            >
              Save
            </button>
            <button
              type="button"
              className="notation-btn"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </span>
        </li>
      );
    }
    return (
      <li key={r.id} data-state={r.status}>
        <span>
          {r.text}
          <span className="sb-row-meta">
            {" "}
            — {playerName(r.submittedBy)}
            {r.flagReason ? ` · ${r.flagReason}` : ""}
          </span>
        </span>
        <span className="sb-row-actions">
          {r.status !== "accepted" ? (
            <button
              type="button"
              className="notation-btn sb-btn-primary"
              onClick={() => review(r.id, "approve")}
            >
              OK
            </button>
          ) : null}
          <button
            type="button"
            className="notation-btn"
            onClick={() => setEditing({ id: r.id, text: r.text })}
          >
            Edit
          </button>
          <button
            type="button"
            className="notation-btn sb-btn-danger"
            onClick={() => review(r.id, "reject")}
          >
            Cut
          </button>
        </span>
      </li>
    );
  }

  return (
    <>
      <Panel title={`Review the bowl (${accepted.length} approved)`}>
        <ActionError message={error} />
        {flagged.length > 0 ? (
          <>
            <h2>Flagged ({flagged.length})</h2>
            <ul className="sb-list">{flagged.map(renderRow)}</ul>
          </>
        ) : null}
        {pending.length > 0 ? (
          <>
            <h2>Waiting on you ({pending.length})</h2>
            <ul className="sb-list">{pending.map(renderRow)}</ul>
            <button
              type="button"
              className="notation-btn"
              disabled={busy}
              onClick={approveAll}
            >
              Approve all waiting
            </button>
          </>
        ) : null}
        {accepted.length > 0 ? (
          <>
            <h2>In the bowl ({accepted.length})</h2>
            <ul className="sb-list">{accepted.map(renderRow)}</ul>
          </>
        ) : null}
      </Panel>

      <Panel title="Blocked words (this game)">
        <p className="sb-note">
          Add a word to block it and pull any matching cards out of play.
          Spacing, punctuation, and number-for-letter tricks are matched
          automatically.
        </p>
        <div className="sb-actions">
          <input
            className="sb-field"
            value={banTerm}
            maxLength={40}
            onChange={(e) => setBanTerm(e.target.value)}
            aria-label="Word to block"
            placeholder="word to block"
          />
          <button
            type="button"
            className="notation-btn"
            disabled={busy || banTerm.trim().length < 2}
            onClick={addBanned}
          >
            Block it
          </button>
        </div>
      </Panel>

      <Panel title="Draw teams">
        <p className="sb-note">
          Random, balanced teams. You can reshuffle or move students on the
          next screen before locking.
        </p>
        <button
          type="button"
          className="notation-btn sb-btn-primary sb-btn-wide sb-btn-big"
          disabled={busy || accepted.length < 5 || pending.length > 0}
          onClick={drawTeams}
        >
          Draw teams
        </button>
        {pending.length > 0 ? (
          <p className="sb-note">Clear the waiting list first.</p>
        ) : accepted.length < 5 ? (
          <p className="sb-note">Need at least 5 approved cards.</p>
        ) : null}
      </Panel>
    </>
  );
}
