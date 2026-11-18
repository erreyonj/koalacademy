/**
 * Launch break-through: Frequency Band snaps at the impact and peels apart
 * with a short shard burst.
 */
const SHARDS: readonly { x: number; y: number; rot: number; len: number; delay: number }[] = [
  { x: -10, y: 6, rot: -28, len: 9, delay: 0 },
  { x: 8, y: 8, rot: 22, len: 11, delay: 0.03 },
  { x: -4, y: 14, rot: 8, len: 7, delay: 0.06 },
  { x: 12, y: 4, rot: 48, len: 8, delay: 0.02 },
  { x: -14, y: 2, rot: -52, len: 10, delay: 0.05 },
  { x: 2, y: 16, rot: -6, len: 6, delay: 0.08 },
];

export function BandBreak({
  x0,
  x1,
  y,
  breakX,
  testId = "launch-band-break",
}: {
  x0: number;
  x1: number;
  y: number;
  /** SVG x where the ship punched through. */
  breakX: number;
  testId?: string;
}) {
  const cx = Math.max(x0 + 6, Math.min(x1 - 6, breakX));
  const left = x0 - cx;
  const right = x1 - cx;

  return (
    <g
      className="notehead-band-break"
      data-testid={testId}
      transform={`translate(${cx} ${y})`}
      aria-label="Frequency Band breaking"
    >
      <g className="notehead-band-break-flash">
        <circle className="notehead-band-break-flash-core" r={5} />
        <circle className="notehead-band-break-flash-ring" r={14} />
      </g>

      <g className="notehead-band-break-left">
        <path
          className="notehead-band-glow"
          d={`M ${left} 0 L 0 0`}
        />
        <path className="notehead-band" d={`M ${left} 0 L 0 0`} />
        <circle className="notehead-band-node" cx={left} cy={0} r={1.8} />
      </g>

      <g className="notehead-band-break-right">
        <path
          className="notehead-band-glow"
          d={`M 0 0 L ${right} 0`}
        />
        <path className="notehead-band" d={`M 0 0 L ${right} 0`} />
        <circle className="notehead-band-node" cx={right} cy={0} r={1.8} />
      </g>

      <g className="notehead-band-break-shards">
        {SHARDS.map((shard, index) => (
          <line
            key={index}
            className="notehead-band-break-shard"
            x1={0}
            y1={0}
            x2={shard.len}
            y2={0}
            style={{
              ["--nh-shard-x" as string]: `${shard.x}`,
              ["--nh-shard-y" as string]: `${shard.y}`,
              ["--nh-shard-rot" as string]: `${shard.rot}deg`,
              animationDelay: `${shard.delay}s`,
            }}
          />
        ))}
      </g>
    </g>
  );
}
