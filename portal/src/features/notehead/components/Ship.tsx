import { glowColor, trailStrength, type ShipGlow } from "../modules/momentum";
import {
  SHIP_R,
  svgViewFor,
  toSvg,
  type RegionId,
} from "../modules/sim";

/** The sim's ship radius in view units for a region. */
function seatFor(regionId: RegionId): number {
  const view = svgViewFor(regionId);
  return view.h - toSvg(0, SHIP_R, regionId).y;
}

const WHITE = [255, 255, 255] as const;
const SHADE = [22, 30, 44] as const;
const RIPPLES = [0, 1, 2] as const;

export interface ShipLook {
  glow: ShipGlow;
  /** Seconds. Drives the trail pulse. */
  clock: number;
  /** Reduced motion: the trail holds one pose. */
  still: boolean;
  /**
   * 0..1 Anachrometer whole-note open. Hull goes white and a center hole
   * blooms while the glow-colored rim stays.
   */
  whole: number;
}

/** Solid black hull → white as the Anachrometer opens. */
function hullFill(whole: number): string {
  const t = Math.max(0, Math.min(1, whole));
  const c = Math.round(255 * t);
  return `rgb(${c} ${c} ${c})`;
}

/**
 * The stemless notehead. Solid black body, glow-colored rim. Anachrometer
 * warp opens a whole-note hole and bleaches the hull white.
 */
export function Ship({
  cx,
  cy,
  rx,
  ry,
  look,
  testId,
  regionId = "launch",
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  look: ShipLook;
  testId: string;
  regionId?: RegionId;
}) {
  const { glow } = look;
  const whole = Math.max(0, Math.min(1, look.whole));
  const seat = seatFor(regionId);
  const dx = Math.cos(glow.angle);
  const dy = Math.sin(glow.angle);
  const unit = ry / 6;
  const rim = (1.5 + 0.35 * whole) * unit;
  // How far the capsule reaches along the heading, and across it.
  const reach = Math.abs(dx) * (rx - ry) + ry;
  const breadth = Math.abs(dy) * (rx - ry) + ry;
  const axis = {
    x1: -dx * reach,
    y1: -dy * reach,
    x2: dx * reach,
    y2: dy * reach,
  };
  const trail = trailStrength(glow.energy);
  const pulse = look.still ? 0.5 : (look.clock * 1.8) % 1;
  // Whole-note hole — matches the whl-* asset silhouette.
  const holeRx = rx * 0.42 * whole;
  const holeRy = ry * 0.36 * whole;

  return (
    <g
      className="notehead-ship-group"
      transform={`translate(${cx.toFixed(2)} ${(cy + seat - ry).toFixed(2)})`}
      pointerEvents="none"
      data-whole={whole.toFixed(2)}
    >
      <defs>
        <linearGradient id="nh-ship-rim" gradientUnits="userSpaceOnUse" {...axis}>
          <stop offset="0" stopColor={glowColor(glow, SHADE, 0.9)} />
          <stop offset="0.45" stopColor={glowColor(glow, SHADE, 0.5)} />
          <stop offset="0.8" stopColor={glowColor(glow)} />
          <stop offset="1" stopColor={glowColor(glow, WHITE, 0.35)} />
        </linearGradient>
        <radialGradient id="nh-ship-halo">
          <stop offset="0" stopColor={glowColor(glow)} stopOpacity="0.55" />
          <stop offset="1" stopColor={glowColor(glow)} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        cx={dx * reach * 0.45}
        cy={dy * reach * 0.45}
        r={rx * 1.7}
        fill="url(#nh-ship-halo)"
        opacity={0.45 + 0.4 * glow.energy}
      />
      {trail > 0.01 && (
        <g
          className="notehead-trail"
          transform={`rotate(${((glow.angle * 180) / Math.PI).toFixed(1)})`}
          data-testid="ship-trail"
        >
          {RIPPLES.map((index) => {
            const step = index + pulse;
            const fade = Math.min(1, step * 2.5) * (1 - step / RIPPLES.length);
            return (
              <ellipse
                key={index}
                cx={-(reach + (2.6 + step * 3.6) * unit)}
                cy={0}
                rx={0.9 * unit}
                ry={breadth * (1.2 - 0.26 * step)}
                stroke={glowColor(glow)}
                strokeWidth={(1 - 0.22 * step) * unit}
                opacity={fade * trail}
              />
            );
          })}
        </g>
      )}
      <rect
        className="notehead-ship-edge"
        x={-rx - rim / 2 - 0.7}
        y={-ry - rim / 2 - 0.7}
        width={(rx + rim / 2 + 0.7) * 2}
        height={(ry + rim / 2 + 0.7) * 2}
        rx={ry + rim / 2 + 0.7}
      />
      <rect
        className="notehead-ship"
        x={-rx}
        y={-ry}
        width={rx * 2}
        height={ry * 2}
        rx={ry}
        fill={hullFill(whole)}
        stroke="url(#nh-ship-rim)"
        strokeWidth={rim}
        data-testid={testId}
        data-lift={glow.lift.toFixed(2)}
        data-warn={glow.warn.toFixed(2)}
        data-sting={glow.sting.toFixed(2)}
        data-whole={whole.toFixed(2)}
      />
      {holeRx > 0.15 && (
        <ellipse
          className="notehead-ship-hole"
          cx={0}
          cy={0}
          rx={holeRx}
          ry={holeRy}
          data-testid="ship-hole"
        />
      )}
      <ellipse
        className="notehead-ship-glint"
        cx={dx * (reach - rim) * 0.5}
        cy={dy * (reach - rim) * 0.5 - ry * 0.18}
        rx={rx * 0.2}
        ry={ry * 0.13}
        opacity={0.32 * (1 - whole)}
      />
    </g>
  );
}
