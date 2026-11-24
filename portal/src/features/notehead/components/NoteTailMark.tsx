import ethArt from "../assets/notehead-ship-eth-blue.png";
import { toSvg, type RegionId } from "../modules/sim";

const SRC_W = 1920;
const SRC_H = 1080;
/**
 * Opaque bounds of `notehead-ship-eth-blue.png` — must use alpha, not
 * luminance, or the black stem + eighth-note flag disappear into the void.
 */
const FRAME = { x: 787, y: 366, w: 403, h: 369 };
/** ~50% of the previous on-screen pickup size (~66 → ~33 view units). */
const SCALE = 0.082;
const DISP_W = FRAME.w * SCALE;
const DISP_H = FRAME.h * SCALE;
/** Notehead center in source pixels (glow oval, not the stem). */
const HEAD_CX = 1062;
const HEAD_CY = 467;

/**
 * Floating eighth-note Note-Tail pickup.
 * Full eth-blue art (stem + flag) with a pulsing soft glow.
 */
export function NoteTailMark({
  x,
  y,
  collected,
  regionId = "launch",
  testId = "note-tail",
}: {
  x: number;
  y: number;
  collected: boolean;
  regionId?: RegionId;
  testId?: string;
}) {
  if (collected) return null;
  const center = toSvg(x, y, regionId);
  // Place the notehead at the pickup point; stem + flag hang below/left.
  const shipX = -(HEAD_CX - FRAME.x) * SCALE;
  const shipY = -(HEAD_CY - FRAME.y) * SCALE;
  return (
    <g
      className="notehead-note-tail"
      transform={`translate(${center.x.toFixed(1)} ${center.y.toFixed(1)})`}
      pointerEvents="none"
      data-testid={testId}
    >
      <ellipse
        className="notehead-note-tail-halo"
        cx={0}
        cy={0}
        rx={DISP_W * 0.72}
        ry={DISP_H * 0.42}
      />
      <svg
        className="notehead-note-tail-ship"
        x={shipX}
        y={shipY}
        width={DISP_W}
        height={DISP_H}
        viewBox={`${FRAME.x} ${FRAME.y} ${FRAME.w} ${FRAME.h}`}
        overflow="visible"
      >
        <image
          href={ethArt.src}
          width={SRC_W}
          height={SRC_H}
          preserveAspectRatio="none"
        />
      </svg>
    </g>
  );
}
