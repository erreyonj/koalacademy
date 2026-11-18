import { memo } from "react";
import type { RegionId } from "../modules/sim";
import { massesFor, type Point } from "../modules/terrain";

function ring(points: readonly Point[]): string {
  return `${stroke(points)} Z`;
}

function stroke(points: readonly Point[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");
}

/** Every rock in a region, back to front, in one ink. */
export const Terrain = memo(function Terrain({
  regionId,
}: {
  regionId: RegionId;
}) {
  return (
    <g className="notehead-masses" pointerEvents="none">
      {massesFor(regionId).map((mass) => (
        <g key={mass.id} data-testid={mass.id}>
          <path className="notehead-terrain" d={ring(mass.outline)} />
          {mass.ticks.length > 0 && (
            <path
              className="notehead-terrain-tick"
              d={mass.ticks.map(stroke).join(" ")}
            />
          )}
        </g>
      ))}
    </g>
  );
});
