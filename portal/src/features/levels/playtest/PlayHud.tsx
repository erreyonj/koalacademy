"use client";

import { TONATION_CAP, HULL_MAX, type PlaySession } from "../store";
import type { PlaytestState } from "./runtime";

export type WarpBadge = "off" | "ready" | "warping";

export function warpBadge(state: PlaytestState, session: PlaySession): WarpBadge {
  if (state.warp) return "warping";
  return session.anachrometer ? "ready" : "off";
}

/** One line of guidance for what the next input does. */
export function statusLine(state: PlaytestState, session: PlaySession): string {
  if (state.notice) return state.notice;
  if (session.borealisTool) {
    return "Borealis cursor: click to add, click a gem to select, double-click to remove.";
  }
  if (state.warp) return "Warping. Pull and release to launch, or tap to let go.";
  if (state.body.restingOn) return "Drag back and release to launch.";
  return session.anachrometer ? "In flight. Press to warp." : "In flight.";
}

/**
 * The game's HUD, driven by the playtest: Tonation and Hull are the session's
 * display values (nothing in a flight changes them), the counters are the
 * run's own. Reuses the game's classes so it reads like the real thing.
 */
export function PlayHud({
  state,
  session,
  inRoute = false,
}: {
  state: PlaytestState;
  session: PlaySession;
  /** True when more than one level is in play, so Shift+R restarts the route. */
  inRoute?: boolean;
}) {
  const badge = warpBadge(state, session);
  return (
    <div
      className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded bg-zinc-950/80 px-3 py-2"
      data-testid="play-hud"
    >
      <div
        className="notehead-hud"
        style={{ margin: 0, padding: 0, justifyContent: "flex-start" }}
      >
        <div
          className="notehead-tonation"
          role="meter"
          aria-label="Tonation"
          aria-valuemin={0}
          aria-valuemax={TONATION_CAP}
          aria-valuenow={session.tonation}
          data-testid="play-hud-tonation"
        >
          <span>tonation</span>
          <div className="notehead-tonation-track">
            <div
              className="notehead-tonation-fill"
              style={{ width: `${(session.tonation / TONATION_CAP) * 100}%` }}
            />
          </div>
        </div>
        <div
          className="notehead-hull"
          role="meter"
          aria-label="Hull"
          aria-valuemin={0}
          aria-valuemax={HULL_MAX}
          aria-valuenow={session.hull}
          data-testid="play-hud-hull"
        >
          <span>hull</span>
          <div className="notehead-hull-pips">
            {Array.from({ length: HULL_MAX }, (_, index) => (
              <span
                key={index}
                className={
                  index < session.hull
                    ? "notehead-hull-pip is-on"
                    : "notehead-hull-pip"
                }
              />
            ))}
          </div>
        </div>
        <span
          className="notehead-tonation"
          data-testid="play-hud-warp"
          data-badge={badge}
          style={{ opacity: badge === "off" ? 0.45 : 1 }}
        >
          anachrometer {badge}
        </span>
      </div>
      <div
        className="mt-2 font-mono text-[0.72rem] tracking-wide text-zinc-300"
        data-testid="playtest-hud"
      >
        Borealis {state.collected}/{state.total} · shots {state.shots} · hard hits{" "}
        {state.hardHits} · resets {state.resets}
      </div>
      <div className="mt-1 text-xs text-zinc-400" data-testid="play-hud-status">
        {statusLine(state, session)}
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        R restarts{inRoute ? " the level, Shift+R the route" : ""}. Esc or P returns to the editor.
      </div>
    </div>
  );
}
