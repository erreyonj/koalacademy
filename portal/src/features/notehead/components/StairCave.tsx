import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import {
  STAIR_BAND,
  STAIR_TREADS,
  SVG_VIEW,
  toSvg,
  type Body,
} from "../sim";
import { pullOffsetSvg, type FrameGesture } from "../view";

const { w: VIEW_W, h: VIEW_H } = SVG_VIEW;

function bandPath(
  x0: number,
  x1: number,
  y: number,
  sag: { x: number; y: number },
) {
  const mid = (x0 + x1) / 2;
  return `M ${x0} ${y} Q ${mid + sag.x} ${y + sag.y} ${x1} ${y}`;
}

export function StairArt({
  body,
  gesture,
}: {
  body: Body;
  gesture: FrameGesture;
}) {
  const sag =
    gesture.phase === "pulling"
      ? pullOffsetSvg(gesture.angle, gesture.power)
      : { x: 0, y: 0 };
  const ship = toSvg(body.x, body.y);
  ship.x += sag.x;
  ship.y += sag.y;
  const bandL = toSvg(STAIR_BAND.x0, STAIR_BAND.y);
  const bandR = toSvg(STAIR_BAND.x1, STAIR_BAND.y);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Stair cave. Pull the band so the ship comes down every step."
      data-testid="stair-canvas"
      data-phase={gesture.phase}
    >
      <defs>
        <linearGradient id="stair-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8eef2" />
          <stop offset="100%" stopColor="#f3c5d4" />
        </linearGradient>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#stair-sky)" />
      <line className="notehead-guide" x1={16} x2={184} y1={22} y2={22} />
      {STAIR_TREADS.map((tread) => {
        const origin = toSvg(tread.x0, tread.y);
        const end = toSvg(tread.x1, tread.y);
        return (
          <rect
            key={tread.id}
            className="notehead-terrain"
            x={origin.x}
            y={origin.y}
            width={end.x - origin.x}
            height={VIEW_H - origin.y}
            data-testid={`stair-${tread.id}`}
            data-visited={gesture.visited.includes(tread.id) ? "true" : "false"}
          />
        );
      })}
      {STAIR_TREADS.map((tread) => {
        if (!gesture.visited.includes(tread.id)) return null;
        const origin = toSvg(tread.x0, tread.y);
        return (
          <line
            key={`${tread.id}-mark`}
            className="notehead-tread-mark"
            x1={origin.x}
            x2={origin.x + 28}
            y1={origin.y + 1.5}
            y2={origin.y + 1.5}
          />
        );
      })}
      <Trajectory points={gesture.chart} apex={gesture.chartApex} />
      <path
        className="notehead-band"
        d={bandPath(bandL.x, bandR.x, bandL.y, sag)}
        data-testid="stair-band"
        aria-label="Frequency Band"
      />
      {gesture.phase === "flight" && (
        <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={16} />
      )}
      {gesture.phase === "sparkle" && (
        <Sparkles cx={ship.x} cy={ship.y} testId="stair-sparkles" />
      )}
      <ellipse
        className="notehead-ship is-lite"
        cx={ship.x}
        cy={ship.y}
        rx={8}
        ry={6}
        data-testid="stair-ship"
      />
    </svg>
  );
}
