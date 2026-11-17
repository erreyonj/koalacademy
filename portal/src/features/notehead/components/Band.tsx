/**
 * One Frequency Band. `sag` is how far the middle of the band is pulled, so
 * a ship moved by the same offset stays seated in the curve.
 */
export function Band({
  x0,
  x1,
  y,
  sag,
  hot = false,
  testId,
}: {
  x0: number;
  x1: number;
  y: number;
  sag: { x: number; y: number };
  hot?: boolean;
  testId: string;
}) {
  const mid = (x0 + x1) / 2;
  // A quadratic passes halfway to its control point, so the control sits at twice the sag.
  const d = `M ${x0} ${y} Q ${mid + sag.x * 2} ${y + sag.y * 2} ${x1} ${y}`;
  return (
    <g>
      <path className={`notehead-band-glow${hot ? " is-hot" : ""}`} d={d} />
      <path
        className={`notehead-band${hot ? " is-hot" : ""}`}
        d={d}
        data-testid={testId}
        aria-label="Frequency Band"
      />
      <circle className="notehead-band-node" cx={x0} cy={y} r={1.8} />
      <circle className="notehead-band-node" cx={x1} cy={y} r={1.8} />
    </g>
  );
}
