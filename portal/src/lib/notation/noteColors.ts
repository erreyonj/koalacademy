import { splitPitch } from "./key";

export const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type NoteLetter = (typeof NOTE_LETTERS)[number];

export type PaletteId = "roygbiv" | "fifths";

export type NotePalette = {
  id: PaletteId;
  label: string;
  colors: Record<NoteLetter, string>;
};

/** Boomwhacker-style ROYGBIV (absolute pitch). */
const ROYGBIV_COLORS: Record<NoteLetter, string> = {
  C: "#e53935",
  D: "#fb8c00",
  E: "#fdd835",
  F: "#43a047",
  G: "#1e88e5",
  A: "#3949ab",
  B: "#8e24aa",
};

/** Circle-of-fifths walk from C: C → G → D → A → E → B → F. */
const FIFTHS_ORDER: NoteLetter[] = ["C", "G", "D", "A", "E", "B", "F"];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toByte = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** Fifths palette: C = #313ee8, each perfect fifth +360/7° hue. */
function buildFifthsColors(cHex = "#313ee8"): Record<NoteLetter, string> {
  const { h, s, l } = hexToHsl(cHex);
  const step = 360 / 7;
  const colors = {} as Record<NoteLetter, string>;
  FIFTHS_ORDER.forEach((letter, i) => {
    colors[letter] = hslToHex(h + step * i, s, l);
  });
  return colors;
}

export const PALETTES: readonly NotePalette[] = [
  { id: "roygbiv", label: "ROYGBIV", colors: ROYGBIV_COLORS },
  { id: "fifths", label: "Fifths", colors: buildFifthsColors() },
] as const;

const PALETTE_BY_ID = Object.fromEntries(
  PALETTES.map((palette) => [palette.id, palette]),
) as Record<PaletteId, NotePalette>;

/** @deprecated Prefer colorForPitch(pitch, paletteId). Kept for call sites mid-migration. */
export const LETTER_COLORS: Record<string, string> = ROYGBIV_COLORS;

export function getPalette(id: PaletteId = "roygbiv"): NotePalette {
  return PALETTE_BY_ID[id] ?? PALETTE_BY_ID.roygbiv;
}

/** Seven hexes in C–B display order for menu swatches. */
export function swatchesFor(paletteId: PaletteId = "roygbiv"): string[] {
  const { colors } = getPalette(paletteId);
  return NOTE_LETTERS.map((letter) => colors[letter]);
}

export function colorForPitch(
  pitch: string,
  paletteId: PaletteId = "roygbiv",
): string {
  const letter = splitPitch(pitch).letter.toUpperCase() as NoteLetter;
  const { colors } = getPalette(paletteId);
  return colors[letter] ?? "#111111";
}
