import { Band } from "./Band";
import { BorealisMark } from "./Borealis";
import { SceneFrame } from "./SceneFrame";
import { Ship, type ShipLook } from "./Ship";
import { Sparkles } from "./Sparkles";
import { Trajectory } from "./Trajectory";
import {
  NOTCH_FLOOR,
  NOTCH_POCKET,
  toSvg,
  type Body,
  type Ledge,
} from "../sim";
import { pullOffsetSvg, type FrameGesture } from "../view";

/** How far a band dips under a ship that is resting on it. */
const CRADLE = 1.5;

export function NotchArt({
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
    body.restingOn === NOTCH_POCKET.id ||
    body.restingOn === NOTCH_FLOOR.id ||
    body.restingOn === warp?.id ||
    body.restingOn === exitBand?.id ||
    airWarp;
  const ship = toSvg(body.x, body.y);
  ship.x += drag.x;
  ship.y += drag.y;
  if (onBand && !pulling) ship.y += CRADLE;

  const sagFor = (ledge: Ledge) => {
    if (warp && ledge.id === warp.id && airWarp) return drag;
    if (body.restingOn !== ledge.id) return { x: 0, y: 0 };
    return pulling ? drag : { x: 0, y: CRADLE };
  };

  const pocketIsBorealis = gesture.borealis.some(
    (entry) => entry.id === NOTCH_POCKET.id,
  );
  const bands = [
    ...(!pocketIsBorealis
      ? [{ ledge: NOTCH_POCKET, testId: "notch-pocket-band" }]
      : []),
    { ledge: NOTCH_FLOOR, testId: "notch-floor-band" },
  ];

  return (
    <SceneFrame
      regionId="notch"
      label="Notch. Pull a frequency band to launch between the pocket and the high block."
      testId="notch-canvas"
      phase={gesture.phase}
    >
      <Trajectory points={gesture.chart} apex={gesture.chartApex} />
      {bands.map(({ ledge, testId }) => {
        const left = toSvg(ledge.x0, ledge.y);
        const right = toSvg(ledge.x1, ledge.y);
        return (
          <Band
            key={ledge.id}
            x0={left.x}
            x1={right.x}
            y={left.y}
            sag={sagFor(ledge)}
            hot={body.restingOn === ledge.id}
            testId={testId}
          />
        );
      })}
      {gesture.borealis.map((entry, index) => {
        const next = gesture.borealis.findIndex((gem) => !gem.collected);
        return (
          <BorealisMark
            key={entry.id}
            x={entry.x}
            y={entry.y}
            pitch={entry.pitch}
            collected={entry.collected}
            active={index === next}
            testId={`borealis-${entry.id}`}
          />
        );
      })}
      {exitBand && (
        <Band
          x0={toSvg(exitBand.x0, exitBand.y).x}
          x1={toSvg(exitBand.x1, exitBand.y).x}
          y={toSvg(exitBand.x0, exitBand.y).y}
          sag={sagFor(exitBand)}
          hot={body.restingOn === exitBand.id}
          testId="exit-band"
        />
      )}
      {warp && (
        <Band
          x0={toSvg(warp.x0, warp.y).x}
          x1={toSvg(warp.x1, warp.y).x}
          y={toSvg(warp.x0, warp.y).y}
          sag={sagFor(warp)}
          hot={body.restingOn === warp.id || airWarp}
          testId="warp-band"
        />
      )}
      {gesture.phase === "sparkle" && (
        <Sparkles cx={ship.x} cy={ship.y} testId="notch-sparkles" />
      )}
      <Ship
        cx={ship.x}
        cy={ship.y}
        rx={8}
        ry={6}
        look={look}
        testId="notch-ship"
      />
    </SceneFrame>
  );
}
