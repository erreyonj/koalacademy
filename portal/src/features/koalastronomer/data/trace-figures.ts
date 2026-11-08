import type { Difficulty } from "../engine/game-state";
import type { TraceFigure } from "../engine/trace-engine";

/**
 * 36 hand-authored one-line Eulerian trace figures across 3 difficulties (12 per difficulty):
 *
 * - Easy (4–6 lines, 4–5 nodes): approachable single-loop + stem figures
 *   (Mercury: 4+4+4=12, Outer Belt: 4+4+5=13, Distant Region: 4+5+5=14, New Body: 5+5+6=16; Total = 55).
 * - Medium (6–9 lines, 5–7 nodes): double-loop and bridged optical lattices with degree-4 crossroads
 *   (Mercury: 6+6+6=18, Outer Belt: 6+7+7=20, Distant Region: 7+8+8=23, New Body: 8+8+9=25; Total = 86 lines;
 *    ring Calibration cost stays capped at the base 4–6 Cal per ring = 55 total).
 * - Hard (8–11 lines, 6–8 nodes): dense multi-mesh prism and reticle graphs with multiple degree-4 hubs
 *   (Mercury: 8+8+9=25, Outer Belt: 9+9+9=27, Distant Region: 9+10+10=29, New Body: 10+11+11=32; Total = 113 lines;
 *    ring cost = 1 Cal per line = 113 total, paired with 2x Archive rewards = 130 total).
 */

export const EASY_TRACE_FIGURES: readonly TraceFigure[] = [
  // —— Mercury Sector (4 + 4 + 4 = 12) ——
  {
    id: "mercury-range",
    title: "Inner Prism Mount",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 50, y: 42 },
      { id: "c", x: 22, y: 82 },
      { id: "d", x: 78, y: 82 },
    ],
    // Stem a-b into triangle b-c-d (odd nodes: a, b)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "b"],
    ],
  },
  {
    id: "mercury-focus",
    title: "Hairline Coil",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 20, y: 22 },
      { id: "b", x: 80, y: 22 },
      { id: "c", x: 50, y: 56 },
      { id: "d", x: 20, y: 86 },
    ],
    // Upper triangle a-b-c with filament lead c-d (odd nodes: c, d)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["c", "d"],
    ],
  },
  {
    id: "mercury-alignment",
    title: "Crosshair Bezel",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 14 },
      { id: "b", x: 86, y: 50 },
      { id: "c", x: 50, y: 86 },
      { id: "d", x: 14, y: 50 },
    ],
    // Diamond loop a-b-c-d-a (all even degree)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "a"],
    ],
  },

  // —— Outer Belt (4 + 4 + 5 = 13) ——
  {
    id: "outer-range",
    title: "Belt Collector",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 14, y: 50 },
      { id: "b", x: 44, y: 20 },
      { id: "c", x: 44, y: 80 },
      { id: "d", x: 86, y: 50 },
    ],
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "b"],
    ],
  },
  {
    id: "outer-focus",
    title: "Twin-Loop Filament",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 22, y: 22 },
      { id: "b", x: 78, y: 22 },
      { id: "c", x: 78, y: 78 },
      { id: "d", x: 22, y: 78 },
    ],
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "b"],
    ],
  },
  {
    id: "outer-alignment",
    title: "Split Diamond Reticle",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 14 },
      { id: "b", x: 86, y: 50 },
      { id: "c", x: 50, y: 86 },
      { id: "d", x: 14, y: 50 },
    ],
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "a"],
      ["d", "b"],
    ],
  },

  // —— Distant Region (4 + 5 + 5 = 14) ——
  {
    id: "distant-range",
    title: "Deep-Field Crown",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 18, y: 78 },
      { id: "b", x: 50, y: 18 },
      { id: "c", x: 82, y: 78 },
      { id: "d", x: 50, y: 54 },
    ],
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "b"],
    ],
  },
  {
    id: "distant-focus",
    title: "Braced Aperture",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 22, y: 22 },
      { id: "b", x: 78, y: 22 },
      { id: "c", x: 78, y: 78 },
      { id: "d", x: 22, y: 78 },
    ],
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "a"],
      ["a", "c"],
    ],
  },
  {
    id: "distant-alignment",
    title: "Stepped Star Vane",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 14 },
      { id: "b", x: 20, y: 46 },
      { id: "c", x: 80, y: 46 },
      { id: "d", x: 26, y: 84 },
      { id: "e", x: 78, y: 84 },
    ],
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["b", "d"],
      ["d", "e"],
    ],
  },

  // —— The New Body (5 + 5 + 6 = 16) ——
  {
    id: "new-body-range",
    title: "Pendulum Lens Cell",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 18, y: 44 },
      { id: "c", x: 82, y: 44 },
      { id: "d", x: 50, y: 60 },
      { id: "e", x: 50, y: 88 },
    ],
    edges: [
      ["a", "b"],
      ["b", "d"],
      ["d", "c"],
      ["c", "a"],
      ["d", "e"],
    ],
  },
  {
    id: "new-body-focus",
    title: "Hooked Filament Bridge",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 18, y: 20 },
      { id: "b", x: 82, y: 20 },
      { id: "c", x: 50, y: 50 },
      { id: "d", x: 22, y: 82 },
      { id: "e", x: 78, y: 82 },
    ],
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["c", "d"],
      ["d", "e"],
    ],
  },
  {
    id: "new-body-alignment",
    title: "Observatory Dome Reticle",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 20, y: 44 },
      { id: "c", x: 80, y: 44 },
      { id: "d", x: 20, y: 84 },
      { id: "e", x: 80, y: 84 },
    ],
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
      ["b", "d"],
      ["d", "e"],
      ["e", "c"],
    ],
  },
];

export const MEDIUM_TRACE_FIGURES: readonly TraceFigure[] = [
  // —— Mercury Sector (6 + 6 + 6 = 18 lines) ——
  {
    id: "mercury-range",
    title: "Bowtie Prism Cell",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 18, y: 22 },
      { id: "b", x: 18, y: 78 },
      { id: "c", x: 50, y: 50 },
      { id: "d", x: 82, y: 22 },
      { id: "e", x: 82, y: 78 },
    ],
    // Two triangles sharing hub c (degree 4); all even degrees (6 lines)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["c", "d"],
      ["d", "e"],
      ["e", "c"],
    ],
  },
  {
    id: "mercury-focus",
    title: "Crowned Filament Frame",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 20, y: 44 },
      { id: "c", x: 80, y: 44 },
      { id: "d", x: 20, y: 84 },
      { id: "e", x: 80, y: 84 },
    ],
    // House frame (6 lines; odd nodes: b, c)
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
      ["b", "d"],
      ["d", "e"],
      ["e", "c"],
    ],
  },
  {
    id: "mercury-alignment",
    title: "Crossed Diamond Vane",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 14 },
      { id: "b", x: 84, y: 46 },
      { id: "c", x: 50, y: 78 },
      { id: "d", x: 16, y: 46 },
      { id: "e", x: 84, y: 86 },
    ],
    // Diamond a-b-c-d-a + diagonal d-b + spur b-e (6 lines; odd nodes: d, e)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "a"],
      ["d", "b"],
      ["b", "e"],
    ],
  },

  // —— Outer Belt (6 + 7 + 7 = 20 lines) ——
  {
    id: "outer-range",
    title: "Bifocal Collector",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 16, y: 50 },
      { id: "b", x: 46, y: 18 },
      { id: "c", x: 46, y: 82 },
      { id: "d", x: 78, y: 26 },
      { id: "e", x: 78, y: 74 },
    ],
    // Left wedge a-b-c + right rectangle b-d-e-c (6 lines; odd nodes: b, c)
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
      ["b", "d"],
      ["d", "e"],
      ["e", "c"],
    ],
  },
  {
    id: "outer-focus",
    title: "Anchored Bowtie Coil",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 16, y: 22 },
      { id: "b", x: 16, y: 78 },
      { id: "c", x: 50, y: 50 },
      { id: "d", x: 82, y: 22 },
      { id: "e", x: 82, y: 68 },
      { id: "f", x: 54, y: 88 },
    ],
    // Bowtie on hub c + tail e-f (7 lines; odd nodes: e, f)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["c", "d"],
      ["d", "e"],
      ["e", "c"],
      ["e", "f"],
    ],
  },
  {
    id: "outer-alignment",
    title: "Braced House Reticle",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 20, y: 44 },
      { id: "c", x: 80, y: 44 },
      { id: "d", x: 20, y: 84 },
      { id: "e", x: 80, y: 84 },
    ],
    // House with diagonal brace b-e (7 lines; odd nodes: c, e)
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
      ["b", "d"],
      ["d", "e"],
      ["e", "c"],
      ["b", "e"],
    ],
  },

  // —— Distant Region (7 + 8 + 8 = 23 lines) ——
  {
    id: "distant-range",
    title: "Split Star Crown",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 18, y: 42 },
      { id: "c", x: 82, y: 42 },
      { id: "d", x: 50, y: 56 },
      { id: "e", x: 24, y: 86 },
      { id: "f", x: 76, y: 86 },
    ],
    // Upper kite a-b-d-c-a + lower triangle d-e-f (7 lines; all even with hub d deg 4)
    edges: [
      ["a", "b"],
      ["b", "d"],
      ["d", "c"],
      ["c", "a"],
      ["d", "e"],
      ["e", "f"],
      ["f", "d"],
    ],
  },
  {
    id: "distant-focus",
    title: "Cross-Braced Envelope",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 20, y: 44 },
      { id: "c", x: 80, y: 44 },
      { id: "d", x: 20, y: 84 },
      { id: "e", x: 80, y: 84 },
    ],
    // Classic 8-line envelope (house + both diagonals b-e and c-d; odd nodes: d, e)
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
      ["b", "d"],
      ["d", "e"],
      ["e", "c"],
      ["b", "e"],
      ["c", "d"],
    ],
  },
  {
    id: "distant-alignment",
    title: "Double-Diamond Grid",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 10 },
      { id: "b", x: 20, y: 36 },
      { id: "c", x: 80, y: 36 },
      { id: "d", x: 50, y: 54 },
      { id: "e", x: 20, y: 76 },
      { id: "f", x: 80, y: 76 },
    ],
    // Upper diamond a-b-d-c-a + lower diamond d-e-f-d + side rails b-e (8 lines; odd: b, e)
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
      ["c", "d"],
      ["d", "e"],
      ["d", "f"],
      ["e", "f"],
      ["b", "e"],
    ],
  },

  // —— The New Body (8 + 8 + 9 = 25 lines) ——
  {
    id: "new-body-range",
    title: "Hexagonal Lens Cell",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 82, y: 32 },
      { id: "c", x: 82, y: 68 },
      { id: "d", x: 50, y: 88 },
      { id: "e", x: 18, y: 68 },
      { id: "f", x: 18, y: 32 },
    ],
    // Hexagon ring + chords f-b and b-e (8 lines; odd: e, f)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "e"],
      ["e", "f"],
      ["f", "a"],
      ["f", "b"],
      ["b", "e"],
    ],
  },
  {
    id: "new-body-focus",
    title: "Twin-Hub Filament Bridge",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 18, y: 20 },
      { id: "b", x: 50, y: 20 },
      { id: "c", x: 82, y: 20 },
      { id: "d", x: 18, y: 54 },
      { id: "e", x: 50, y: 54 },
      { id: "f", x: 50, y: 86 },
    ],
    // Two triangles sharing b-e + bridge d-e + anchor e-f (8 lines; odd: d, f)
    edges: [
      ["a", "b"],
      ["b", "d"],
      ["d", "a"],
      ["b", "c"],
      ["c", "e"],
      ["e", "b"],
      ["d", "e"],
      ["e", "f"],
    ],
  },
  {
    id: "new-body-alignment",
    title: "Tri-Loop Astrolabe Reticle",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 28, y: 14 },
      { id: "b", x: 72, y: 14 },
      { id: "c", x: 88, y: 62 },
      { id: "d", x: 50, y: 52 },
      { id: "e", x: 12, y: 62 },
      { id: "f", x: 70, y: 90 },
      { id: "g", x: 30, y: 90 },
    ],
    // Three triangular wings sharing hub d (degree 6) (9 lines; all even)
    edges: [
      ["a", "b"],
      ["b", "d"],
      ["d", "a"],
      ["c", "f"],
      ["f", "d"],
      ["d", "c"],
      ["e", "g"],
      ["g", "d"],
      ["d", "e"],
    ],
  },
];

export const HARD_TRACE_FIGURES: readonly TraceFigure[] = [
  // —— Mercury Sector (8 + 8 + 9 = 25 lines) ——
  {
    id: "mercury-range",
    title: "Compound Objective Matrix",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 20, y: 44 },
      { id: "c", x: 80, y: 44 },
      { id: "d", x: 20, y: 84 },
      { id: "e", x: 80, y: 84 },
    ],
    // 8-line classic envelope (odd: d, e)
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
      ["b", "d"],
      ["d", "e"],
      ["e", "c"],
      ["b", "e"],
      ["c", "d"],
    ],
  },
  {
    id: "mercury-focus",
    title: "Harmonic Filament Lattice",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 84, y: 34 },
      { id: "c", x: 84, y: 70 },
      { id: "d", x: 50, y: 88 },
      { id: "e", x: 16, y: 70 },
      { id: "f", x: 16, y: 34 },
    ],
    // Hexagon + chords f-b and b-e (8 lines; odd: f, e)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "e"],
      ["e", "f"],
      ["f", "a"],
      ["f", "b"],
      ["b", "e"],
    ],
  },
  {
    id: "mercury-alignment",
    title: "Tri-Sector Finder Mesh",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 18, y: 40 },
      { id: "c", x: 82, y: 40 },
      { id: "d", x: 50, y: 54 },
      { id: "e", x: 20, y: 84 },
      { id: "f", x: 80, y: 84 },
    ],
    // 9 lines; all even
    edges: [
      ["a", "b"],
      ["b", "d"],
      ["d", "a"],
      ["d", "c"],
      ["c", "f"],
      ["f", "d"],
      ["b", "e"],
      ["e", "f"],
      ["b", "f"],
    ],
  },

  // —— Outer Belt (9 + 9 + 9 = 27 lines) ——
  {
    id: "outer-range",
    title: "Belt Astrometric Grid",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 10 },
      { id: "b", x: 18, y: 38 },
      { id: "c", x: 82, y: 38 },
      { id: "d", x: 50, y: 54 },
      { id: "e", x: 18, y: 82 },
      { id: "f", x: 82, y: 82 },
    ],
    // 9 lines; odd: e, f
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
      ["b", "d"],
      ["c", "d"],
      ["b", "e"],
      ["c", "f"],
      ["d", "e"],
      ["d", "f"],
    ],
  },
  {
    id: "outer-focus",
    title: "Dual-Bridge Filament",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 18, y: 18 },
      { id: "b", x: 82, y: 18 },
      { id: "c", x: 50, y: 42 },
      { id: "d", x: 18, y: 62 },
      { id: "e", x: 82, y: 62 },
      { id: "f", x: 50, y: 88 },
    ],
    // 9 lines; odd: a, e
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["c", "d"],
      ["d", "e"],
      ["e", "c"],
      ["d", "f"],
      ["f", "e"],
      ["a", "d"],
    ],
  },
  {
    id: "outer-alignment",
    title: "Gyroscopic Reticle Web",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 84, y: 34 },
      { id: "c", x: 84, y: 68 },
      { id: "d", x: 50, y: 88 },
      { id: "e", x: 16, y: 68 },
      { id: "f", x: 16, y: 34 },
    ],
    // Hexagon + inner triangle a-c-e (9 lines; all even)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "e"],
      ["e", "f"],
      ["f", "a"],
      ["a", "c"],
      ["c", "e"],
      ["e", "a"],
    ],
  },

  // —— Distant Region (9 + 10 + 10 = 29 lines) ——
  {
    id: "distant-range",
    title: "Deep-Field Collimator",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 84, y: 34 },
      { id: "c", x: 84, y: 68 },
      { id: "d", x: 50, y: 88 },
      { id: "e", x: 16, y: 68 },
      { id: "f", x: 16, y: 34 },
    ],
    // Hexagon + inner triangle b-d-f (9 lines; all even)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "e"],
      ["e", "f"],
      ["f", "a"],
      ["b", "d"],
      ["d", "f"],
      ["f", "b"],
    ],
  },
  {
    id: "distant-focus",
    title: "Ten-Chord Focal Array",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 50, y: 12 },
      { id: "b", x: 84, y: 34 },
      { id: "c", x: 84, y: 68 },
      { id: "d", x: 50, y: 88 },
      { id: "e", x: 16, y: 68 },
      { id: "f", x: 16, y: 34 },
    ],
    // Hexagon + inner triangle a-c-e + chord b-f (10 lines; odd: b, f)
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "e"],
      ["e", "f"],
      ["f", "a"],
      ["a", "c"],
      ["c", "e"],
      ["e", "a"],
      ["b", "f"],
    ],
  },
  {
    id: "distant-alignment",
    title: "Catadioptric Star Vane",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 10 },
      { id: "b", x: 18, y: 38 },
      { id: "c", x: 82, y: 38 },
      { id: "d", x: 50, y: 54 },
      { id: "e", x: 20, y: 84 },
      { id: "f", x: 80, y: 84 },
    ],
    // 10 lines; odd: e, f
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["b", "d"],
      ["d", "e"],
      ["e", "b"],
      ["c", "d"],
      ["d", "f"],
      ["f", "c"],
      ["e", "f"],
    ],
  },

  // —— The New Body (10 + 11 + 11 = 32 lines) ——
  {
    id: "new-body-range",
    title: "Apogee Prism Matrix",
    componentName: "Objective Lens",
    nodes: [
      { id: "a", x: 50, y: 10 },
      { id: "b", x: 18, y: 34 },
      { id: "c", x: 82, y: 34 },
      { id: "d", x: 50, y: 50 },
      { id: "e", x: 18, y: 68 },
      { id: "f", x: 82, y: 68 },
      { id: "g", x: 50, y: 90 },
    ],
    // Hexagon a-b-e-g-f-c-a + triangle b-d-c + chord e-f (10 lines; odd: e, f)
    edges: [
      ["a", "b"],
      ["b", "e"],
      ["e", "g"],
      ["g", "f"],
      ["f", "c"],
      ["c", "a"],
      ["b", "d"],
      ["d", "c"],
      ["b", "c"],
      ["e", "f"],
    ],
  },
  {
    id: "new-body-focus",
    title: "Deep-Horizon Interferometer",
    componentName: "Focusing Filament",
    nodes: [
      { id: "a", x: 50, y: 10 },
      { id: "b", x: 18, y: 34 },
      { id: "c", x: 82, y: 34 },
      { id: "d", x: 50, y: 52 },
      { id: "e", x: 18, y: 70 },
      { id: "f", x: 82, y: 70 },
      { id: "g", x: 50, y: 90 },
    ],
    // Hexagon + hub d to b, c, e, f + chord b-c (11 lines; odd: e, f)
    edges: [
      ["a", "b"],
      ["b", "e"],
      ["e", "g"],
      ["g", "f"],
      ["f", "c"],
      ["c", "a"],
      ["d", "b"],
      ["d", "c"],
      ["d", "e"],
      ["d", "f"],
      ["b", "c"],
    ],
  },
  {
    id: "new-body-alignment",
    title: "Celestial Meridian Reticle",
    componentName: "Finder Reticle",
    nodes: [
      { id: "a", x: 50, y: 10 },
      { id: "b", x: 18, y: 34 },
      { id: "c", x: 82, y: 34 },
      { id: "d", x: 50, y: 52 },
      { id: "e", x: 18, y: 70 },
      { id: "f", x: 82, y: 70 },
      { id: "g", x: 50, y: 90 },
    ],
    // Hexagon + hub d to b, c, e, f + chord e-f (11 lines; odd: b, c)
    edges: [
      ["a", "b"],
      ["b", "e"],
      ["e", "g"],
      ["g", "f"],
      ["f", "c"],
      ["c", "a"],
      ["d", "b"],
      ["d", "c"],
      ["d", "e"],
      ["d", "f"],
      ["e", "f"],
    ],
  },
];

export const TRACE_FIGURES_BY_DIFFICULTY: Readonly<
  Record<Difficulty, readonly TraceFigure[]>
> = {
  easy: EASY_TRACE_FIGURES,
  medium: MEDIUM_TRACE_FIGURES,
  hard: HARD_TRACE_FIGURES,
};

/**
 * Default export alias for Easy (base) figures.
 */
export const TRACE_FIGURES: readonly TraceFigure[] = EASY_TRACE_FIGURES;

const FIGURE_MAPS: Readonly<
  Record<Difficulty, Readonly<Record<string, TraceFigure>>>
> = {
  easy: Object.fromEntries(EASY_TRACE_FIGURES.map((fig) => [fig.id, fig])),
  medium: Object.fromEntries(MEDIUM_TRACE_FIGURES.map((fig) => [fig.id, fig])),
  hard: Object.fromEntries(HARD_TRACE_FIGURES.map((fig) => [fig.id, fig])),
};

export function getTraceFigure(
  figureId: string,
  difficulty: Difficulty = "easy",
): TraceFigure {
  const fig = FIGURE_MAPS[difficulty]?.[figureId] ?? FIGURE_MAPS.easy[figureId];
  if (!fig) {
    throw new Error(
      `Unknown TraceFigure id: ${figureId} (${difficulty})`,
    );
  }
  return fig;
}
