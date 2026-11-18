import borealisArt from "../assets/notehead-borealis-collectible-main.png";
import { toSvg, type PitchName, type RegionId } from "../modules/sim";

/** Soft PNG orb at a logical-world Borealis point. */
export function BorealisMark({
  x,
  y,
  pitch,
  collected,
  active = true,
  regionId = "launch",
  testId = "borealis",
}: {
  x: number;
  y: number;
  pitch: PitchName;
  collected: boolean;
  /** False while waiting for an earlier gem in goal order. */
  active?: boolean;
  regionId?: RegionId;
  testId?: string;
}) {
  if (collected) return null;
  const center = toSvg(x, y, regionId);
  const size = active ? 56 : 44;
  return (
    <image
      className={
        active ? "notehead-borealis" : "notehead-borealis is-locked"
      }
      href={borealisArt.src}
      x={center.x - size / 2}
      y={center.y - size / 2}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      data-testid={testId}
      data-pitch={pitch}
      data-active={active ? "true" : "false"}
    />
  );
}
