import { toSvg, type RegionId } from "../sim";

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
  const last = svgPoints.length - 1;

  return (
    <g data-testid="shot-chart" pointerEvents="none">
      {svgPoints.slice(1).map((point, index) => {
        const prev = svgPoints[index]!;
        const t = (index + 1) / last;
        return (
          <line
            key={index}
            className="notehead-chart"
            x1={prev.x.toFixed(1)}
            y1={prev.y.toFixed(1)}
            x2={point.x.toFixed(1)}
            y2={point.y.toFixed(1)}
            opacity={fadeAt(t)}
          />
        );
      })}
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
