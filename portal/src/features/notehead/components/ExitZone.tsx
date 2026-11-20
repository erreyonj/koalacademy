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

/**
 * Hard-hits GI cue under the hull HUD: filled up-arrow with a pip tip —
 * distinct from the exit caret — aimed at the hull pips.
 */
export function HullCueMark({ lit }: { lit: boolean }) {
  if (!lit) return null;
  return (
    <span className="notehead-hull-cue" data-testid="hull-cue" aria-hidden="true">
      <svg
        className="notehead-hull-cue-svg"
        viewBox="0 0 28 30"
        width="1.35rem"
        height="1.45rem"
      >
        {/* Pip tip (matches hull squares) sits nearest the HUD */}
        <rect
          className="notehead-hull-cue-pip"
          x="10.5"
          y="1"
          width="7"
          height="7"
          rx="1.2"
        />
        {/* Filled arrowhead pointing up at the pips */}
        <path
          className="notehead-hull-cue-arrow"
          d="M14 10 L24 20 L17.5 20 L17.5 28 L10.5 28 L10.5 20 L4 20 Z"
        />
      </svg>
    </span>
  );
}
