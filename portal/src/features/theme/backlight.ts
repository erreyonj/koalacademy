import type { Theme } from "./ThemeProvider";

export type BacklightSwatch = {
  id: string;
  label: string;
  group: "brand" | "statement";
  /** Button face. Brand or statement hex. */
  face: string;
  /** Raised lip. A darker step of the face. */
  deep: string;
  /** Text on the face. Passes WCAG AA against `face`. */
  ink: string;
  /** Screen glow. Matches `face` when that already reads on the black screen. */
  glow: string;
  /** Highlight text on slate and pith. Darker than a light face, or the face itself when that face is already dark. */
  mark: string;
};

/**
 * Brand palette from docs/brand-palette.md, plus sky, yellow, and red from the
 * MPC hardware accents. Same set in both themes. Pop is the default.
 * Keep the bootstrap palette in layout.tsx in sync. `ink` is the text companion.
 */
export const BRAND_BACKLIGHT: BacklightSwatch[] = [
  { id: "pop", label: "Pop", group: "brand", face: "#f56e8f", deep: "#b04f67", ink: "#000000", glow: "#f56e8f", mark: "#b04f67" },
  { id: "mist", label: "Mist", group: "brand", face: "#c0cbe1", deep: "#8a92a2", ink: "#000000", glow: "#c0cbe1", mark: "#8a92a2" },
  { id: "slate", label: "Slate", group: "brand", face: "#99a4b8", deep: "#6e7684", ink: "#000000", glow: "#99a4b8", mark: "#000000" },
  { id: "charcoal", label: "Charcoal", group: "brand", face: "#737a89", deep: "#535863", ink: "#000000", glow: "#979da8", mark: "#535863" },
  { id: "eucalyptus", label: "Eucalyptus", group: "brand", face: "#a8c3b0", deep: "#798c7f", ink: "#000000", glow: "#a8c3b0", mark: "#798c7f" },
  { id: "leaf", label: "Leaf", group: "brand", face: "#5b8f7b", deep: "#426759", ink: "#000000", glow: "#79a393", mark: "#426759" },
  { id: "canopy", label: "Canopy", group: "brand", face: "#2f5648", deep: "#223e34", ink: "#ffffff", glow: "#8ba099", mark: "#2f5648" },
  { id: "pith", label: "Pith", group: "brand", face: "#ede4d4", deep: "#aba499", ink: "#000000", glow: "#ede4d4", mark: "#aba499" },
  { id: "bamboo", label: "Bamboo", group: "brand", face: "#d4c4a8", deep: "#998d79", ink: "#000000", glow: "#d4c4a8", mark: "#998d79" },
  { id: "culm", label: "Culm", group: "brand", face: "#a8906c", deep: "#79684e", ink: "#000000", glow: "#ad9775", mark: "#79684e" },
  { id: "bark", label: "Bark", group: "brand", face: "#6e5a42", deep: "#4f4130", ink: "#ffffff", glow: "#a5998a", mark: "#6e5a42" },
  { id: "sky", label: "Sky", group: "statement", face: "#a9c6e8", deep: "#7a8fa7", ink: "#000000", glow: "#a9c6e8", mark: "#7a8fa7" },
  { id: "yellow", label: "Yellow", group: "statement", face: "#e3b23c", deep: "#a3802b", ink: "#000000", glow: "#e3b23c", mark: "#a3802b" },
  { id: "red", label: "Red", group: "statement", face: "#d96459", deep: "#9c4840", ink: "#000000", glow: "#e08077", mark: "#9c4840" },
];

/** Earlier wheels stored these ids. Map them onto the closest brand or statement swatch. */
const LEGACY_IDS: Record<string, string> = {
  pink: "pop",
  butter: "yellow",
  mint: "eucalyptus",
  lilac: "pop",
  peach: "bamboo",
  orange: "red",
  lime: "leaf",
  cyan: "sky",
  violet: "pop",
};

export function backlightKey(theme: Theme): string {
  return `ka-backlight-${theme}`;
}

export function backlightPalette(_theme: Theme): BacklightSwatch[] {
  return BRAND_BACKLIGHT;
}

export function backlightSwatch(_theme: Theme, id: string | null): BacklightSwatch {
  const resolved = (id && LEGACY_IDS[id]) || id;
  return BRAND_BACKLIGHT.find((swatch) => swatch.id === resolved) ?? BRAND_BACKLIGHT[0];
}

export function readBacklightId(theme: Theme): string | null {
  try {
    return localStorage.getItem(backlightKey(theme));
  } catch {
    return null;
  }
}

export function applyBacklight(swatch: BacklightSwatch) {
  const root = document.documentElement;
  root.style.setProperty("--ka-backlight", swatch.glow);
  root.style.setProperty("--ka-backlight-deep", swatch.deep);
  root.style.setProperty("--ka-backlight-face", swatch.face);
  root.style.setProperty("--ka-backlight-ink", swatch.ink);
  root.style.setProperty("--ka-backlight-mark", swatch.mark);
}

export function storeBacklight(theme: Theme, swatch: BacklightSwatch) {
  applyBacklight(swatch);
  try {
    localStorage.setItem(backlightKey(theme), swatch.id);
  } catch {
    /* private mode / blocked storage */
  }
}
