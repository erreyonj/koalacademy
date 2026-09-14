"use client";

import { useState } from "react";
import { teamMembers } from "../engine";
import type { SbState } from "../types";
import type { SaladBowlSession } from "../useSaladBowl";
import { ActionError, Panel } from "./bits";

/**
 * Team reveal. Host can reshuffle, move individual students between teams,
 * then lock. Students find their team and color up.
 */
export function Teams({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const isHost = state.me?.isHost ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const myTeam = state.teams.find((t) => t.id === state.me?.teamId);

  async function act(
    type: "randomize_teams" | "move_player" | "lock_teams",
    payload: Record<string, unknown> = {},
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.send(type, payload);
    setBusy(false);
    if (!result.ok) setError(result.message ?? "That didn't work — try again.");
    else setMoving(null);
  }

  return (
    <>
      {!isHost && myTeam ? (
        <Panel>
          <p className="sb-note" role="status" style={{ fontSize: "1.1rem" }}>
            You&apos;re on <strong>{myTeam.name}</strong>.
          </p>
        </Panel>
      ) : null}

      <div className="sb-teams-grid" data-count={state.teams.length}>
        {state.teams.map((team) => (
          <section className="sb-team" key={team.id}>
            <h3>{team.name}</h3>
            <ul className="sb-list">
              {teamMembers(state, team.id).map((p) => (
                <li key={p.id}>
                  <span>{p.displayName}</span>
                  {isHost ? (
                    <span className="sb-row-actions">
                      {moving === p.id ? (
                        state.teams
                          .filter((t) => t.id !== team.id)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="notation-btn"
                              onClick={() =>
                                act("move_player", {
                                  playerId: p.id,
                                  teamId: t.id,
                                })
                              }
                            >
                              → {t.name}
                            </button>
                          ))
                      ) : (
                        <button
                          type="button"
                          className="notation-btn"
                          onClick={() => setMoving(p.id)}
                        >
                          Move
                        </button>
                      )}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isHost ? (
        <Panel title="Happy with the split?">
          <ActionError message={error} />
          <div className="sb-actions">
            <button
              type="button"
              className="notation-btn"
              disabled={busy}
              onClick={() => act("randomize_teams")}
            >
              Reshuffle
            </button>
            <button
              type="button"
              className="notation-btn sb-btn-primary sb-btn-big"
              disabled={busy}
              onClick={() => act("lock_teams")}
            >
              Lock teams &amp; play
            </button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <p className="sb-note">Teacher is finalizing teams…</p>
        </Panel>
      )}
    </>
  );
}
