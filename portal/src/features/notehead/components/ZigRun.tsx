import { Band } from "./Band";
import { BorealisMark } from "./Borealis";
import { SceneFrame } from "./SceneFrame";
import { Ship, type ShipLook } from "./Ship";
import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import {
  ZIG_LEFT,
  ZIG_PEAK,
  ZIG_RIGHT,
  toSvg,
  type Body,
  type Ledge,
} from "../sim";
import { pullOffsetSvg, type FrameGesture } from "../view";

const REGION = "zig" as const;
const CRADLE = 1.5;

export function ZigArt({
  body,
  gesture,
  look,
  warp,
}: {
  body: Body;
  gesture: FrameGesture;
  look: ShipLook;
  warp: Ledge | null;
}) {
  const pulling = gesture.phase === "pulling";
  const drag = pulling
    ? pullOffsetSvg(gesture.angle, gesture.power)
    : { x: 0, y: 0 };
  const exitBand = gesture.exitBand;
  const airWarp = Boolean(warp) && pulling;
  const onBand =
    body.restingOn === ZIG_PEAK.id ||
    body.restingOn === ZIG_LEFT.id ||
    body.restingOn === ZIG_RIGHT.id ||
    body.restingOn === warp?.id ||
    body.restingOn === exitBand?.id ||
    airWarp;
  const ship = toSvg(body.x, body.y, REGION);
  ship.x += drag.x;
  ship.y += drag.y;
  if (onBand && !pulling) ship.y += CRADLE;

  const sagFor = (ledge: Ledge) => {
    if (warp && ledge.id === warp.id && airWarp) return drag;
    if (body.restingOn !== ledge.id) return { x: 0, y: 0 };
    return pulling ? drag : { x: 0, y: CRADLE };
  };

  const nextId =
    gesture.borealis.find((entry) => !entry.collected)?.id ?? null;

  return (
    <SceneFrame
      regionId={REGION}
      label="Zig. Twin cliffs over the peak. Warp and zig-zag for Borealis."
      testId="zig-canvas"
      phase={gesture.phase}
    >
      <Trajectory
        points={gesture.chart}
        apex={gesture.chartApex}
        regionId={REGION}
      />
      {exitBand && (
        <Band
          x0={toSvg(exitBand.x0, exitBand.y, REGION).x}
          x1={toSvg(exitBand.x1, exitBand.y, REGION).x}
          y={toSvg(exitBand.x0, exitBand.y, REGION).y}
          sag={sagFor(exitBand)}
          hot={body.restingOn === exitBand.id}
          testId="zig-exit-band"
        />
      )}
      {warp && (
        <Band
          x0={toSvg(warp.x0, warp.y, REGION).x}
          x1={toSvg(warp.x1, warp.y, REGION).x}
          y={toSvg(warp.x0, warp.y, REGION).y}
          sag={sagFor(warp)}
          hot={onBand && body.restingOn === warp.id}
          testId="zig-warp-band"
        />
      )}
      {gesture.borealis.map((gem) => (
        <BorealisMark
          key={gem.id}
          x={gem.x}
          y={gem.y}
          pitch={gem.pitch}
          collected={gem.collected}
          active={gem.id === nextId}
          regionId={REGION}
          testId={`borealis-${gem.id}`}
        />
      ))}
      {(gesture.phase === "flight" || gesture.phase === "sparkle") && (
        <>
          <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={12} />
          <circle className="notehead-ring" cx={ship.x} cy={ship.y} r={18} />
        </>
      )}
      {gesture.phase === "sparkle" && (
        <Sparkles cx={ship.x} cy={ship.y} testId="zig-sparkles" />
      )}
      <Ship cx={ship.x} cy={ship.y} rx={10} ry={7} look={look} testId="zig-ship" regionId={REGION} />
    </SceneFrame>
  );
}
