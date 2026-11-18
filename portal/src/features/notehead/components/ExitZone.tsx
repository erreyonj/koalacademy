import type { ExitZone } from "../modules/exit-zone";

/** Pulsing purple chevron pointing at the level exit. */
export function ExitMark({
  zone,
  lit,
}: {
  zone: ExitZone;
  /** False while Borealis still remain (hidden). */
  lit: boolean;
}) {
  if (!lit) return null;
  const { ax, ay, facing } = zone;
  const chevron =
    facing === "up"
      ? `M ${ax - 10} ${ay + 6} L ${ax} ${ay - 6} L ${ax + 10} ${ay + 6}`
      : `M ${ax - 6} ${ay - 10} L ${ax + 6} ${ay} L ${ax - 6} ${ay + 10}`;

  return (
    <g className="notehead-exit" data-testid="exit-zone" data-facing={facing}>
      <path className="notehead-exit-arrow" d={chevron} />
    </g>
  );
}
