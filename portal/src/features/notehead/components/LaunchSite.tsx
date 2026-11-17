import { Band } from "./Band";
import { SceneFrame } from "./SceneFrame";
import { Ship, type ShipLook } from "./Ship";
import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import {
  LAUNCH_BAND,
  LAUNCH_SPACING,
  pitchIndex,
  toSvg,
  type Body,
  type Ledge,
} from "../sim";
import { pullOffsetSvg, type FrameGesture } from "../view";

export function LaunchArt({
  body,
  gesture,
  goalPitch,
  look,
  warp,
}: {
  body: Body;
  gesture: FrameGesture;
  goalPitch: string;
  look: ShipLook;
  warp: Ledge | null;
}) {
  const goalIndex = Math.max(0, pitchIndex(goalPitch as "G4"));
  const guide = toSvg(0, LAUNCH_BAND.y + (goalIndex + 1) * LAUNCH_SPACING);
  const band = toSvg(LAUNCH_BAND.x0, LAUNCH_BAND.y);
  const bandEnd = toSvg(LAUNCH_BAND.x1, LAUNCH_BAND.y);
  const onLaunch = body.restingOn === LAUNCH_BAND.id;
  const airWarp = Boolean(warp) && gesture.phase === "pulling";
  const onWarp = body.restingOn === warp?.id || airWarp;
  const sag =
    gesture.phase === "pulling" && (onLaunch || onWarp)
      ? pullOffsetSvg(0, gesture.power)
      : { x: 0, y: 0 };
  const ship = toSvg(body.x, body.y);
  ship.x += sag.x;
  ship.y += sag.y;

  return (
    <SceneFrame
      regionId="launch"
      label="Notehead launch site. Pull the Frequency Band to slingshot."
      testId="launch-canvas"
      phase={gesture.phase}
    >
      <line
        className="notehead-guide"
        x1={band.x}
        x2={bandEnd.x}
        y1={guide.y}
        y2={guide.y}
        data-testid="launch-guide"
      />
      <Band
        x0={band.x}
        x1={bandEnd.x}
        y={band.y}
        sag={onLaunch ? sag : { x: 0, y: 0 }}
        testId="launch-band"
      />
      {warp && (
        <Band
          x0={toSvg(warp.x0, warp.y).x}
          x1={toSvg(warp.x1, warp.y).x}
          y={toSvg(warp.x0, warp.y).y}
          sag={onWarp ? sag : { x: 0, y: 0 }}
          hot={onWarp}
          testId="warp-band"
        />
      )}
      <Trajectory points={gesture.chart} apex={gesture.chartApex} />
      {gesture.phase === "sparkle" && <Sparkles cx={ship.x} cy={guide.y} />}
      <Ship
        cx={ship.x}
        cy={ship.y}
        rx={14}
        ry={10}
        look={look}
        testId="launch-ship"
      />
    </SceneFrame>
  );
}
