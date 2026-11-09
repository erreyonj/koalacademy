"use client";

interface LensViewProps {
  sectorId: string;
  sectorName: string;
  revealName: string;
  lensImage: string;
  lensClipGlobe?: boolean;
  solvedCount: number;
}

const BLUR_PX = [10, 6, 3, 0] as const;
const BRIGHTNESS = [0.42, 0.62, 0.82, 1] as const;

/**
 * Front view through the objective lens. The sector photo starts
 * blurred and dim, sharpening with each aligned collar until it is fully in view.
 */
export function LensView({
  sectorId,
  sectorName,
  revealName,
  lensImage,
  lensClipGlobe = false,
  solvedCount,
}: LensViewProps) {
  const clamped = Math.max(0, Math.min(3, solvedCount));
  const inView = clamped === 3;
  const caption = inView ? `${revealName} · In view` : `Signal ${clamped} / 3`;

  return (
    <figure
      className={`obs-lens-view${inView ? " is-in-view" : ""}`}
      data-testid="lens-view"
      data-solved={clamped}
      data-sector={sectorId}
      aria-label={`${sectorName} through the telescope lens, ${clamped} of 3 collars aligned`}
    >
      <div className="obs-lens-eyepiece">
        <div className="obs-lens-sky">
          <img
            className={`obs-lens-photo${lensClipGlobe ? " is-globe" : ""}`}
            src={lensImage}
            alt=""
            draggable={false}
            data-testid="lens-photo"
            style={{
              filter: `blur(${BLUR_PX[clamped]}px) brightness(${BRIGHTNESS[clamped]})`,
            }}
          />
        </div>
        <svg
          className="obs-lens-reticle"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <g
            stroke={inView ? "#7fb08a" : "#bdd7ee"}
            strokeOpacity="0.55"
            strokeWidth="0.9"
            fill="none"
          >
            <line x1="100" y1="14" x2="100" y2="186" />
            <line x1="14" y1="100" x2="186" y2="100" />
            <circle cx="100" cy="100" r="28" />
            <circle cx="100" cy="100" r="58" strokeDasharray="3 4" />
          </g>
        </svg>
        <div className="obs-lens-ring" aria-hidden="true" />
      </div>
      <figcaption className="obs-lens-caption" data-testid="lens-caption">
        {caption}
      </figcaption>
    </figure>
  );
}
