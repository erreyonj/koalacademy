import { toSvg, type RegionId } from "../modules/sim";

/** Capsule size in SVG view units — reads as a collectible sibling of the ship. */
const RX = 16;
const RY = 11;
const RIM = 2.2;

/**
 * Floating eighth-note Note-Tail pickup.
 * Same language as the live ship: black hull, cool rim, small window glint,
 * with three trailing rings for the eighth-note silhouette.
 */
export function NoteTailMark({
  x,
  y,
  collected,
  regionId = "launch",
  testId = "note-tail",
}: {
  x: number;
  y: number;
  collected: boolean;
  regionId?: RegionId;
  testId?: string;
}) {
  if (collected) return null;
  const center = toSvg(x, y, regionId);
  const uid = "nh-tail";

  return (
    <g
      className="notehead-note-tail"
      transform={`translate(${center.x.toFixed(1)} ${center.y.toFixed(1)})`}
      pointerEvents="none"
      data-testid={testId}
    >
      <defs>
        <linearGradient
          id={`${uid}-rim`}
          x1={-RX}
          y1={0}
          x2={RX}
          y2={0}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#1a2438" />
          <stop offset="0.4" stopColor="var(--nh-band)" stopOpacity="0.75" />
          <stop offset="0.85" stopColor="var(--nh-band)" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id={`${uid}-halo`} cx="55%" cy="45%" r="60%">
          <stop offset="0" stopColor="var(--nh-band)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--nh-band)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse
        className="notehead-note-tail-halo"
        cx={2}
        cy={0}
        rx={RX * 1.65}
        ry={RY * 1.7}
        fill={`url(#${uid}-halo)`}
      />

      <g className="notehead-note-tail-rings" aria-hidden="true">
        {[
          { cx: -RX - 10, rx: 5.2, ry: 9.5, op: 0.9 },
          { cx: -RX - 17, rx: 4.2, ry: 7.6, op: 0.65 },
          { cx: -RX - 23, rx: 3.2, ry: 5.8, op: 0.4 },
        ].map((ring) => (
          <ellipse
            key={ring.cx}
            className="notehead-note-tail-ring"
            cx={ring.cx}
            cy={0}
            rx={ring.rx}
            ry={ring.ry}
            opacity={ring.op}
          />
        ))}
      </g>

      <rect
        className="notehead-ship-edge"
        x={-RX - RIM / 2 - 0.6}
        y={-RY - RIM / 2 - 0.6}
        width={(RX + RIM / 2 + 0.6) * 2}
        height={(RY + RIM / 2 + 0.6) * 2}
        rx={RY + RIM / 2 + 0.6}
      />

      <rect
        className="notehead-note-tail-hull"
        x={-RX}
        y={-RY}
        width={RX * 2}
        height={RY * 2}
        rx={RY}
        fill="#04060a"
        stroke={`url(#${uid}-rim)`}
        strokeWidth={RIM}
      />

      <ellipse
        className="notehead-ship-glint"
        cx={RX * 0.28}
        cy={-RY * 0.32}
        rx={RX * 0.2}
        ry={RY * 0.14}
      />
    </g>
  );
}
