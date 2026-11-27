import { toSvg, type RegionId } from "../modules/sim";

const OPACITY_BUCKETS = 5;

/** Path parameter → stroke opacity. Strong at the start, soft at the tip. */
function fadeAt(t: number): number {
  return 0.82 * (1 - t * 0.88);
}

export function Trajectory({
  points,
  apex,
  regionId = "launch",
}: {
  points: readonly { x: number; y: number }[];
  apex: { x: number; y: number } | null;
  regionId?: RegionId;
}) {
  if (!points || points.length < 2) return null;

  const svgPoints = points.map((point) => toSvg(point.x, point.y, regionId));
  const end = svgPoints[svgPoints.length - 1]!;
  const peak = apex ? toSvg(apex.x, apex.y, regionId) : null;
  const segCount = svgPoints.length - 1;
  const bucketCount = Math.min(OPACITY_BUCKETS, segCount);

  const buckets: { d: string; opacity: number }[] = [];
  for (let b = 0; b < bucketCount; b++) {
    const start = Math.floor((b * segCount) / bucketCount);
    const finish = Math.floor(((b + 1) * segCount) / bucketCount);
    if (finish <= start) continue;
    const first = svgPoints[start]!;
    let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    for (let i = start + 1; i <= finish; i++) {
      const p = svgPoints[i]!;
      d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    const midT = (start + finish) / (2 * segCount);
    buckets.push({ d, opacity: fadeAt(midT) });
  }

  return (
    <g data-testid="shot-chart" pointerEvents="none">
      {buckets.map((bucket, index) => (
        <path
          key={index}
          className="notehead-chart"
          d={bucket.d}
          opacity={bucket.opacity}
          strokeLinecap="butt"
        />
      ))}
      {peak && (
        <circle
          className="notehead-chart-apex"
          cx={peak.x}
          cy={peak.y}
          r={3.2}
          opacity={fadeAt(0.45)}
          data-testid="shot-chart-apex"
        />
      )}
      <circle
        className="notehead-chart-end"
        cx={end.x}
        cy={end.y}
        r={2.4}
        opacity={0.55}
      />
    </g>
  );
}
