import borealisArt from "../assets/notehead-borealis-collectible-main.png";
import { toSvg, type PitchName, type RegionId } from "../modules/sim";

/** Cropped 640x640 -> 256x256 orb plate; matches the original 56-unit 1920w scale. */
const SIZE = (56 * 640) / 1920;

/** Soft PNG orb at a logical-world Borealis point. */
export function BorealisMark({
  x,
  y,
  pitch,
  collected,
  regionId = "launch",
  testId = "borealis",
}: {
  x: number;
  y: number;
  pitch: PitchName;
  collected: boolean;
  regionId?: RegionId;
  testId?: string;
}) {
  if (collected) return null;
  const center = toSvg(x, y, regionId);
  return (
    <image
      className="notehead-borealis"
      href={borealisArt.src}
      x={center.x - SIZE / 2}
      y={center.y - SIZE / 2}
      width={SIZE}
      height={SIZE}
      preserveAspectRatio="xMidYMid meet"
      data-testid={testId}
      data-pitch={pitch}
    />
  );
}
