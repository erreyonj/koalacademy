import { Chord, Key, Note } from "tonal";

export type KeyMode = "major" | "minor";

/** Clockwise by fifths from C. Twelve pitch classes, 30° each. */
export const CIRCLE = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
] as const;

export type CircleTonic = (typeof CIRCLE)[number];

const STEP_DEG = 30;
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"] as const;
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"] as const;

export type KeyInfo = {
  tonic: CircleTonic;
  mode: KeyMode;
  title: string;
  triads: readonly string[];
  scale: readonly string[];
  alteration: number;
  keySignature: string;
  signatureLine: string;
  /** Pitch class of the relative key, circle spelling. */
  relativeTonic: CircleTonic;
  relativeMode: KeyMode;
  relativeLabel: string;
  /** Triad string in `triads` that is the relative tonic chord. */
  relativeTriad: string;
  subdominant: string;
  dominant: string;
  blurb: string;
};

const BLURBS: Record<string, string> = {
  "C:major":
    "The home key — no sharps or flats, and the map every other key is measured from.",
  "G:major":
    "One sharp. The first stop clockwise, and a common guitar and pop key.",
  "F:major":
    "One flat. One step counterclockwise — the plagal neighbor of C.",
  "D:major":
    "Two sharps. Bright, open, and all over fiddle tunes and choruses.",
  "A:minor":
    "C major’s relative: same pitches, darker starting place.",
  "E:minor":
    "G major’s relative. One sharp, and a home key for a lot of guitar music.",
  "D:minor":
    "F major’s relative. One flat, and a classic somber sitting place.",
};

export function wrapIndex(index: number): number {
  return ((index % CIRCLE.length) + CIRCLE.length) % CIRCLE.length;
}

export function prettyPitch(name: string): string {
  return name.replace(/([A-G])(#{1,2}|b{1,2})/g, (_, letter: string, acc: string) => {
    return letter + acc.replaceAll("#", "♯").replaceAll("b", "♭");
  });
}

export function tonicIndexFromName(name: string): number {
  const chroma = Note.chroma(name);
  if (chroma == null) return 0;
  const index = CIRCLE.findIndex((tonic) => Note.chroma(tonic) === chroma);
  return index >= 0 ? index : 0;
}

export function formatKeySignature(alteration: number): string {
  const n = Math.max(-7, Math.min(7, alteration));
  if (n === 0) return "No sharps or flats";
  if (n > 0) {
    const list = SHARP_ORDER.slice(0, n)
      .map((letter) => `${letter}♯`)
      .join(", ");
    return n === 1 ? `1 sharp (${list})` : `${n} sharps (${list})`;
  }
  const count = -n;
  const list = FLAT_ORDER.slice(0, count)
    .map((letter) => `${letter}♭`)
    .join(", ");
  return count === 1 ? `1 flat (${list})` : `${count} flats (${list})`;
}

function relativeTriadName(tonic: CircleTonic, mode: KeyMode): string {
  return mode === "minor" ? `${tonic}m` : tonic;
}

function triadRoot(triad: string): string | null {
  return Chord.get(triad).tonic || null;
}

function matchingTriad(
  triads: readonly string[],
  tonic: CircleTonic,
  mode: KeyMode,
): string {
  const chroma = Note.chroma(tonic);
  const found = triads.find((triad) => {
    const root = triadRoot(triad);
    return root != null && Note.chroma(root) === chroma;
  });
  return found ?? relativeTriadName(tonic, mode);
}

function fallbackBlurb(info: Omit<KeyInfo, "blurb">): string {
  const kind = info.mode === "major" ? "minor" : "major";
  return `${info.signatureLine}. Relative ${kind} is ${prettyPitch(info.relativeTonic)} ${kind}.`;
}

export function getKeyInfo(tonicIndex: number, mode: KeyMode): KeyInfo {
  const tonic = CIRCLE[wrapIndex(tonicIndex)];
  if (mode === "major") {
    const raw = Key.majorKey(tonic);
    const relativeTonic = CIRCLE[tonicIndexFromName(raw.minorRelative || "A")];
    const base = {
      tonic,
      mode,
      title: `${prettyPitch(tonic)} MAJOR`,
      triads: raw.triads,
      scale: raw.scale,
      alteration: raw.alteration,
      keySignature: raw.keySignature,
      signatureLine: formatKeySignature(raw.alteration),
      relativeTonic,
      relativeMode: "minor" as const,
      relativeLabel: `Relative: ${prettyPitch(relativeTonic)} minor`,
      relativeTriad: matchingTriad(raw.triads, relativeTonic, "minor"),
      subdominant: raw.scale[3] ?? "F",
      dominant: raw.scale[4] ?? "G",
    };
    const key = `${tonic}:${mode}`;
    return { ...base, blurb: BLURBS[key] ?? fallbackBlurb(base) };
  }

  const raw = Key.minorKey(tonic);
  const natural = raw.natural;
  const relativeTonic = CIRCLE[tonicIndexFromName(raw.relativeMajor || "C")];
  const base = {
    tonic,
    mode,
    title: `${prettyPitch(tonic)} MINOR`,
    triads: natural.triads,
    scale: natural.scale,
    alteration: raw.alteration,
    keySignature: raw.keySignature,
    signatureLine: formatKeySignature(raw.alteration),
    relativeTonic,
    relativeMode: "major" as const,
    relativeLabel: `Relative: ${prettyPitch(relativeTonic)} major`,
      relativeTriad: matchingTriad(natural.triads, relativeTonic, "major"),
    subdominant: natural.scale[3] ?? "D",
    dominant: natural.scale[4] ?? "E",
  };
  const key = `${tonic}:${mode}`;
  return { ...base, blurb: BLURBS[key] ?? fallbackBlurb(base) };
}

/** Counterclockwise neighbor — up a fourth. */
export function fourthIndex(tonicIndex: number): number {
  return wrapIndex(tonicIndex - 1);
}

/** Clockwise neighbor — up a fifth. */
export function fifthIndex(tonicIndex: number): number {
  return wrapIndex(tonicIndex + 1);
}

export function relativeOf(
  tonicIndex: number,
  mode: KeyMode,
): { tonicIndex: number; mode: KeyMode } {
  const info = getKeyInfo(tonicIndex, mode);
  return {
    tonicIndex: tonicIndexFromName(info.relativeTonic),
    mode: info.relativeMode,
  };
}

export const RESET_TONIC_INDEX = 0;
export const RESET_MODE: KeyMode = "major";

/** Canonical rotation that parks `tonicIndex` at 3 o’clock (C starts at 0°). */
export function canonicalRotation(tonicIndex: number): number {
  return wrapIndex(tonicIndex) * -STEP_DEG;
}

/** Next ring rotation, taking the shortest path (±180°) to the new tonic. */
export function shortestTargetRotation(currentDeg: number, tonicIndex: number): number {
  const canonical = canonicalRotation(tonicIndex);
  const delta = ((((canonical - currentDeg + 180) % 360) + 360) % 360) - 180;
  return currentDeg + delta;
}
