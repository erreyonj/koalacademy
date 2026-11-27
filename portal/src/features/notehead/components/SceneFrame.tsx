import type { ReactNode } from "react";
import {
  isLandscapeRegion,
  landscapeCameraFrame,
  svgViewFor,
  type RegionId,
} from "../modules/sim";
import type { GesturePhase } from "../modules/view";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";

/**
 * The frame every region shares: sky, then rock, then whatever the region
 * adds. Art is clipped to that region's view box (portrait or landscape).
 * Landscape levels use a zoomed-out camera so the level reads smaller in the same stage.
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
  const content = svgViewFor(regionId);
  const landscape = isLandscapeRegion(regionId);
  const camera = landscape ? landscapeCameraFrame() : null;
  const W = camera?.view.w ?? content.w;
  const H = camera?.view.h ?? content.h;
  const playfield = (
    <>
      <Terrain regionId={regionId} />
      {children}
    </>
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      // Meet keeps the full art frame visible (no crop/zoom from slice).
      preserveAspectRatio="xMidYMid meet"
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
        {camera ? (
          <g transform={`translate(${camera.ox} ${camera.oy})`}>{playfield}</g>
        ) : (
          playfield
        )}
      </g>
    </svg>
  );
}
