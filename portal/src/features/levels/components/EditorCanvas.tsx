"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "../../notehead/notehead.css";
import { Band } from "../../notehead/components/Band";
import { BorealisMark } from "../../notehead/components/Borealis";
import { ExitMark } from "../../notehead/components/ExitZone";
import { previewLevel } from "../adapter";
import {
  bandEndsView,
  exitSegmentView,
  fromView,
  outerRect,
  toView,
  viewSizeOf,
} from "../geometry";
import type { EditorState, EditorStore } from "../store";
import { TOOLS, makeCtx, pointerDown, pointerMove, pointerUp, type HostEnv } from "../tools";
import { VELOCITY_PER_UNIT } from "../tools/gestures";
import type { LevelView, Pt } from "../types";

const PICK_PX = 9;
const ACCENT = "#ffe27a";
const DRAWN = "#9fd4ff";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function fitBox(view: LevelView): Box {
  const r = outerRect(view);
  // Just enough air around the bleed outline that handles at the edge stay reachable.
  const pad = 6;
  return { x: r.x0 - pad, y: r.y0 - pad, w: r.x1 - r.x0 + pad * 2, h: r.y1 - r.y0 + pad * 2 };
}

function pathOf(points: readonly Pt[], closed = false): string {
  if (points.length === 0) return "";
  return (
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") +
    (closed ? " Z" : "")
  );
}

const HINTS: Record<string, string> = {
  select: "Click to pick, drag to move, Delete removes, F flips a terrain line, Esc clears.",
  terrain:
    "Click to add points. Click the first point or press Enter to finish. Backspace drops a point. Alt-click starts a new line over rock. Rock sits on the right of the line you draw.",
  band: "Drag to draw a ledge. Drag an end to resize (Shift tilts it). Drag the body to move it.",
  borealis: "Click to place the next gem. Drag to move. Shift-drag onto another gem to reorder.",
  "enter-exit-enter": "Click to place the ship, drag out to aim its launch velocity. Press E for exits.",
  "enter-exit-exit": "Click near the top, right, or bottom edge, drag along it to set the span. Press E for enter.",
};

export function EditorCanvas({
  store,
  state,
  zoomKey,
}: {
  store: EditorStore;
  state: EditorState;
  /** Bump to refit the view. */
  zoomKey: number;
}) {
  const { level } = state;
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<Box>(() => fitBox(level.view));
  const boxRef = useRef(box);
  boxRef.current = box;
  const spaceRef = useRef(false);
  const [space, setSpace] = useState(false);
  const pan = useRef<{ cx: number; cy: number; box: Box; scale: number } | null>(null);
  const [panning, setPanning] = useState(false);

  useEffect(() => {
    setBox(fitBox(level.view));
  }, [level.view, zoomKey]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && /^(input|textarea|select|button)$/i.test(t.tagName)) return;
      e.preventDefault();
      spaceRef.current = true;
      setSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceRef.current = false;
      setSpace(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const at = pt.matrixTransform(ctm.inverse());
      const b = boxRef.current;
      const home = fitBox(store.getState().level.view);
      const factor = Math.exp(e.deltaY * 0.0015);
      const w = Math.min(home.w * 4, Math.max(home.w / 10, b.w * factor));
      const f = w / b.w;
      setBox({
        x: at.x - (at.x - b.x) * f,
        y: at.y - (at.y - b.y) * f,
        w,
        h: b.h * f,
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [store]);

  const ticks = !(state.gesture && state.gesture.kind.startsWith("terrain"));
  const preview = useMemo(() => previewLevel(level, { ticks }), [level, ticks]);
  const size = viewSizeOf(level.view);
  const outer = outerRect(level.view);

  function scaleOf(): number {
    return svgRef.current?.getScreenCTM()?.a ?? 1;
  }

  function viewPoint(e: { clientX: number; clientY: number }): Pt {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const at = pt.matrixTransform(ctm.inverse());
    return { x: at.x, y: at.y };
  }

  function envFor(e: ReactPointerEvent): HostEnv {
    return {
      tolerance: PICK_PX / scaleOf(),
      mods: { shift: e.shiftKey, alt: e.altKey, meta: e.metaKey || e.ctrlKey },
    };
  }

  function logical(e: ReactPointerEvent): Pt {
    return fromView(store.getState().level.view, viewPoint(e));
  }

  function capture(e: ReactPointerEvent<SVGSVGElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers (tests, automation) have nothing to capture.
    }
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault();
      capture(e);
      pan.current = { cx: e.clientX, cy: e.clientY, box: boxRef.current, scale: scaleOf() };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    capture(e);
    pointerDown(store, envFor(e), logical(e));
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const p = pan.current;
    if (p) {
      setBox({
        ...p.box,
        x: p.box.x - (e.clientX - p.cx) / p.scale,
        y: p.box.y - (e.clientY - p.cy) / p.scale,
      });
      return;
    }
    pointerMove(store, envFor(e), logical(e));
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (pan.current) {
      pan.current = null;
      setPanning(false);
      return;
    }
    pointerUp(store, envFor(e), logical(e));
  }

  const ghost = TOOLS[state.tool].ghost?.(makeCtx(store, { tolerance: PICK_PX / scaleOf() }));
  const view = level.view;
  const { layers, selection } = state;
  const hintKey =
    state.tool === "enter-exit" ? `enter-exit-${state.options.enterExit.mode}` : state.tool;
  const hover = state.hover;

  const grid = state.options.grid;
  const gridPath = useMemo(() => {
    if (grid <= 0) return "";
    const parts: string[] = [];
    for (let x = 0; x <= size.w; x += grid) parts.push(`M ${x} 0 L ${x} ${size.h}`);
    for (let y = 0; y <= size.h; y += grid) parts.push(`M 0 ${y} L ${size.w} ${y}`);
    return parts.join(" ");
  }, [grid, size.w, size.h]);

  const dim = (id: keyof typeof layers) => (layers[id].locked ? 0.55 : 1);
  const cursor = space ? (panning ? "grabbing" : "grab") : TOOLS[state.tool].cursor;
  const showHandles = state.tool === "terrain" || state.tool === "select";

  const selected = (kind: string, id: string) => selection?.kind === kind && selection.id === id;

  return (
    <div
      className="notehead-page"
      style={{ minHeight: 0, height: "100%", display: "block", position: "relative" }}
    >
      <svg
        ref={svgRef}
        data-testid="level-canvas"
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        width="100%"
        height="100%"
        style={{ cursor, touchAction: "none", display: "block" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Bleed area the game draws rock into, then the playable frame. */}
        <rect
          x={outer.x0}
          y={outer.y0}
          width={outer.x1 - outer.x0}
          height={outer.y1 - outer.y0}
          fill="#05080f"
          stroke="#2a3548"
          strokeWidth={0.6}
          strokeDasharray="2 2"
        />
        <rect x={0} y={0} width={size.w} height={size.h} fill="#0b111d" />
        {gridPath && <path d={gridPath} stroke="#7f93ad" strokeWidth={0.12} opacity={0.35} fill="none" />}

        {/* Rock */}
        {layers.terrain.visible && (
          <g opacity={dim("terrain")} pointerEvents="none">
            {preview.masses.map((mass) => (
              <g key={mass.id} data-testid={mass.id}>
                <path className="notehead-terrain" d={pathOf(mass.outline, true)} />
                {mass.ticks.length > 0 && (
                  <path
                    className="notehead-terrain-tick"
                    d={mass.ticks.map((t) => pathOf(t)).join(" ")}
                  />
                )}
              </g>
            ))}
            {level.terrain.map((shape) => {
              const pts = shape.points.map((p) => toView(view, p));
              const on = selected("terrain", shape.id);
              return (
                <g key={shape.id}>
                  <path
                    d={pathOf(pts, shape.closed)}
                    fill="none"
                    stroke={on ? ACCENT : DRAWN}
                    strokeWidth={on ? 1.1 : 0.7}
                    opacity={on ? 1 : 0.6}
                    strokeLinejoin="round"
                  />
                  {(on || showHandles) &&
                    pts.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={on && selection?.vertex === i ? 2.4 : 1.5}
                        fill={on && selection?.vertex === i ? ACCENT : "#0b111d"}
                        stroke={on ? ACCENT : DRAWN}
                        strokeWidth={0.7}
                      />
                    ))}
                </g>
              );
            })}
          </g>
        )}

        {/* Ledges */}
        {layers.band.visible && (
          <g opacity={dim("band")} pointerEvents="none">
            {preview.ledges.map((ledge) => {
              const [a, b] = bandEndsView(view, ledge);
              const on = selected("band", ledge.id);
              const flat = ledge.kind === "band" && !ledge.slope;
              return (
                <g key={ledge.id} data-testid={ledge.id}>
                  {flat ? (
                    <Band x0={a.x} x1={b.x} y={a.y} sag={{ x: 0, y: 0 }} testId={`band-${ledge.id}`} />
                  ) : (
                    <line
                      className={ledge.kind === "band" ? "notehead-band" : "notehead-tread"}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      strokeWidth={ledge.kind === "block" ? 3.4 : undefined}
                    />
                  )}
                  {on && (
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ACCENT} strokeWidth={0.9} opacity={0.9} />
                  )}
                  {(on || state.tool === "band" || state.tool === "select") &&
                    [a, b].map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={on ? 2.4 : 1.8} fill="#0b111d" stroke={on ? ACCENT : "#8fb4c4"} strokeWidth={0.8} />
                    ))}
                  {ledge.kind !== "band" && (
                    <text
                      x={(a.x + b.x) / 2}
                      y={Math.min(a.y, b.y) - 3}
                      fontSize={4.4}
                      textAnchor="middle"
                      fill={on ? ACCENT : "#c5d4de"}
                      fontFamily="ui-monospace, monospace"
                    >
                      {ledge.kind}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Borealis */}
        {layers.borealis.visible && (
          <g opacity={dim("borealis")} pointerEvents="none">
            {preview.borealis.map((gem, index) => {
              const at = toView(view, gem);
              const on = selected("borealis", gem.id);
              return (
                <g key={gem.id}>
                  <BorealisMark
                    x={gem.x}
                    y={gem.y}
                    pitch={gem.pitch}
                    collected={false}
                    regionId={preview.regionId}
                    testId={`borealis-${gem.id}`}
                  />
                  <circle cx={at.x} cy={at.y} r={on ? 6 : 4.2} fill="none" stroke={on ? ACCENT : "#9fd4ff"} strokeWidth={0.7} opacity={0.9} />
                  <circle cx={at.x + 6.5} cy={at.y - 6.5} r={3.1} fill="#0b111d" stroke={ACCENT} strokeWidth={0.6} />
                  <text x={at.x + 6.5} y={at.y - 5.1} fontSize={4} textAnchor="middle" fill={ACCENT} fontFamily="ui-monospace, monospace">
                    {index + 1}
                  </text>
                  <text x={at.x} y={at.y + 10} fontSize={4.2} textAnchor="middle" fill="#c5d4de" fontFamily="ui-monospace, monospace">
                    {gem.pitch}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Exits + enter */}
        {layers.enterExit.visible && (
          <g opacity={dim("enterExit")} pointerEvents="none">
            {level.exits.map((exit) => {
              const [a, b] = exitSegmentView(view, exit);
              const on = selected("exit", exit.id);
              const zone = preview.exitZones.find((z) => z.id === exit.id)?.zone ?? null;
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              return (
                <g key={exit.id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={on ? ACCENT : "#c4a0f5"}
                    strokeWidth={on ? 2.6 : 2}
                    strokeLinecap="round"
                    opacity={0.75}
                  />
                  {zone ? (
                    <ExitMark zone={zone} lit />
                  ) : (
                    <g className="notehead-exit">
                      <path
                        className="notehead-exit-arrow"
                        d={`M ${mid.x - 10} ${mid.y - 22} L ${mid.x} ${mid.y - 10} L ${mid.x + 10} ${mid.y - 22}`}
                      />
                    </g>
                  )}
                </g>
              );
            })}
            {level.enter && (() => {
              const at = toView(view, level.enter);
              const tip = toView(view, {
                x: level.enter.x + level.enter.vx / VELOCITY_PER_UNIT,
                y: level.enter.y + level.enter.vy / VELOCITY_PER_UNIT,
              });
              const len = Math.hypot(tip.x - at.x, tip.y - at.y);
              const on = selected("enter", "enter");
              const ang = Math.atan2(tip.y - at.y, tip.x - at.x);
              const head = (side: number) => ({
                x: tip.x - Math.cos(ang + side) * 4,
                y: tip.y - Math.sin(ang + side) * 4,
              });
              const h1 = head(0.45);
              const h2 = head(-0.45);
              return (
                <g>
                  {len > 1 && (
                    <path
                      d={`M ${at.x} ${at.y} L ${tip.x} ${tip.y} M ${h1.x} ${h1.y} L ${tip.x} ${tip.y} L ${h2.x} ${h2.y}`}
                      fill="none"
                      stroke={on ? ACCENT : "#8fb4c4"}
                      strokeWidth={0.9}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  <circle cx={at.x} cy={at.y} r={3.4} fill="#0b111d" stroke={on ? ACCENT : "#8fb4c4"} strokeWidth={1} />
                  <circle cx={at.x} cy={at.y} r={1.1} fill={on ? ACCENT : "#eaf2fb"} />
                  <text x={at.x} y={at.y - 6} fontSize={4.2} textAnchor="middle" fill="#c5d4de" fontFamily="ui-monospace, monospace">
                    enter
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Draft + tool ghost */}
        {ghost}

        {/* Playable frame outline on top so rock bleed never hides it. */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="none" stroke="#5f7aa0" strokeWidth={0.5} pointerEvents="none" />
      </svg>

      <div className="pointer-events-none absolute left-2 top-2 max-w-[28rem] rounded bg-black/60 px-2 py-1 text-[11px] leading-snug text-zinc-200">
        {HINTS[hintKey]}
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-zinc-300">
        {hover
          ? `x ${Math.round(hover.x)}  y ${Math.round(hover.y)}`
          : "x -  y -"}
        {"  "}
        {level.view}
      </div>
    </div>
  );
}
