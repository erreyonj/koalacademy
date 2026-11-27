import { memo, type ReactNode } from "react";
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
 * Static backdrop SVG (sky + rock) isolated on its own layer so per-frame
 * ship, band, and trajectory mutations never re-rasterize the background.
 */
const SceneBackdrop = memo(function SceneBackdrop({
  regionId,
}: {
  regionId: RegionId;
}) {
  const content = svgViewFor(regionId);
  const camera = isLandscapeRegion(regionId) ? landscapeCameraFrame() : null;
  const W = camera?.view.w ?? content.w;
  const H = camera?.view.h ?? content.h;
  return (
    <svg
      className="notehead-backdrop-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`nh-bg-frame-${regionId}`}>
          <rect width={W} height={H} rx={7} />
        </clipPath>
      </defs>
      <g clipPath={`url(#nh-bg-frame-${regionId})`}>
        <Sky regionId={regionId} />
        {camera ? (
          <g transform={`translate(${camera.ox} ${camera.oy})`}>
            <Terrain regionId={regionId} />
          </g>
        ) : (
          <Terrain regionId={regionId} />
        )}
      </g>
    </svg>
  );
});

/**
 * The frame every region shares: static sky + rock backdrop behind the live
 * foreground SVG. Art is clipped to that region's view box (portrait or landscape).
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
  return (
    <div className="notehead-frame-stack">
      <SceneBackdrop regionId={regionId} />
      <svg
        className="notehead-live-svg"
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
          {camera ? (
            <g transform={`translate(${camera.ox} ${camera.oy})`}>{children}</g>
          ) : (
            children
          )}
        </g>
      </svg>
    </div>
  );
}
