"use client";

import { useState } from "react";
import { ActionError, Panel } from "./bits";
import type { SaladBowlSession } from "../useSaladBowl";
import type { SbState } from "../types";

/**
 * Name lobby. Students see who's in; the host opens submissions (free-for-
 * all) or pastes the Koala/Music deck and locks it (teacher deck).
 */
export function Lobby({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  const students = state.players.filter((p) => !p.isHost && !p.removed);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(type: "open_submissions" | "remove_player", payload = {}) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send(type, payload);
    setBusy(false);
    if (!result.ok) setError(result.message ?? "That didn't work — try again.");
  }

  return (
    <>
      <Panel title="Join code">
        <div className="sb-code" aria-label={`Game code ${state.game.code.split("").join(" ")}`}>
          {state.game.code}
        </div>
        <p className="sb-note">
          Everyone opens Toolkit → Games → Salad Bowl on their iPad and joins
          with this code.
        </p>
      </Panel>

      <Panel title={`Players (${students.length})`}>
        {students.length === 0 ? (
          <p className="sb-note">Waiting for the first player…</p>
        ) : (
          <ul className="sb-list">
            {students.map((p) => (
              <li key={p.id}>
                <span>{p.displayName}</span>
                {isHost ? (
                  <span className="sb-row-actions">
                    <button
                      type="button"
                      className="notation-btn"
                      onClick={() => act("remove_player", { playerId: p.id })}
                    >
                      Remove
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {isHost ? (
        state.game.mode === "free_for_all" ? (
          <Panel title="Ready?">
            <p className="sb-note">
              Each student writes {state.game.responsesPerPlayer}{" "}
              {state.game.responsesPerPlayer === 1 ? "card" : "cards"} once you
              open the bowl.
            </p>
            <ActionError message={error} />
            <button
              type="button"
              className="notation-btn sb-btn-primary sb-btn-wide sb-btn-big"
              disabled={busy || students.length < 2}
              onClick={() => act("open_submissions")}
            >
              Open the bowl for cards
            </button>
            {students.length < 2 ? (
              <p className="sb-note">Need at least 2 players.</p>
            ) : null}
          </Panel>
        ) : (
          <DeckEditor session={session} state={state} />
        )
      ) : (
        <Panel>
          <p className="sb-note">
            You&apos;re in! Waiting for the teacher to start…
          </p>
        </Panel>
      )}
    </>
  );
}

function DeckEditor({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const [deck, setDeck] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ added: number; skipped: number } | null>(
    null,
  );
  const students = state.players.filter((p) => !p.isHost && !p.removed);

  const lines = deck
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  async function saveDeck() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("set_deck", { items: lines });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't save the deck.");
      return;
    }
    setSaved({
      added: result.added as number,
      skipped: result.skipped as number,
    });
  }

  async function lockDeck() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send("lock_responses");
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Save the deck first.");
  }

  return (
    <Panel title="Koala / Music deck">
      <p className="sb-note">
        One card per line — song sections, drum sounds, theory terms, Koala
        moves, class in-jokes. Duplicates collapse automatically.
      </p>
      <label className="sb-field">
        Deck ({lines.length} {lines.length === 1 ? "line" : "lines"})
        <textarea
          value={deck}
          onChange={(e) => {
            setDeck(e.target.value);
            setSaved(null);
          }}
          placeholder={"quarter note\nkick drum\nchorus\nresample\n808"}
        />
      </label>
      <ActionError message={error} />
      {saved ? (
        <p className="sb-note" role="status">
          Saved {saved.added} cards
          {saved.skipped > 0 ? ` (${saved.skipped} skipped as duplicates/blank)` : ""}.
        </p>
      ) : null}
      <div className="sb-actions">
        <button
          type="button"
          className="notation-btn"
          disabled={busy || lines.length === 0}
          onClick={saveDeck}
        >
          Save deck
        </button>
        <button
          type="button"
          className="notation-btn sb-btn-primary"
          disabled={busy || !saved || saved.added === 0 || students.length < 2}
          onClick={lockDeck}
        >
          Lock deck &amp; continue
        </button>
      </div>
      {students.length < 2 ? (
        <p className="sb-note">Need at least 2 players before continuing.</p>
      ) : null}
    </Panel>
  );
}
