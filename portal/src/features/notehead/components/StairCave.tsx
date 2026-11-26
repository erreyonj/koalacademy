import { Band } from "./Band";
import { BorealisMark } from "./Borealis";
import { ExitMark } from "./ExitZone";
import { SceneFrame } from "./SceneFrame";
import { Ship, type ShipLook } from "./Ship";
import { ShipBreach } from "./ShipBreach";
import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import {
  STAIR_BAND,
  STAIR_TREADS,
  ledgeYAt,
  toSvg,
  type Body,
  type Ledge,
} from "../modules/sim";
import { pullOffsetSvg, type FrameGesture } from "../modules/view";

function treadLine(tread: Ledge) {
  const next = [...STAIR_TREADS]
    .sort((a, b) => a.y - b.y)
    .find((entry) => entry.y > tread.y);
  const x1 = next ? next.x0 : tread.x1;
  const a = toSvg(tread.x0, ledgeYAt(tread, tread.x0));
  const b = toSvg(x1, ledgeYAt(tread, x1));
  return { id: tread.id, x0: a.x, y0: a.y, x1: b.x, y1: b.y };
}

export function StairArt({
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
  const sag =
    gesture.phase === "pulling"
      ? pullOffsetSvg(gesture.angle, gesture.power)
      : { x: 0, y: 0 };
  const ship = toSvg(body.x, body.y);
  ship.x += sag.x;
  ship.y += sag.y;
  const bandL = toSvg(STAIR_BAND.x0, STAIR_BAND.y);
  const bandR = toSvg(STAIR_BAND.x1, STAIR_BAND.y);
  const exitBand = gesture.exitBand;
  const airWarp = Boolean(warp) && gesture.phase === "pulling";
  const onWarp = body.restingOn === warp?.id || airWarp;
  const onExit = body.restingOn === exitBand?.id;

  return (
    <SceneFrame
      regionId="stairs"
      label="Stair cave. Warp and gather Borealis above every tread."
      testId="stair-canvas"
      phase={gesture.phase}
    >
      {[...STAIR_TREADS].map((tread) => {
        const line = treadLine(tread);
        return (
          <line
            key={tread.id}
            className="notehead-tread"
            x1={line.x0}
            x2={line.x1}
            y1={line.y0}
            y2={line.y1}
            data-testid={`stair-${tread.id}`}
            data-visited={gesture.visited.includes(tread.id) ? "true" : "false"}
          />
        );
      })}
      <Trajectory points={gesture.chart} apex={gesture.chartApex} />
      {gesture.borealis.map((entry) => (
        <BorealisMark
          key={entry.id}
          x={entry.x}
          y={entry.y}
          pitch={entry.pitch}
          collected={entry.collected}
          testId={`borealis-${entry.id}`}
        />
      ))}
      {exitBand && (
        <Band
          x0={toSvg(exitBand.x0, exitBand.y).x}
          x1={toSvg(exitBand.x1, exitBand.y).x}
          y={toSvg(exitBand.x0, exitBand.y).y}
          sag={onExit ? sag : { x: 0, y: 0 }}
          hot={onExit}
          testId="exit-band"
        />
      )}
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
      <Band
        x0={bandL.x}
        x1={bandR.x}
        y={bandL.y}
        sag={body.restingOn === STAIR_BAND.id ? sag : { x: 0, y: 0 }}
        testId="stair-band"
      />
      {gesture.exitZone && (
        <ExitMark zone={gesture.exitZone} lit={gesture.exitLit} />
      )}
      {gesture.phase === "sparkle" && (
        <Sparkles cx={ship.x} cy={ship.y} testId="stair-sparkles" />
      )}
      {gesture.phase === "breach" ? (
        <ShipBreach
          cx={ship.x}
          cy={ship.y}
          rx={8}
          ry={6}
          testId="stair-ship-breach"
        />
      ) : (
        <Ship
          cx={ship.x}
          cy={ship.y}
          rx={8}
          ry={6}
          look={look}
          testId="stair-ship"
        />
      )}
    </SceneFrame>
  );
}
