"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ControlMode,
  DialName,
  Difficulty,
} from "../../engine/game-state";
import { RING_METADATA } from "../../engine/telescope-engine";
import {
  availableNeighbors,
  createTraceState,
  extendTrace,
  isComplete,
  isStuck,
  type TraceEdge,
  type TraceFigure,
  type TraceState,
} from "../../engine/trace-engine";

/** How close (in viewBox units) a sliding finger must come to a dot to reach it. */
const DRAG_SNAP_RADIUS = 10;

interface TracePuzzleProps {
  ring: DialName;
  figure: TraceFigure;
  cost: number;
  difficulty: Difficulty;
  calibrationPoints: number;
  unlimitedCalibration?: boolean;
  lineHint: TraceEdge | null;
  failedTracePenalty?: number;
  controlMode?: ControlMode;
  onSolve: (ring: DialName) => void;
  onStuck: (ring: DialName) => void;
  /** Live path progress for the active collar turn animation. */
  onTraceChange?: (used: number, total: number, stuck: boolean) => void;
  onClose: () => void;
  onNavigateArchive: () => void;
}

export function TracePuzzle({
  ring,
  figure,
  cost,
  difficulty,
  calibrationPoints,
  unlimitedCalibration = false,
  lineHint,
  failedTracePenalty = 0,
  controlMode = "buttons",
  onSolve,
  onStuck,
  onTraceChange,
  onClose,
  onNavigateArchive,
}: TracePuzzleProps) {
  const [traceState, setTraceState] = useState<TraceState>(() =>
    createTraceState(),
  );
  const draggingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const slideMode = controlMode === "touch";
  const reportedStuckRef = useRef(false);
  const solvedRef = useRef(false);

  const meta = RING_METADATA[ring];
  const totalLines = figure.edges.length;
  const usedLines = traceState.usedEdgeIndices.length;
  const canAfford = unlimitedCalibration || calibrationPoints >= cost;
  const stuck = isStuck(figure, traceState);

  // Reset internal trace state when switching to a different figure
  useEffect(() => {
    setTraceState(createTraceState());
    reportedStuckRef.current = false;
    solvedRef.current = false;
  }, [figure.id]);

  useEffect(() => {
    onTraceChange?.(usedLines, totalLines, stuck);
  }, [usedLines, totalLines, stuck, onTraceChange]);

  useEffect(() => {
    const stopDrag = () => {
      draggingRef.current = false;
      setDragPoint(null);
    };
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, []);

  const stepToNode = useCallback(
    (nodeId: string) => {
      if (!canAfford || solvedRef.current) return;

      setTraceState((prev) => {
        const next = extendTrace(figure, prev, nodeId);
        if (next === prev) return prev;

        if (isComplete(figure, next) && !solvedRef.current) {
          solvedRef.current = true;
          queueMicrotask(() => onSolve(ring));
        } else if (isStuck(figure, next) && !reportedStuckRef.current) {
          reportedStuckRef.current = true;
          queueMicrotask(() => onStuck(ring));
        }

        return next;
      });
    },
    [canAfford, figure, onSolve, onStuck, ring],
  );

  // Abandoning a partial trace counts as a failed attempt when failures cost Calibration
  const chargeAbandonedTrace = useCallback(() => {
    if (
      failedTracePenalty > 0 &&
      usedLines > 0 &&
      !reportedStuckRef.current &&
      !solvedRef.current
    ) {
      onStuck(ring);
    }
  }, [failedTracePenalty, onStuck, ring, usedLines]);

  const handleClear = useCallback(() => {
    chargeAbandonedTrace();
    reportedStuckRef.current = false;
    setTraceState(createTraceState());
  }, [chargeAbandonedTrace]);

  const handleClose = useCallback(() => {
    chargeAbandonedTrace();
    onClose();
  }, [chargeAbandonedTrace, onClose]);

  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: point.x, y: point.y };
  };

  const nearestNode = (point: { x: number; y: number }) => {
    let best: { id: string; dist: number } | null = null;
    for (const node of figure.nodes) {
      const dist = Math.hypot(node.x - point.x, node.y - point.y);
      if (dist <= DRAG_SNAP_RADIUS && (!best || dist < best.dist)) {
        best = { id: node.id, dist };
      }
    }
    return best?.id ?? null;
  };

  const handleSlideStart = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!slideMode) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    const point = toSvgPoint(event.clientX, event.clientY);
    if (!point) return;
    const nodeId = nearestNode(point);
    if (nodeId) stepToNode(nodeId);
    setDragPoint(point);
  };

  const handleSlideMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!slideMode || !draggingRef.current) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    if (!point) return;
    setDragPoint(point);
    const nodeId = nearestNode(point);
    if (nodeId && nodeId !== traceState.currentNodeId) stepToNode(nodeId);
  };

  const nodeById = Object.fromEntries(figure.nodes.map((n) => [n.id, n]));
  const neighborIds = new Set(availableNeighbors(figure, traceState));
  const usedSet = new Set(traceState.usedEdgeIndices);

  const activeLineHint = usedLines === 0 ? lineHint : null;
  const hintFrom = activeLineHint ? nodeById[activeLineHint[0]] : null;
  const hintTo = activeLineHint ? nodeById[activeLineHint[1]] : null;

  return (
    <div
      className={`obs-trace-card obs-trace-card--${ring}`}
      data-testid="trace-puzzle-card"
      data-ring={ring}
      role="dialog"
      aria-label={`${meta.label} ${meta.componentTitle} one-line trace puzzle`}
    >
      <header className="obs-trace-card-header">
        <div>
          <span className="obs-trace-eyebrow">
            {meta.code} · {meta.label} · {meta.componentTitle}
          </span>
          <h3 className="obs-trace-title">{figure.title}</h3>
        </div>
        <button
          type="button"
          className="obs-trace-close-btn"
          data-testid="trace-close-btn"
          onClick={handleClose}
          aria-label="Close trace puzzle"
        >
          ✕
        </button>
      </header>

      <div className="obs-trace-meta-row">
        <span className="obs-trace-counter" data-testid="trace-line-counter">
          {usedLines} / {totalLines} lines
        </span>
        <span className="obs-trace-cost" data-testid="trace-cost-preview">
          Cost: {cost} Calibration
        </span>
      </div>

      {!canAfford ? (
        <div
          className="obs-trace-short-callout"
          data-testid="trace-insufficient-points"
          role="alert"
        >
          <p>
            Needs {cost} Calibration to align this {meta.componentTitle} (you
            have {calibrationPoints}).
          </p>
          <button
            type="button"
            className="obs-primary-cta obs-alert-archive-btn"
            onClick={onNavigateArchive}
          >
            Go to Archive
          </button>
        </div>
      ) : (
        <>
          <div className="obs-trace-board-shell">
            <svg
              ref={svgRef}
              className={`obs-trace-svg${slideMode ? " is-slide" : ""}`}
              viewBox="0 0 100 100"
              data-testid="trace-svg"
              data-control-mode={controlMode}
              onPointerDown={handleSlideStart}
              onPointerMove={handleSlideMove}
            >
              <defs>
                <marker
                  id="obs-hint-arrowhead"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="4.5"
                  markerHeight="4.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#e3b23c" />
                </marker>
              </defs>

              {/* Undirected figure edges */}
              {figure.edges.map(([aId, bId], idx) => {
                const a = nodeById[aId];
                const b = nodeById[bId];
                const isUsed = usedSet.has(idx);
                return (
                  <g key={`${aId}-${bId}`}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className={`obs-trace-edge${isUsed ? " is-used" : ""}`}
                      data-testid={`trace-edge-${idx}`}
                      data-used={isUsed ? "true" : "false"}
                    />
                  </g>
                );
              })}

              {/* Single "Follow this line" directional hint on the very first Easy dial */}
              {hintFrom && hintTo && activeLineHint && (
                <g
                  className="obs-trace-line-hint"
                  data-testid="trace-first-line-hint"
                  data-from={activeLineHint[0]}
                  data-to={activeLineHint[1]}
                >
                  <line
                    x1={hintFrom.x}
                    y1={hintFrom.y}
                    x2={
                      hintFrom.x + (hintTo.x - hintFrom.x) * 0.78
                    }
                    y2={
                      hintFrom.y + (hintTo.y - hintFrom.y) * 0.78
                    }
                    className="obs-trace-hint-arrow"
                    markerEnd="url(#obs-hint-arrowhead)"
                  />
                </g>
              )}

              {slideMode &&
                dragPoint &&
                traceState.currentNodeId &&
                !stuck && (
                  <line
                    x1={nodeById[traceState.currentNodeId].x}
                    y1={nodeById[traceState.currentNodeId].y}
                    x2={dragPoint.x}
                    y2={dragPoint.y}
                    className="obs-trace-drag-line"
                    data-testid="trace-drag-line"
                  />
                )}

              {/* Interactive nodes */}
              {figure.nodes.map((node) => {
                const isCurrent = traceState.currentNodeId === node.id;
                const isVisited = traceState.nodePath.includes(node.id);
                const isNeighbor =
                  traceState.currentNodeId !== null &&
                  neighborIds.has(node.id);
                const isHintOrigin =
                  activeLineHint !== null && activeLineHint[0] === node.id;

                return (
                  <g
                    key={node.id}
                    className={`obs-trace-node-group${isCurrent ? " is-current" : ""}${isVisited ? " is-visited" : ""}${isNeighbor ? " is-neighbor" : ""}${isHintOrigin ? " is-start-hint" : ""}`}
                  >
                    {isHintOrigin && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="10.2"
                        className="obs-trace-start-halo"
                        data-testid={`trace-start-glow-${node.id}`}
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="6.6"
                      className="obs-trace-node"
                      data-testid={`trace-node-${node.id}`}
                      data-start-hint={isHintOrigin ? "true" : "false"}
                      role="button"
                      tabIndex={0}
                      aria-label={`Dot ${node.id.toUpperCase()}`}
                      onClick={() => stepToNode(node.id)}
                      onPointerDown={(e) => {
                        if (slideMode) return;
                        e.preventDefault();
                        draggingRef.current = true;
                        stepToNode(node.id);
                      }}
                      onPointerEnter={() => {
                        if (!slideMode && draggingRef.current) {
                          stepToNode(node.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          stepToNode(node.id);
                        }
                      }}
                    />
                    {difficulty !== "hard" && (
                      <text
                        x={node.x}
                        y={node.y + 1.8}
                        textAnchor="middle"
                        className="obs-trace-node-label"
                      >
                        {node.id.toUpperCase()}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {activeLineHint && !stuck && (
            <div
              className="obs-trace-hint-pill"
              data-testid="trace-follow-line-banner"
            >
              FOLLOW THIS LINE: {activeLineHint[0].toUpperCase()} →{" "}
              {activeLineHint[1].toUpperCase()}
            </div>
          )}

          {stuck ? (
            <div
              className="obs-trace-stuck-banner"
              data-testid="trace-stuck-banner"
              role="status"
            >
              {failedTracePenalty > 0
                ? `Stuck - try a different start (-${failedTracePenalty} Calibration).`
                : "Stuck - try a different start (0 Calibration spent)."}
            </div>
          ) : (
            <p className="obs-trace-instruction">
              {traceState.currentNodeId === null
                ? activeLineHint
                  ? "Follow the highlighted line from the starting dot."
                  : "Pick a starting dot and trace every line without lifting."
                : slideMode
                  ? "Slide your finger along an unused line to the next dot."
                  : "Tap a connected dot along an unused line."}
            </p>
          )}

          <div className="obs-trace-actions">
            <button
              type="button"
              className="obs-secondary-btn obs-trace-action-btn"
              data-testid="trace-clear-btn"
              onClick={handleClear}
              disabled={traceState.nodePath.length === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className="obs-secondary-btn obs-trace-action-btn"
              onClick={handleClose}
            >
              Back to Tube
            </button>
          </div>
        </>
      )}
    </div>
  );
}
