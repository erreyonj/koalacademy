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
        "Mercury is the smallest planet and the closest to the Sun. From Earth it never strays far from the Sun, so it is only visible low on the horizon around sunrise or sunset.",
      facts: [
        "Mercury orbits the Sun once every 88 Earth days.",
        "With almost no atmosphere, its surface swings from about 430 °C by day to about -180 °C at night.",
        "One Mercury day (sunrise to sunrise) lasts about 176 Earth days.",
      ],
    },
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
        "Between Mars and Jupiter lies the main asteroid belt: millions of rocky leftovers from the early solar system that never formed a planet.",
      facts: [
        "Ceres, the largest object in the belt, is classified as a dwarf planet.",
        "Despite movie scenes, asteroids in the belt are usually hundreds of thousands of kilometers apart.",
        "All the asteroids in the belt added together have less mass than Earth's Moon.",
      ],
    },
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
        "Far beyond Neptune, the Kuiper Belt is a cold ring of icy bodies, home to Pluto and many comets that swing in toward the Sun.",
      facts: [
        "Pluto was reclassified as a dwarf planet in 2006.",
        "Sunlight takes about 5.5 hours to reach Pluto.",
        "NASA's New Horizons spacecraft flew past Pluto in 2015.",
      ],
    },
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
        "Your discovery: an uncharted body on the far horizon. Astronomers find new objects by comparing images of the same patch of sky over time and spotting what moves.",
      facts: [
        "Neptune was found in 1846 after its position was predicted from wobbles in Uranus's orbit.",
        "Clyde Tombaugh discovered Pluto in 1930 by flipping between photographs of the night sky.",
        "Newly found objects receive temporary codes until they are officially named.",
      ],
    },
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
