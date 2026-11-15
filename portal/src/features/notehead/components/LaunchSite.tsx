import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import {
  LAUNCH_BAND,
  LAUNCH_SPACING,
  pitchIndex,
  SVG_VIEW,
  toSvg,
  type Body,
} from "../sim";
import { pullOffsetSvg, type FrameGesture } from "../view";

const { w: VIEW_W, h: VIEW_H } = SVG_VIEW;

export function LaunchArt({
  body,
  gesture,
  goalPitch,
}: {
  body: Body;
  gesture: FrameGesture;
  goalPitch: string;
}) {
  const goalIndex = Math.max(0, pitchIndex(goalPitch as "G4"));
  const guide = toSvg(0, LAUNCH_BAND.y + (goalIndex + 1) * LAUNCH_SPACING);
  const band = toSvg(LAUNCH_BAND.x0, LAUNCH_BAND.y);
  const bandEnd = toSvg(LAUNCH_BAND.x1, LAUNCH_BAND.y);
  const sag =
    gesture.phase === "pulling" ? pullOffsetSvg(0, gesture.power) : { x: 0, y: 0 };
  const ship = toSvg(body.x, body.y);
  ship.x += sag.x;
  ship.y += sag.y;
  const airborne = gesture.phase === "flight" || gesture.phase === "sparkle";

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Notehead launch site. Pull the band and release to match the goal pitch."
      data-testid="launch-canvas"
      data-phase={gesture.phase}
    >
      <line
        className="notehead-guide"
        x1={24}
        x2={VIEW_W - 24}
        y1={guide.y}
        y2={guide.y}
        data-testid="launch-guide"
      />
      <path
        className="notehead-band"
        d={`M ${band.x} ${band.y} Q ${VIEW_W / 2 + sag.x} ${band.y + sag.y} ${bandEnd.x} ${bandEnd.y}`}
        data-testid="launch-band"
        aria-label="Frequency Band"
      />
      <Trajectory points={gesture.chart} apex={gesture.chartApex} />
      {airborne && (
        <>
          <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={22} />
          <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={34} />
          <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={46} />
        </>
      )}
      {gesture.phase === "sparkle" && (
        <Sparkles cx={ship.x} cy={guide.y} />
      )}
      <ellipse
        className="notehead-ship"
        cx={ship.x}
        cy={ship.y}
        rx={14}
        ry={10}
        data-testid="launch-ship"
      />
    </svg>
  );
}
