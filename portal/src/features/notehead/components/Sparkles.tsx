export function Sparkles({
  cx,
  cy,
  testId = "launch-sparkles",
}: {
  cx: number;
  cy: number;
  testId?: string;
}) {
  const tips = [
    [0, -16],
    [14, -6],
    [10, 12],
    [-10, 12],
    [-14, -6],
    [0, 18],
    [18, 4],
    [-18, 4],
  ];
  // The pop animates a CSS transform, which replaces a transform attribute on
  // the same element. The position lives on the outer group.
  return (
    <g data-testid={testId} transform={`translate(${cx} ${cy})`}>
      <g className="notehead-spark-group">
        {tips.map(([x, y], i) => (
          <polygon
            key={i}
            className="notehead-spark"
            points="0,-4 1.2,-1.2 4,0 1.2,1.2 0,4 -1.2,1.2 -4,0 -1.2,-1.2"
            transform={`translate(${x} ${y})`}
          />
        ))}
      </g>
    </g>
  );
}
