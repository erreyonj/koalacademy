import type { CSSProperties } from "react";
import {
  SHIP_R,
  svgViewFor,
  toSvg,
  type RegionId,
} from "../modules/sim";

/** Match Ship seating so shards erupt from the drawn hull. */
function seatFor(regionId: RegionId): number {
  const view = svgViewFor(regionId);
  return view.h - toSvg(0, SHIP_R, regionId).y;
}

/** Capsule shards fly out along these unit vectors (angle, distance scale). */
const SHARDS = [
  { a: -1.85, d: 1.15, spin: -48, w: 1.05, h: 0.72 },
  { a: -0.55, d: 1.35, spin: 62, w: 0.9, h: 0.62 },
  { a: 0.35, d: 1.2, spin: -36, w: 1.1, h: 0.7 },
  { a: 1.45, d: 1.4, spin: 54, w: 0.85, h: 0.58 },
  { a: 2.4, d: 1.1, spin: -70, w: 0.95, h: 0.65 },
  { a: 3.2, d: 1.25, spin: 40, w: 1.0, h: 0.68 },
  { a: -2.7, d: 1.0, spin: 28, w: 0.8, h: 0.55 },
  { a: 0.95, d: 0.85, spin: -22, w: 0.7, h: 0.5 },
] as const;

/**
 * Hull-breach burst: the notehead splits into capsule shards with a flash.
 * CSS drives the motion so reduced-motion can collapse to a fade.
 */
export function ShipBreach({
  cx,
  cy,
  rx,
  ry,
  regionId = "launch",
  testId = "ship-breach",
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  regionId?: RegionId;
  testId?: string;
}) {
  const seat = seatFor(regionId);
  const reach = Math.max(rx, ry) * 2.8;

  return (
    <g
      className="notehead-ship-breach"
      transform={`translate(${cx.toFixed(2)} ${(cy + seat - ry).toFixed(2)})`}
      pointerEvents="none"
      data-testid={testId}
    >
      <circle className="notehead-ship-breach-flash" r={rx * 1.35} />
      <ellipse
        className="notehead-ship-breach-core"
        rx={rx}
        ry={ry}
      />
      {SHARDS.map((shard, index) => {
        const dx = Math.cos(shard.a) * reach * shard.d;
        const dy = Math.sin(shard.a) * reach * shard.d;
        const sw = rx * shard.w;
        const sh = ry * shard.h;
        return (
          <rect
            key={index}
            className="notehead-ship-breach-shard"
            x={-sw / 2}
            y={-sh / 2}
            width={sw}
            height={sh}
            rx={sh / 2}
            style={
              {
                "--nh-breach-x": `${dx.toFixed(2)}px`,
                "--nh-breach-y": `${dy.toFixed(2)}px`,
                "--nh-breach-spin": `${shard.spin}deg`,
                "--nh-breach-delay": `${(index * 0.018).toFixed(3)}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </g>
  );
}
