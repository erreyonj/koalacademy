import { Band } from "./Band";
import { BandBreak } from "./BandBreak";
import { BorealisMark } from "./Borealis";
import { ExitMark } from "./ExitZone";
import { NoteTailMark } from "./NoteTailMark";
import { SceneFrame } from "./SceneFrame";
import { Ship, type ShipLook } from "./Ship";
import { ShipBreach } from "./ShipBreach";
import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import { regionData } from "../modules/regions";
import {
  ledgesFor,
  toSvg,
  type Body,
  type Ledge,
  type RegionId,
} from "../modules/sim";
import { pullOffsetSvg, type FrameGesture } from "../modules/view";

const CRADLE = 1.5;

/**
 * Any route level, drawn from its registered region: rock, authored bands,
 * Borealis, exits, and the ship. Nothing here knows a level's name or shape.
 */
export function LevelArt({
  regionId,
  body,
  gesture,
  look,
  warp,
}: {
  regionId: RegionId;
  body: Body;
  gesture: FrameGesture;
  look: ShipLook;
  warp: Ledge | null;
}) {
  // Same drawn size in both orientations: the landscape view is sized so a
  // view unit is the same pixels as in portrait.
  const rx = 8;
  const ry = 6;
  const ledges = ledgesFor(regionId);
  const zones = regionData(regionId)?.exitZones ?? [];
  const pulling = gesture.phase === "pulling";
  const drag = pulling
    ? pullOffsetSvg(gesture.angle, gesture.power)
    : { x: 0, y: 0 };
  const exitBand = gesture.exitBand;
  const airWarp = Boolean(warp) && pulling;
  const onBand =
    ledges.some((ledge) => ledge.id === body.restingOn && ledge.kind === "band") ||
    body.restingOn === warp?.id ||
    body.restingOn === exitBand?.id ||
    airWarp;
  const ship = toSvg(body.x, body.y, regionId);
  ship.x += drag.x;
  ship.y += drag.y;
  if (onBand && !pulling) ship.y += CRADLE;

  const sagFor = (ledge: Ledge) => {
    if (warp && ledge.id === warp.id && airWarp) return drag;
    if (body.restingOn !== ledge.id) return { x: 0, y: 0 };
    return pulling ? drag : { x: 0, y: CRADLE };
  };

  const bandFor = (ledge: Ledge, testId: string, hot = false) => {
    const a = toSvg(ledge.x0, ledge.y, regionId);
    const b = toSvg(ledge.x1, ledge.y, regionId);
    return (
      <Band
        key={testId}
        x0={a.x}
        x1={b.x}
        y={a.y}
        sag={sagFor(ledge)}
        hot={hot}
        testId={testId}
      />
    );
  };

  // The slingshot guide spans the first band; once it snaps, that band is drawn
  // breaking instead.
  const guideBand = gesture.guide !== null ? ledges.find((l) => l.kind === "band") : undefined;
  const guideLine = guideBand
    ? {
        x0: toSvg(guideBand.x0, guideBand.y, regionId).x,
        x1: toSvg(guideBand.x1, guideBand.y, regionId).x,
        y: toSvg(guideBand.x0, gesture.guide ?? 0, regionId).y,
      }
    : null;
  const broken = gesture.bandBreak
    ? ledges.find(
        (ledge) => ledge.kind === "band" && Math.abs(ledge.y - gesture.bandBreak!.y) < 1,
      )
    : undefined;

  return (
    <SceneFrame
      regionId={regionId}
      label="Notehead level. Pull a Frequency Band to launch."
      testId="level-canvas"
      phase={gesture.phase}
    >
      <Trajectory
        points={gesture.chart}
        apex={gesture.chartApex}
        regionId={regionId}
      />
      {guideLine && (
        <line
          className="notehead-guide"
          x1={guideLine.x0}
          x2={guideLine.x1}
          y1={guideLine.y}
          y2={guideLine.y}
          data-testid="slingshot-guide"
        />
      )}
      {ledges.map((ledge) => {
        if (broken && ledge.id === broken.id) {
          const a = toSvg(ledge.x0, ledge.y, regionId);
          const b = toSvg(ledge.x1, ledge.y, regionId);
          return (
            <BandBreak
              key="band-break"
              x0={a.x}
              x1={b.x}
              y={a.y}
              breakX={toSvg(gesture.bandBreak!.x, gesture.bandBreak!.y, regionId).x}
              testId="slingshot-band-break"
            />
          );
        }
        if (ledge.kind === "band" && !ledge.slope) {
          return bandFor(ledge, `band-${ledge.id}`, body.restingOn === ledge.id && pulling);
        }
        const a = toSvg(ledge.x0, ledge.y, regionId);
        const b = toSvg(ledge.x1, ledge.y, regionId);
        return (
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
      {exitBand &&
        bandFor(exitBand, "exit-band", body.restingOn === exitBand.id)}
      {warp && bandFor(warp, "warp-band", onBand && body.restingOn === warp.id)}
      {gesture.borealis.map((gem) => (
        <BorealisMark
          key={gem.id}
          x={gem.x}
          y={gem.y}
          pitch={gem.pitch}
          collected={gem.collected}
          regionId={regionId}
          testId={`borealis-${gem.id}`}
        />
      ))}
      {gesture.noteTail && (
        <NoteTailMark
          x={gesture.noteTail.x}
          y={gesture.noteTail.y}
          collected={gesture.noteTail.collected}
          regionId={regionId}
          testId="note-tail-eighth"
        />
      )}
      {zones.map((zone, index) => (
        <ExitMark key={index} zone={zone} lit />
      ))}
      {gesture.phase === "sparkle" && (
        <Sparkles cx={ship.x} cy={ship.y} testId="level-sparkles" />
      )}
      {gesture.phase === "breach" ? (
        <ShipBreach
          cx={ship.x}
          cy={ship.y}
          rx={rx}
          ry={ry}
          regionId={regionId}
          testId="level-ship-breach"
        />
      ) : (
        <Ship
          cx={ship.x}
          cy={ship.y}
          rx={rx}
          ry={ry}
          look={look}
          testId="level-ship"
          regionId={regionId}
        />
      )}
    </SceneFrame>
  );
}
