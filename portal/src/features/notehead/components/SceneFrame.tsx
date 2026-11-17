import type { ReactNode } from "react";
import { svgViewFor, type RegionId } from "../sim";
import type { GesturePhase } from "../view";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";

/**
 * The frame every region shares: sky, then rock, then whatever the region
 * adds. Art is clipped to that region's view box (portrait or landscape).
 */
export function SceneFrame({
  regionId,
  label,
  testId,
  phase,
  children,
}: {
  regionId: RegionId;
  label: string;
  testId: string;
  phase: GesturePhase;
  children: ReactNode;
}) {
  const { w: W, h: H } = svgViewFor(regionId);
  const landscape = regionId === "zig";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      // Zig fills its stage; slice covers the box without letterboxing.
      preserveAspectRatio={landscape ? "xMidYMid slice" : "xMidYMid meet"}
      role="img"
      aria-label={label}
      data-testid={testId}
      data-phase={phase}
      data-view={landscape ? "landscape" : "portrait"}
    >
      <defs>
        <clipPath id={`nh-frame-${regionId}`}>
          <rect width={W} height={H} rx={7} />
        </clipPath>
      </defs>
      <g clipPath={`url(#nh-frame-${regionId})`}>
        <Sky regionId={regionId} />
        <Terrain regionId={regionId} />
        {children}
      </g>
    </svg>
  );
}
