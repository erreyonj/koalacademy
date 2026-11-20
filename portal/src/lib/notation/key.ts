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

const MAJOR_SOLFEGE = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"] as const;
/** Do-based natural minor (tonic = Do). */
const MINOR_SOLFEGE = ["Do", "Re", "Me", "Fa", "Sol", "Le", "Te"] as const;

/**
 * 0-based degree in the key's scale, or -1 when the pitch is outside the scale.
 */
export function scaleDegreeIndex(pitch: string, key: string): number {
  const pcs = keyPitchClasses(key);
  const chroma = Note.chroma(pitch);
  if (chroma != null) {
    const byChroma = pcs.findIndex((pc) => Note.chroma(pc) === chroma);
    if (byChroma >= 0) return byChroma;
  }
  const letter = Note.get(pitch).letter;
  if (!letter) return -1;
  return pcs.findIndex((pc) => pc[0] === letter);
}

/** Scale-degree numeral (1–7) for a pitch in the current key/mode. */
export function scaleDegreeLabel(pitch: string, key: string): string {
  const idx = scaleDegreeIndex(pitch, key);
  return idx >= 0 ? String(idx + 1) : "?";
}

/** Movable-do solfege for a pitch in the current key/mode. */
export function solfegeLabel(pitch: string, key: string): string {
  const idx = scaleDegreeIndex(pitch, key);
  if (idx < 0) return "?";
  const mode = parseKeyName(key).mode;
  return (mode === "major" ? MAJOR_SOLFEGE : MINOR_SOLFEGE)[idx];
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

/** One octave of a named scale, e.g. "G dorian" or "Bb minor". */
export function scalePitchesFor(scaleName: string, startOctave = 4): string[] {
  const pcs = Scale.get(scaleName).notes;
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

export function scalePitches(key: string, startOctave = 4): string[] {
  const { tonic, mode } = parseKeyName(key);
  const scaleName = mode === "major" ? `${tonic} major` : `${tonic} minor`;
  return scalePitchesFor(scaleName, startOctave);
}

/** One or two octaves of a named scale (15 pitches for two octaves). */
export function scalePitchesForOctaves(
  scaleName: string,
  startOctave = 4,
  octaves: 1 | 2 = 1,
): string[] {
  if (octaves === 1) return scalePitchesFor(scaleName, startOctave);
  const first = scalePitchesFor(scaleName, startOctave);
  const second = scalePitchesFor(scaleName, startOctave + 1);
  if (first.length === 0 || second.length === 0) return first;
  return [...first.slice(0, -1), ...second];
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

/** Build a key name from a spelling-letter tonic, e.g. F + major → "F", F + minor → "Fm". */
export function keyFromTonicLetter(letter: string, mode: KeyMode): string {
  const tonic = (letter.trim().charAt(0) || "C").toUpperCase();
  return parseKeyName(mode === "major" ? tonic : `${tonic}m`).name;
}

/** Change key and rewrite note pitches to match the new signature (naturals + key accidentals). */
export function remapScoreToKey(score: ScoreExcerpt, key: string): ScoreExcerpt {
  const name = parseKeyName(key).name;
  return {
    ...score,
    key: name,
    measures: score.measures.map((measure) => ({
      events: measure.events.map((event) => {
        if (event.kind !== "note") return event;
        const { letter, octave } = splitPitch(event.pitch);
        return {
          ...event,
          pitch: applyKeyToPitch(`${letter}${octave}`, name),
        };
      }),
    })),
  };
}
