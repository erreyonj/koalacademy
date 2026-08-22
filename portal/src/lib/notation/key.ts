import { Key, Note, Scale } from "tonal";
import type { AccidentalFamily, ScoreExcerpt } from "./types";

export type KeyMode = "major" | "minor";

export type ParsedKey = {
  tonic: string;
  mode: KeyMode;
  alteration: number;
  /** VexFlow / sidebar name: "G", "Am". */
  name: string;
};

const MINOR_SUFFIX = /m$/;

export function parseKeyName(key: string): ParsedKey {
  const trimmed = key.trim() || "C";
  if (MINOR_SUFFIX.test(trimmed)) {
    const tonic = trimmed.slice(0, -1);
    const info = Key.minorKey(tonic);
    return {
      tonic: info.tonic || tonic,
      mode: "minor",
      alteration: info.alteration || 0,
      name: `${info.tonic || tonic}m`,
    };
  }
  const info = Key.majorKey(trimmed);
  return {
    tonic: info.tonic || trimmed,
    mode: "major",
    alteration: info.alteration || 0,
    name: info.tonic || trimmed,
  };
}

export function keyFromAlteration(alteration: number, mode: KeyMode): string {
  const clamped = Math.max(-7, Math.min(7, alteration));
  const tonic = Key.majorTonicFromKeySignature(clamped) ?? "C";
  if (mode === "major") return tonic;
  const relative = Key.majorKey(tonic).minorRelative || "A";
  return `${relative}m`;
}

export function stepKey(
  key: string,
  action: "add" | "remove",
  family: AccidentalFamily,
): string {
  const parsed = parseKeyName(key);
  let next = parsed.alteration;
  if (action === "add") {
    if (parsed.alteration === 0) next = family === "sharp" ? 1 : -1;
    else if (parsed.alteration > 0) next = parsed.alteration + 1;
    else next = parsed.alteration - 1;
  } else if (parsed.alteration > 0) {
    next = parsed.alteration - 1;
  } else if (parsed.alteration < 0) {
    next = parsed.alteration + 1;
  }
  return keyFromAlteration(next, parsed.mode);
}

export function setKeyMode(key: string, mode: KeyMode): string {
  return keyFromAlteration(parseKeyName(key).alteration, mode);
}

export function familyFromKey(key: string): AccidentalFamily {
  return parseKeyName(key).alteration < 0 ? "flat" : "sharp";
}

/** Pitch classes in the key, e.g. G major → ["G", "A", "B", "C", "D", "E", "F#"]. */
export function keyPitchClasses(key: string): string[] {
  const { tonic, mode } = parseKeyName(key);
  const scaleName = mode === "major" ? `${tonic} major` : `${tonic} minor`;
  return Scale.get(scaleName).notes;
}

/**
 * Apply the key signature to a natural staff letter+octave (e.g. "F4" in G → "F#4").
 */
export function applyKeyToPitch(letterOctave: string, key: string): string {
  const parsed = Note.get(letterOctave);
  const letter = parsed.letter;
  if (!letter) return letterOctave;
  const match = keyPitchClasses(key).find((pc) => pc[0] === letter);
  const octave = parsed.oct ?? 4;
  return `${match ?? letter}${octave}`;
}

export type SplitPitch = {
  letter: string;
  accidental: "#" | "b" | null;
  octave: number;
};

export function splitPitch(pitch: string): SplitPitch {
  const parsed = Note.get(pitch);
  const acc = parsed.acc === "#" || parsed.acc === "b" ? parsed.acc : null;
  return {
    letter: parsed.letter || "C",
    accidental: acc,
    octave: parsed.oct ?? 4,
  };
}

/** True when the written accidental is already implied by the key signature. */
export function keyImpliesAccidental(
  key: string,
  letter: string,
  accidental: "#" | "b" | null,
): boolean {
  const match = keyPitchClasses(key).find((pc) => pc[0] === letter);
  if (!match) return accidental === null;
  const implied: "#" | "b" | null = match.includes("#")
    ? "#"
    : match.includes("b")
      ? "b"
      : null;
  return implied === accidental;
}

export function scalePitches(key: string, startOctave = 4): string[] {
  const pcs = keyPitchClasses(key);
  if (pcs.length === 0) return [];
  let octave = startOctave;
  let prevMidi = -1;
  const pitches: string[] = [];
  for (const pc of pcs) {
    let pitch = `${pc}${octave}`;
    const midi = Note.midi(pitch) ?? 0;
    if (midi < prevMidi) {
      octave += 1;
      pitch = `${pc}${octave}`;
    }
    prevMidi = Note.midi(pitch) ?? 0;
    pitches.push(pitch);
  }
  const tonic = pcs[0];
  let top = `${tonic}${octave}`;
  if ((Note.midi(top) ?? 0) <= prevMidi) {
    top = `${tonic}${octave + 1}`;
  }
  pitches.push(top);
  return pitches;
}

export const COMMON_MAJOR_KEYS = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "F",
  "Bb",
  "Eb",
  "Ab",
] as const;

export const COMMON_MINOR_KEYS = [
  "Am",
  "Em",
  "Bm",
  "F#m",
  "C#m",
  "Dm",
  "Gm",
  "Cm",
] as const;

export function withKey(score: ScoreExcerpt, key: string): ScoreExcerpt {
  return { ...score, key: parseKeyName(key).name };
}
