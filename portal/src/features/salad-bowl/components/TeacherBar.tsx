"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { SbState } from "../types";
import type { SaladBowlSession } from "../useSaladBowl";

/**
 * Persistent teacher controls: master pause, undo, skip, end turn, reset
 * round, recovery PIN, and the destructive clear-bowl.
 */
export function TeacherBar({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const status = state.game.status;
  const inRound = ["turn_ready", "turn_active", "round_end"].includes(status);

  async function act(
    type: Parameters<SaladBowlSession["send"]>[0],
    payload: Record<string, unknown> = {},
  ) {
    if (busy) return;
    setBusy(true);
    await session.send(type, payload);
    setBusy(false);
  }

  return (
    <div className="sb-teacherbar" role="toolbar" aria-label="Teacher controls">
      <span className="sb-teacherbar-label">TEACHER</span>

      {state.game.isPaused ? (
        <button
          type="button"
          className="notation-btn sb-btn-primary"
          disabled={busy}
          onClick={() => act("resume")}
        >
          Resume
        </button>
      ) : (
        <button
          type="button"
          className="notation-btn"
          disabled={busy}
          onClick={() => act("pause")}
        >
          Pause
        </button>
      )}

      {status === "turn_active" ? (
        <>
          <button
            type="button"
            className="notation-btn"
            disabled={busy}
            onClick={() => act("undo_last")}
          >
            Undo
          </button>
          <button
            type="button"
            className="notation-btn"
            disabled={busy}
            onClick={() => act("end_turn")}
          >
            End turn
          </button>
        </>
      ) : null}

      {status === "turn_ready" ? (
        <button
          type="button"
          className="notation-btn"
          disabled={busy}
          onClick={() => act("skip_player")}
        >
          Skip player
        </button>
      ) : null}

      {inRound ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="notation-btn" disabled={busy}>
              Reset round
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Round {state.game.round}?</AlertDialogTitle>
              <AlertDialogDescription>
                Every card returns to the bowl and this round&apos;s points are
                wiped. Earlier rounds keep their scores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep playing</AlertDialogCancel>
              <AlertDialogAction onClick={() => act("reset_round")}>
                Reset round
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {session.seat?.recoveryPin ? (
        <button
          type="button"
          className="notation-btn"
          aria-pressed={showPin}
          onClick={() => setShowPin((v) => !v)}
        >
          {showPin ? `PIN ${session.seat.recoveryPin}` : "PIN"}
        </button>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="notation-btn sb-btn-danger"
            disabled={busy}
          >
            Clear bowl
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the bowl?</AlertDialogTitle>
            <AlertDialogDescription>
              Deletes every card, team, and score and returns the whole class
              to the lobby. Players stay joined. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => act("clear_game")}
            >
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
