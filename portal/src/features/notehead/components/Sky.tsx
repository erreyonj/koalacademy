import { memo } from "react";
import { seeded } from "../modules/rand";
import {
  svgViewFor,
  zigCameraFrame,
  type RegionId,
  type SvgViewSize,
} from "../modules/sim";
import flecks from "../assets/notehead-black-star-flecks.png";
import haze from "../assets/notehead-haze-30-opacity.png";
import photo from "../assets/notehead-space-bg-seamless.png";

const SEEDS: Record<RegionId, number> = {
  launch: 0x11,
  stairs: 0x23,
  notch: 0x37,
  zig: 0x5a,
};

const TINTS = ["#ffffff", "#d6e6ff", "#a9c9f5"] as const;

interface Star {
  x: number;
  y: number;
  r: number;
  tint: string;
  alpha: number;
}

interface Cloud {
  x: number;
  y: number;
  rx: number;
  ry: number;
  turn: number;
  alpha: number;
}

interface SkyField {
  stars: Star[];
  glints: Star[];
  clouds: Cloud[];
  w: number;
  h: number;
}

function frameFor(regionId: RegionId): SvgViewSize {
  return regionId === "zig" ? zigCameraFrame().view : svgViewFor(regionId);
}

function buildSky(regionId: RegionId): SkyField {
  const { w: W, h: H } = frameFor(regionId);
  const rand = seeded(SEEDS[regionId]);

  // Clouds follow one slanted lane across the frame, like the photo's band.
  const lane = {
    x0: -20 + rand() * (W * 0.3),
    y0: 20 + rand() * (H * 0.25),
    x1: W * 0.75 + rand() * (W * 0.2),
    y1: H * 0.45 + rand() * (H * 0.3),
  };
  const clouds: Cloud[] = [];
  for (let index = 0; index < 6; index++) {
    const along = (index + rand() * 0.6) / 6;
    clouds.push({
      x: lane.x0 + (lane.x1 - lane.x0) * along + (rand() - 0.5) * 50,
      y: lane.y0 + (lane.y1 - lane.y0) * along + (rand() - 0.5) * 50,
      rx: 26 + rand() * 34,
      ry: 14 + rand() * 20,
      turn: rand() * 180,
      alpha: 0.3 + rand() * 0.4,
    });
  }

  const stars: Star[] = [];
  for (let index = 0; index < 130; index++) {
    const size = rand();
    stars.push({
      x: rand() * W,
      y: rand() * H,
      r: 0.2 + size * size * size * 0.75,
      tint: TINTS[Math.floor(rand() * TINTS.length)] ?? TINTS[0],
      alpha: 0.35 + rand() * 0.65,
    });
  }

  const glints: Star[] = [];
  for (let index = 0; index < 7; index++) {
    glints.push({
      x: 8 + rand() * (W - 16),
      y: 8 + rand() * (H - 16),
      r: 1.6 + rand() * 1.5,
      tint: TINTS[index % TINTS.length] ?? TINTS[0],
      alpha: 0.7 + rand() * 0.3,
    });
  }

  return { stars, glints, clouds, w: W, h: H };
}

const fields = new Map<RegionId, SkyField>();

function skyFor(regionId: RegionId): SkyField {
  let field = fields.get(regionId);
  if (!field) {
    field = buildSky(regionId);
    fields.set(regionId, field);
  }
  return field;
}

/** Four-point star, pinched at the waist. */
function glintPath(r: number): string {
  const w = r * 0.22;
  return `M 0 ${-r} L ${w} ${-w} L ${r} 0 L ${w} ${w} L 0 ${r} L ${-w} ${w} L ${-r} 0 L ${-w} ${-w} Z`;
}

/**
 * Drawn star field over a dim seamless space plate that crawls on +x.
 * Memoized because the view re-renders every frame.
 */
export const Sky = memo(function Sky({ regionId }: { regionId: RegionId }) {
  const field = skyFor(regionId);
  const { w: W, h: H } = field;
  return (
    <g className="notehead-sky" pointerEvents="none">
      <defs>
        <linearGradient id={`nh-sky-base-${regionId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="notehead-sky-top" />
          <stop offset="1" className="notehead-sky-bottom" />
        </linearGradient>
        <radialGradient id={`nh-sky-cloud-${regionId}`}>
          <stop offset="0" className="notehead-sky-cloud" stopOpacity="0.5" />
          <stop offset="0.6" className="notehead-sky-cloud" stopOpacity="0.16" />
          <stop offset="1" className="notehead-sky-cloud" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={`nh-sky-wash-${regionId}`}
          gradientUnits="userSpaceOnUse"
          cx={0}
          cy={H}
          r={Math.max(W, H) * 0.85}
        >
          <stop offset="0" className="notehead-sky-wash" stopOpacity="0.3" />
          <stop offset="1" className="notehead-sky-wash" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`nh-sky-clip-${regionId}`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill={`url(#nh-sky-base-${regionId})`} />
      {/* Seamless tile strip: translate one width, loop — no crossfade needed. */}
      <g clipPath={`url(#nh-sky-clip-${regionId})`}>
        <g
          className="notehead-sky-drift"
          style={{ ["--nh-sky-w" as string]: `${W}` }}
        >
          <image
            href={photo.src}
            x={0}
            width={W}
            height={H}
            opacity={0.3}
            preserveAspectRatio="xMidYMid slice"
          />
          <image
            href={photo.src}
            x={W}
            width={W}
            height={H}
            opacity={0.3}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      </g>
      {[
        { src: haze.src, opacity: 0.1 },
        { src: flecks.src, opacity: 0.5 },
      ].map((layer) => (
        <image
          key={layer.src}
          href={layer.src}
          width={W}
          height={H}
          opacity={layer.opacity}
          preserveAspectRatio="xMidYMid slice"
        />
      ))}
      {field.clouds.map((cloud, index) => (
        <ellipse
          key={index}
          cx={cloud.x}
          cy={cloud.y}
          rx={cloud.rx}
          ry={cloud.ry}
          opacity={cloud.alpha}
          fill={`url(#nh-sky-cloud-${regionId})`}
          transform={`rotate(${cloud.turn.toFixed(1)} ${cloud.x.toFixed(1)} ${cloud.y.toFixed(1)})`}
        />
      ))}
      <rect width={W} height={H} fill={`url(#nh-sky-wash-${regionId})`} />
      {field.stars.map((star, index) => (
        <circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill={star.tint}
          opacity={star.alpha}
        />
      ))}
      {field.glints.map((star, index) => (
        <path
          key={index}
          d={glintPath(star.r)}
          fill={star.tint}
          opacity={star.alpha}
          transform={`translate(${star.x.toFixed(1)} ${star.y.toFixed(1)})`}
        />
      ))}
    </g>
  );
});
