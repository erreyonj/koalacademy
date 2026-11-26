"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "../../notehead/notehead.css";
import { Band } from "../../notehead/components/Band";
import { BorealisMark } from "../../notehead/components/Borealis";
import { ExitMark } from "../../notehead/components/ExitZone";
import { Ship, type ShipLook } from "../../notehead/components/Ship";
import { Trajectory } from "../../notehead/components/Trajectory";
import {
  WARP_BAND_ID,
  WARP_TIME_SCALE,
  wholePulseAmount,
} from "../../notehead/modules/anachrometer";
import { REST_GLOW } from "../../notehead/modules/momentum";
import { FIXED_DT, toSvg } from "../../notehead/modules/sim";
import { previewLevel } from "../adapter";
import { bandEndsView, exitSegmentView, outerRect, scaleOf, viewSizeOf } from "../geometry";
import type { Action, PlaySession } from "../store";
import type { LevelFile, Pt } from "../types";
import { cursorAction } from "./cursor";
import { PlayHud } from "./PlayHud";
import { arrive, buildRouteScenes, enterLevel } from "./route";
import {
  advance,
  canEngageWarp,
  chartShot,
  createState,
  engageWarpState,
  fire,
  resetState,
  syncExtras,
  tickBorealis,
  withExtras,
  type PlaytestScene,
  type PlaytestState,
} from "./runtime";

/** Longest frame the loop will catch up on (seconds), so a hidden tab does not fast-forward. */
const MAX_FRAME = 0.1;

interface Pull {
  /** Pointer-down point, view space. */
  from: Pt;
  /** Drag in logical space (+y up). */
  drag: Pt;
}

interface Frame {
  state: PlaytestState;
  /** Hull bleach while warping, 0..1 (wall-clock, like the game's). */
  whole: number;
}

function pathOf(points: readonly Pt[], closed = false): string {
  if (points.length === 0) return "";
  return (
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") +
    (closed ? " Z" : "")
  );
}

function lookFor(state: PlaytestState, whole: number): ShipLook {
  const { vx, vy } = state.body;
  const speed = Math.hypot(vx, vy);
  const glow =
    speed < 60
      ? REST_GLOW
      : {
          ...REST_GLOW,
          angle: Math.atan2(-vy, vx),
          lift: Math.max(-1, Math.min(1, vy / 620)),
          energy: Math.min(1, speed / 1500),
        };
  return { glow, clock: state.clock, still: false, whole };
}

/**
 * Runs a level in a sandbox: the game's physics over the level's own terrain,
 * bands, Borealis and exits. It reads nothing from, and writes nothing to, the
 * game's regions or progress. Drag anywhere to pull back, release to launch
 * from the ledge the ship rests on; with the Anachrometer on, press mid-flight
 * to slow the world and aim from the air. With the Borealis cursor, click adds
 * a gem, a click on one selects it and a double-click removes it. `R`
 * restarts the level, Shift+R restarts the route from its first level.
 * Leaving is the host's job.
 *
 * With a route (`levels`), an exit with a `to` target is a door: the ship
 * flies on into that level with its counters, and Borealis added during play
 * stay behind with the level they were added in.
 */
export function PlaytestView({
  levels,
  startIndex,
  session,
  dispatch,
  onExit,
}: {
  levels: readonly LevelFile[];
  startIndex: number;
  session: PlaySession;
  dispatch: (action: Action) => void;
  onExit: () => void;
}) {
  const routeScenes = useMemo(() => buildRouteScenes(levels), [levels]);
  const [index, setIndex] = useState(startIndex);
  const level = levels[index] ?? levels[startIndex]!;
  const base = routeScenes.get(level.id) ?? null;
  const scene = useMemo(
    () => (base ? withExtras(base, session.extraBorealis) : null),
    [base, session.extraBorealis],
  );
  const preview = useMemo(() => previewLevel(level), [level]);
  const view = level.view;
  const size = viewSizeOf(view);
  const outer = outerRect(view);

  const svgRef = useRef<SVGSVGElement>(null);
  const stateRef = useRef<PlaytestState | null>(null);
  const pullRef = useRef<Pull | null>(null);
  const warpStartRef = useRef(0);
  const indexRef = useRef(index);
  // A state built by travel, waiting for the level swap to render.
  const pendingRef = useRef<{ id: string } | null>(null);
  // The loop and handlers read the latest scene and session without re-subscribing.
  const sceneRef = useRef(scene);
  const sessionRef = useRef(session);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [pull, setPull] = useState<Pull | null>(null);

  useEffect(() => {
    sceneRef.current = scene;
    sessionRef.current = session;
  }, [scene, session]);

  // A fresh run only when the level itself changes (travel brings its own).
  useEffect(() => {
    indexRef.current = index;
    if (pendingRef.current?.id === level.id) pendingRef.current = null;
    else stateRef.current = base ? createState(sceneRef.current ?? base) : null;
    pullRef.current = null;
    setPull(null);
    setFrame(stateRef.current ? { state: stateRef.current, whole: 0 } : null);
  }, [base, index, level.id]);

  /**
   * Put the ship in `target` (a level index) with a ready state. The
   * session's added Borealis belong to the level they were added in, so a
   * change of level drops them.
   */
  function switchLevel(
    target: number,
    make: (scene: PlaytestScene) => PlaytestState,
  ): boolean {
    const next = levels[target];
    const scene = next ? routeScenes.get(next.id) : null;
    if (!next || !scene) return false;
    const changed = target !== indexRef.current;
    if (changed) {
      dispatch({ type: "gem", op: "clear" });
      sceneRef.current = scene;
      pendingRef.current = { id: next.id };
      indexRef.current = target;
      setIndex(target);
    }
    stateRef.current = make(changed ? scene : (sceneRef.current ?? scene));
    pullRef.current = null;
    setPull(null);
    return true;
  }

  // Added Borealis join, move or leave the running flight without a reset.
  useEffect(() => {
    if (!stateRef.current) return;
    stateRef.current = syncExtras(stateRef.current, session.extraBorealis);
  }, [session.extraBorealis]);

  // Fixed-step loop on refs, one React render per frame. While a warp is held
  // the ship runs at WARP_TIME_SCALE and the Borealis keep real time.
  useEffect(() => {
    if (!base) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const real = Math.min(MAX_FRAME, (now - last) / 1000);
      last = now;
      const live = sceneRef.current;
      let current = stateRef.current;
      if (current && live) {
        const warping = current.warp !== null;
        acc += real * (warping ? WARP_TIME_SCALE : 1);
        while (acc >= FIXED_DT) {
          acc -= FIXED_DT;
          current = advance(live, current, { gems: current.warp === null });
          if (current.departed) break;
        }
        if (current.departed) {
          const here = levels[indexRef.current]!;
          const arrival = arrive(levels, routeScenes, here, current.departed, current.body);
          const before = current;
          if ("error" in arrival) {
            current = resetState(live, { ...before, departed: null }, arrival.error);
          } else {
            const prev = before;
            const ok = switchLevel(arrival.index, (scene) =>
              enterLevel(scene, prev, arrival.body, `Entered ${levels[arrival.index]!.id}`),
            );
            current = ok ? stateRef.current! : resetState(live, { ...before, departed: null });
          }
          acc = 0;
        }
        if (current.warp) {
          current = tickBorealis(current, real);
          if (warpStartRef.current === 0) warpStartRef.current = now;
        } else {
          warpStartRef.current = 0;
        }
        stateRef.current = current;
        const whole = current.warp ? wholePulseAmount((now - warpStartRef.current) / 1000) : 0;
        setFrame({ state: current, whole });
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
    // `switchLevel` only reads refs and stable props; the loop restarts per level.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, levels, routeScenes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const live = sceneRef.current;
      const run = stateRef.current;
      if (e.key.toLowerCase() !== "r" || !live || !run) return;
      e.preventDefault();
      if (e.shiftKey && indexRef.current !== startIndex) {
        const prev = run;
        switchLevel(startIndex, (scene) => ({
          ...enterLevel(scene, prev, scene.start),
          resets: prev.resets + 1,
        }));
        return;
      }
      stateRef.current = resetState(live, run);
      pullRef.current = null;
      setPull(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels, routeScenes, startIndex]);

  function viewPoint(e: { clientX: number; clientY: number }): Pt {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return {
      x: inv.a * e.clientX + inv.c * e.clientY + inv.e,
      y: inv.b * e.clientX + inv.d * e.clientY + inv.f,
    };
  }

  function dragOf(from: Pt, to: Pt): Pt {
    const { sx, sy } = scaleOf(view);
    return { x: (to.x - from.x) * sx, y: -(to.y - from.y) * sy };
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || !scene || session.borealisTool) return;
    let current = stateRef.current;
    if (!current || current.cleared || current.departed) return;
    if (!current.body.restingOn) {
      // Mid-flight: only an Anachrometer warp opens an aim.
      if (!canEngageWarp(current, session.anachrometer)) return;
      current = engageWarpState(current, session.anachrometer);
      stateRef.current = current;
      warpStartRef.current = 0;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers have nothing to capture.
    }
    const next = { from: viewPoint(e), drag: { x: 0, y: 0 } };
    pullRef.current = next;
    setPull(next);
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const active = pullRef.current;
    if (!active) return;
    const next = { from: active.from, drag: dragOf(active.from, viewPoint(e)) };
    pullRef.current = next;
    setPull(next);
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const active = pullRef.current;
    if (!active || !scene) return;
    pullRef.current = null;
    setPull(null);
    const drag = dragOf(active.from, viewPoint(e));
    if (stateRef.current) stateRef.current = fire(scene, stateRef.current, drag);
  }

  /** Borealis cursor: click adds or selects, double-click removes. */
  function onClick(e: ReactMouseEvent<SVGSVGElement>) {
    if (!session.borealisTool) return;
    const action = cursorAction(view, session.extraBorealis, viewPoint(e), e.detail);
    if (action.kind === "add") dispatch({ type: "gem", op: "add", x: action.x, y: action.y });
    else if (action.kind === "select") dispatch({ type: "session", patch: { selectedGem: action.id } });
    else if (action.kind === "remove") dispatch({ type: "gem", op: "remove", id: action.id });
  }

  const state = frame?.state ?? null;
  if (!scene || !state) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        This level cannot be played yet.
      </div>
    );
  }

  const pad = 14;
  const box = {
    x: outer.x0 - pad,
    y: outer.y0 - pad,
    w: outer.x1 - outer.x0 + pad * 2,
    h: outer.y1 - outer.y0 + pad * 2,
  };
  const ship = toSvg(state.body.x, state.body.y, scene.regionId);
  const chart =
    pull && (state.body.restingOn || state.warp)
      ? chartShot(scene, state.body, pull.drag, state.warp ? WARP_BAND_ID : null)
      : null;
  const remaining = state.total - state.collected;
  const exitLit = remaining === 0;

  return (
    <div
      className="notehead-page relative"
      style={{ minHeight: 0, height: "100%", display: "block" }}
      data-testid="playtest"
      data-cleared={state.cleared}
      data-level-id={level.id}
    >
      <svg
        ref={svgRef}
        data-testid="playtest-canvas"
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        width="100%"
        height="100%"
        style={{ touchAction: "none", display: "block", cursor: session.borealisTool ? "crosshair" : state.body.restingOn || state.warp ? "grab" : "default" }}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <rect
          x={outer.x0}
          y={outer.y0}
          width={outer.x1 - outer.x0}
          height={outer.y1 - outer.y0}
          fill="#05080f"
        />
        <rect x={0} y={0} width={size.w} height={size.h} fill="#0b111d" />

        <g pointerEvents="none">
          {preview.masses.map((mass) => (
            <g key={mass.id} data-testid={`play-${mass.id}`}>
              <path className="notehead-terrain" d={pathOf(mass.outline, true)} />
              {mass.ticks.length > 0 && (
                <path className="notehead-terrain-tick" d={mass.ticks.map((t) => pathOf(t)).join(" ")} />
              )}
            </g>
          ))}

          {preview.ledges.map((ledge) => {
            const [a, b] = bandEndsView(view, ledge);
            const flat = ledge.kind === "band" && !ledge.slope;
            const hot = state.body.restingOn === ledge.id;
            return flat ? (
              <Band
                key={ledge.id}
                x0={a.x}
                x1={b.x}
                y={a.y}
                sag={{ x: 0, y: hot ? 1.5 : 0 }}
                hot={hot}
                testId={`play-band-${ledge.id}`}
              />
            ) : (
              <line
                key={ledge.id}
                className={ledge.kind === "band" ? "notehead-band" : "notehead-tread"}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={ledge.kind === "block" ? 3.4 : undefined}
              />
            );
          })}

          {state.borealis.map((gem) => (
            <BorealisMark
              key={gem.id}
              x={gem.x}
              y={gem.y}
              pitch={gem.pitch}
              collected={gem.collected}
              regionId={scene.regionId}
              testId={`play-borealis-${gem.id}`}
            />
          ))}

          {level.exits.map((exit) => {
            const [a, b] = exitSegmentView(view, exit);
            const zone = preview.exitZones.find((z) => z.id === exit.id)?.zone ?? null;
            // A door to another level is never locked by Borealis.
            const lit = exitLit || exit.to !== undefined;
            return (
              <g key={exit.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#c4a0f5"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={lit ? 0.8 : 0.2}
                />
                {zone && <ExitMark zone={zone} lit={lit} />}
              </g>
            );
          })}

          {state.warp && (() => {
            const [a, b] = bandEndsView(view, state.warp);
            return <Band x0={a.x} x1={b.x} y={a.y} sag={{ x: 0, y: 0 }} hot testId="play-warp-band" />;
          })()}

          {session.selectedGem &&
            (() => {
              const gem = state.borealis.find((g) => g.id === session.selectedGem);
              if (!gem) return null;
              const at = toSvg(gem.x, gem.y, scene.regionId);
              return (
                <circle
                  cx={at.x}
                  cy={at.y}
                  r={6}
                  fill="none"
                  stroke="#9fd4ff"
                  strokeWidth={0.6}
                  strokeDasharray="1.5 1.5"
                  data-testid="play-gem-selected"
                />
              );
            })()}

          {chart && <Trajectory points={chart.points} apex={chart.apex} regionId={scene.regionId} />}
          {pull && (
            <line
              x1={ship.x}
              y1={ship.y}
              x2={ship.x - (pull.drag.x / scaleOf(view).sx)}
              y2={ship.y + (pull.drag.y / scaleOf(view).sy)}
              stroke="#9fd4ff"
              strokeWidth={0.6}
              strokeDasharray="1.5 1.5"
              opacity={0.7}
            />
          )}

          <Ship
            cx={ship.x}
            cy={ship.y}
            rx={size.w > size.h ? 10 : 8}
            ry={size.w > size.h ? 7 : 6}
            look={lookFor(state, frame?.whole ?? 0)}
            testId="playtest-ship"
            regionId={scene.regionId}
          />
        </g>
      </svg>

      <PlayHud
        state={state}
        session={session}
        levelId={level.id}
        levelIndex={index}
        levelCount={levels.length}
      />

      {state.cleared && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70">
          <div className="rounded border border-emerald-400/60 bg-zinc-900 px-6 py-5 text-center text-zinc-100" data-testid="playtest-cleared">
            <div className="text-lg font-semibold text-emerald-200">Level cleared</div>
            <div className="mt-1 font-mono text-xs text-zinc-400">
              {state.shots} shots · {state.hardHits} hard hits · {state.resets} resets
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
                onClick={() => {
                  if (index !== startIndex) {
                    switchLevel(startIndex, (scene) => createState(scene));
                    return;
                  }
                  const live = sceneRef.current;
                  if (live) stateRef.current = createState(live);
                }}
              >
                Play again
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
                onClick={onExit}
              >
                Back to editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
