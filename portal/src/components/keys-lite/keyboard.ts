/** Top-down piano geometry for the scale-hand widget. Units are SVG viewBox. */

export const VIEW_W = 720;
export const VIEW_H = 360;

export const LEFT = 48;
export const WHITE_COUNT = 12;
export const WHITE_W = 52;
export const WHITE_H = 250;
export const KEY_TOP = 36;
export const BLACK_W = 22;
export const BLACK_H = 150;
export const KEY_GAP = 2;

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type WhiteLetter = (typeof LETTERS)[number];

const SHARP_AFTER: Record<WhiteLetter, string | null> = {
  C: "C#",
  D: "D#",
  E: null,
  F: "F#",
  G: "G#",
  A: "A#",
  B: null,
};

const FLAT_AFTER: Record<WhiteLetter, string | null> = {
  C: "Db",
  D: "Eb",
  E: null,
  F: "Gb",
  G: "Ab",
  A: "Bb",
  B: null,
};

const LOW_TONICS = new Set(["A", "Bb", "B"]);

export type Point = { x: number; y: number };

export function keyboardStart(tonic: string): { letter: WhiteLetter; octave: number } {
  if (LOW_TONICS.has(tonic)) return { letter: "A", octave: 3 };
  return { letter: "C", octave: 4 };
}

export function letterAt(index: number, startLetter: WhiteLetter): WhiteLetter {
  const startIdx = LETTERS.indexOf(startLetter);
  return LETTERS[(startIdx + index) % 7];
}

export function whiteNote(
  index: number,
  startLetter: WhiteLetter = "C",
  startOctave = 4,
): string {
  const startIdx = LETTERS.indexOf(startLetter);
  const abs = startIdx + index;
  const letter = LETTERS[abs % 7];
  const octave = startOctave + Math.floor(abs / 7);
  return `${letter}${octave}`;
}

export function whiteLetter(index: number, startLetter: WhiteLetter = "C"): string {
  return letterAt(index, startLetter);
}

export function whiteX(index: number): number {
  return LEFT + index * WHITE_W;
}

export function whiteCenter(index: number): number {
  return whiteX(index) + WHITE_W / 2;
}

export function strikePoint(whiteIndex: number, thumb: boolean): Point {
  return {
    x: whiteCenter(whiteIndex),
    y: KEY_TOP + WHITE_H * (thumb ? 0.86 : 0.68),
  };
}

export type WhiteKey = {
  index: number;
  note: string;
  letter: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BlackKey = {
  afterIndex: number;
  note: string;
  flat: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function whiteKeys(
  startLetter: WhiteLetter = "C",
  startOctave = 4,
): WhiteKey[] {
  return Array.from({ length: WHITE_COUNT }, (_, index) => ({
    index,
    note: whiteNote(index, startLetter, startOctave),
    letter: whiteLetter(index, startLetter),
    x: whiteX(index) + KEY_GAP / 2,
    y: KEY_TOP,
    width: WHITE_W - KEY_GAP,
    height: WHITE_H,
  }));
}

export function blackKeys(
  startLetter: WhiteLetter = "C",
  startOctave = 4,
): BlackKey[] {
  return Array.from({ length: WHITE_COUNT }, (_, index) => index)
    .map((afterIndex) => {
      const letter = letterAt(afterIndex, startLetter);
      const sharp = SHARP_AFTER[letter];
      const flat = FLAT_AFTER[letter];
      if (!sharp || !flat) return null;
      const natural = whiteNote(afterIndex, startLetter, startOctave);
      const octave = Number(natural.slice(-1));
      return {
        afterIndex,
        note: `${sharp}${octave}`,
        flat: `${flat}${octave}`,
        x: whiteX(afterIndex + 1) - BLACK_W / 2,
        y: KEY_TOP,
        width: BLACK_W,
        height: BLACK_H,
      };
    })
    .filter((key): key is BlackKey => key !== null);
}
