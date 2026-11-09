import type { TelescopeDestination } from "../engine/game-state";

/**
 * Hand-authored telescope destinations aligned to the Atlas mockup:
 * Mercury Sector -> Outer Belt -> Distant Region -> The New Body.
 *
 * Each sector has 3 internal telescope components (Range, Focus, Alignment),
 * each referencing a one-line Eulerian trace figure in `trace-figures.ts`.
 *
 * Calibration costs by sector:
 * - Mercury Sector: 4 + 4 + 4 = 12
 * - Outer Belt: 4 + 4 + 5 = 13
 * - Distant Region: 4 + 5 + 5 = 14
 * - The New Body: 5 + 5 + 6 = 16
 * Total = 55 Calibration (Archive pays 65).
 */
export const DESTINATIONS: readonly TelescopeDestination[] = [
  {
    id: "mercury-sector",
    name: "Mercury Sector",
    description:
      "The closest observable sector along the inner rim. A reliable baseline for calibrating the brass optics.",
    profile: {
      blurb:
        "A small, cratered world closest to the Sun. It never strays far from the glare, so it is easiest to catch at dawn or dusk.",
      facts: [
        "Mercury is the closest planet to the Sun.",
        "Its surface is dry and heavily cratered.",
      ],
    },
    lensImage: "/assets/koalastronomer/koalastronomer-MERCURY.png",
    revealName: "Mercury",
    lensClipGlobe: true,
    components: {
      range: "mercury-range",
      focus: "mercury-focus",
      alignment: "mercury-alignment",
    },
    requiredCompletedDestinations: [],
    mapRevealRegion: "mercury-sector",
  },
  {
    id: "outer-belt",
    name: "Outer Belt",
    description: "A band of smaller bodies beyond the inner planets.",
    profile: {
      blurb:
        "The largest body in the asteroid belt: a pale, cratered world sitting between Mars and Jupiter.",
      facts: [
        "Ceres is the largest object in the belt.",
        "It is classified as a dwarf planet.",
      ],
    },
    lensImage: "/assets/koalastronomer/ceres-w-bg.jpg",
    revealName: "Ceres",
    components: {
      range: "outer-range",
      focus: "outer-focus",
      alignment: "outer-alignment",
    },
    requiredCompletedDestinations: ["mercury-sector"],
    mapRevealRegion: "outer-belt",
  },
  {
    id: "distant-region",
    name: "Distant Region",
    description:
      "Faint outer constellations requiring careful focal alignment across the deep dome.",
    profile: {
      blurb:
        "A distant icy world far beyond Neptune, with a bright heart-shaped plain on one face.",
      facts: [
        "Pluto lies in the Kuiper Belt.",
        "It is classified as a dwarf planet.",
      ],
    },
    lensImage: "/assets/koalastronomer/koalastronomer-PLUTO.png",
    revealName: "Pluto",
    lensClipGlobe: true,
    components: {
      range: "distant-range",
      focus: "distant-focus",
      alignment: "distant-alignment",
    },
    requiredCompletedDestinations: ["mercury-sector", "outer-belt"],
    mapRevealRegion: "distant-region",
  },
  {
    id: "the-new-body",
    name: "The New Body",
    description:
      "An uncharted celestial body on the far horizon. The final piece of the observatory chart.",
    profile: {
      blurb:
        "It looks Earth-like: clouds, a glow at the limb, land and sea. What intelligence could be here?",
      facts: [
        "Its colors and clouds resemble Earth, but no charts list it.",
        "The interference around it is unlike anything in the inner sectors.",
      ],
    },
    lensImage: "/assets/koalastronomer/achean-earth-w-bg.jpg",
    revealName: "Unknown world",
    components: {
      range: "new-body-range",
      focus: "new-body-focus",
      alignment: "new-body-alignment",
    },
    requiredCompletedDestinations: [
      "mercury-sector",
      "outer-belt",
      "distant-region",
    ],
    mapRevealRegion: "the-new-body",
  },
];
