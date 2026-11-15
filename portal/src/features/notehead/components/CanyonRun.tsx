import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import {
  NOTCH_BLOCK,
  NOTCH_FLOOR,
  NOTCH_POCKET,
  SVG_VIEW,
  toSvg,
  type Body,
  type Ledge,
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

export function NotchArt({
  body,
  gesture,
}: {
  body: Body;
  gesture: FrameGesture;
}) {
  const ship = toSvg(body.x, body.y);
  const drag =
    gesture.phase === "pulling"
      ? pullOffsetSvg(gesture.angle, gesture.power)
      : { x: 0, y: 0 };
  if (gesture.phase === "pulling") {
    ship.x += drag.x;
    ship.y += drag.y;
  }

  const sagFor = (ledge: Ledge) => {
    const occupied = body.restingOn === ledge.id;
    if (gesture.phase === "pulling" && occupied) return drag;
    if (occupied) return { x: 0, y: 8 };
    return { x: 0, y: 0 };
  };

  const pocketL = toSvg(NOTCH_POCKET.x0, NOTCH_POCKET.y);
  const pocketR = toSvg(NOTCH_POCKET.x1, NOTCH_POCKET.y);
  const floorL = toSvg(NOTCH_FLOOR.x0, NOTCH_FLOOR.y);
  const floorR = toSvg(NOTCH_FLOOR.x1, NOTCH_FLOOR.y);
  const block = toSvg(NOTCH_BLOCK.x0, NOTCH_BLOCK.y);
  const blockEnd = toSvg(NOTCH_BLOCK.x1, NOTCH_BLOCK.y);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Notch. Pull a frequency band to launch between the pocket and the high block."
      data-testid="notch-canvas"
      data-phase={gesture.phase}
    >
      <defs>
        <linearGradient id="notch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e4ea" />
          <stop offset="42%" stopColor="#f48aaa" />
          <stop offset="100%" stopColor="#d62868" />
        </linearGradient>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#notch-sky)" />
      <line className="notehead-guide" x1={8} x2={192} y1={18} y2={18} />
      <path
        className="notehead-terrain"
        d="M 0 40 H 112 V 90 L 68 132 V 156 H 108 V 198 L 150 268 L 78 360 H 0 Z"
      />
      <path className="notehead-terrain" d="M 0 332 L 118 308 L 200 286 V 360 H 0 Z" />
      <rect
        className="notehead-terrain"
        x={block.x - 2}
        y={block.y}
        width={blockEnd.x - block.x + 6}
        height={34}
        data-testid="notch-block"
      />
      <Trajectory points={gesture.chart} apex={gesture.chartApex} />
      <path
        className={`notehead-band${body.restingOn === NOTCH_POCKET.id ? " is-hot" : ""}`}
        d={bandPath(pocketL.x, pocketR.x, pocketL.y, sagFor(NOTCH_POCKET))}
        data-testid="notch-pocket-band"
        aria-label="Frequency Band"
      />
      <path
        className={`notehead-band${body.restingOn === NOTCH_FLOOR.id ? " is-hot" : ""}`}
        d={bandPath(floorL.x, floorR.x, floorL.y, sagFor(NOTCH_FLOOR))}
        data-testid="notch-floor-band"
        aria-label="Frequency Band"
      />
      {(gesture.phase === "flight" || gesture.phase === "sparkle") && (
        <>
          <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={14} />
          <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={22} />
        </>
      )}
      {gesture.phase === "sparkle" && (
        <Sparkles cx={ship.x} cy={ship.y} testId="notch-sparkles" />
      )}
      <ellipse
        className="notehead-ship is-lite"
        cx={ship.x}
        cy={ship.y}
        rx={8}
        ry={6}
        data-testid="notch-ship"
      />
    </svg>
  );
}
