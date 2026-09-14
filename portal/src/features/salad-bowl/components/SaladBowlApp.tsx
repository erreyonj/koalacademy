"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnonCaptchaGate } from "@/components/AnonCaptchaGate";
import { useSaladBowl } from "../useSaladBowl";
import type { SbState } from "../types";
import type { SaladBowlSession } from "../useSaladBowl";
import { ConnectionBadge, Panel, PauseOverlay } from "./bits";
import { Collect } from "./Collect";
import { Landing } from "./Landing";
import { Lobby } from "./Lobby";
import { Play } from "./Play";
import { Review } from "./Review";
import { Teams } from "./Teams";
import { TeacherBar } from "./TeacherBar";

export function SaladBowlApp() {
  const session = useSaladBowl();
  const params = useSearchParams();
  const prefillCode = (params.get("code") ?? "").toUpperCase().slice(0, 5);

  if (!session.configured) {
    return (
      <Shell session={session} showStatus={false}>
        <Panel title="Not wired up yet">
          <p className="sb-note">
            Salad Bowl needs the Supabase connection. Set{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> for this build (see{" "}
            <code>portal/.env.example</code>).
          </p>
        </Panel>
      </Shell>
    );
  }

  if (!session.ready) {
    if (session.needsCaptcha) {
      return (
        <Shell session={session} showStatus={false}>
          <Panel title="Almost there">
            <AnonCaptchaGate
              key={session.captchaAttempt}
              onToken={(token) => void session.completeCaptcha(token)}
              onError={session.failCaptcha}
            />
            {session.error ? (
              <p className="sb-error" role="alert">
                {session.error}
              </p>
            ) : null}
          </Panel>
        </Shell>
      );
    }
    return (
      <Shell session={session} showStatus={false}>
        <Panel>
          <p className="sb-note" aria-busy="true">
            Warming up…
          </p>
        </Panel>
      </Shell>
    );
  }

  if (!session.seat) {
    return (
      <Shell session={session} showStatus={false}>
        <Landing session={session} prefillCode={prefillCode} />
      </Shell>
    );
  }

  const state = session.state;
  if (!state) {
    return (
      <Shell session={session}>
        <Panel>
          <p className="sb-note" aria-busy="true">
            {session.error ?? "Loading the game…"}
          </p>
          <button
            type="button"
            className="notation-btn"
            onClick={() => session.leaveSeat()}
          >
            Leave game
          </button>
        </Panel>
      </Shell>
    );
  }

  const isHost = state.me?.isHost ?? false;
  const wide = ["teams", "round_intro", "turn_ready", "turn_active", "round_end", "finished"].includes(
    state.game.status,
  );

  return (
    <Shell session={session} state={state} wide={wide}>
      <Screen session={session} state={state} />
      {state.game.isPaused && !isHost ? <PauseOverlay isHost={false} /> : null}
      {isHost ? <TeacherBar session={session} state={state} /> : null}
    </Shell>
  );
}

function Screen({
  session,
  state,
}: {
  session: SaladBowlSession;
  state: SbState;
}) {
  switch (state.game.status) {
    case "lobby":
      return <Lobby session={session} state={state} />;
    case "collecting":
      return <Collect session={session} state={state} />;
    case "reviewing":
      return <Review session={session} state={state} />;
    case "teams":
      return <Teams session={session} state={state} />;
    default:
      return <Play session={session} state={state} />;
  }
}

function Shell({
  session,
  state,
  wide = false,
  showStatus = true,
  children,
}: {
  session: SaladBowlSession;
  state?: SbState;
  wide?: boolean;
  showStatus?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="sb-shell" data-wide={wide}>
      <header className="sb-hero">
        <div>
          <p className="eyebrow">Toolkit · Games</p>
          <h1>
            Salad Bowl
            {state ? (
              <span className="sb-row-meta"> · {state.game.code}</span>
            ) : null}
          </h1>
        </div>
        {showStatus ? (
          <ConnectionBadge connection={session.connection} />
        ) : (
          <Link className="back-link" href="/toolkit/games/">
            ← Games
          </Link>
        )}
      </header>
      {children}
    </div>
  );
}
