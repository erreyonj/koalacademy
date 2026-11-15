import { toSvg } from "../sim";

export function Trajectory({
  points,
  apex,
}: {
  points: readonly { x: number; y: number }[];
  apex: { x: number; y: number } | null;
}) {
  if (points.length < 2) return null;
  const d = points
    .map((point, index) => {
      const svg = toSvg(point.x, point.y);
      return `${index === 0 ? "M" : "L"} ${svg.x.toFixed(1)} ${svg.y.toFixed(1)}`;
    })
    .join(" ");
  const end = toSvg(points[points.length - 1]!.x, points[points.length - 1]!.y);
  const peak = apex ? toSvg(apex.x, apex.y) : null;

  return (
    <g data-testid="shot-chart" pointerEvents="none">
      <path className="notehead-chart" d={d} />
      {peak && (
        <circle
          className="notehead-chart-apex"
          cx={peak.x}
          cy={peak.y}
          r={3.2}
          data-testid="shot-chart-apex"
        />
      )}
      <circle className="notehead-chart-end" cx={end.x} cy={end.y} r={2.4} />
    </g>
  );
}
