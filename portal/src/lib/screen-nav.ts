import {
  Backpack,
  BookA,
  Drum,
  Gamepad2,
  House,
  LayoutGrid,
  Music,
  Orbit,
  Piano,
  Sprout,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import { normalizePath } from "@/lib/nav";
import { BRAND_BACKLIGHT } from "@/features/theme/backlight";
import { BANDS, type BandId } from "@/lib/types";

export type ScreenLink = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Exact match stays on the index. Prefix also lights nested routes. */
  match: "exact" | "prefix";
  bandId?: BandId;
  /** Wheel swatch for this icon. Fixed; it does not follow the selected backlight. */
  led: string;
};

const BAND_ICONS: Record<BandId, LucideIcon> = {
  "k-2": Sprout,
  "3-5": Backpack,
  "6-8": Tablet,
};

export const LESSON_LINKS: ScreenLink[] = [
  {
    title: "Lessons Home",
    href: "/lessons/",
    icon: House,
    match: "exact",
    led: "mist",
  },
  ...BANDS.map(
    (band): ScreenLink => ({
      title: band.short,
      href: `/grades/${band.id}/`,
      icon: BAND_ICONS[band.id],
      match: "exact",
      bandId: band.id,
      led: band.id === "k-2" ? "leaf" : band.id === "3-5" ? "culm" : "sky",
    }),
  ),
];

export const TOOLKIT_LINKS: ScreenLink[] = [
  {
    title: "Toolkit Home",
    href: "/toolkit/",
    icon: LayoutGrid,
    match: "exact",
    led: "pop",
  },
  {
    title: "Glossary",
    href: "/toolkit/glossary/",
    icon: BookA,
    match: "prefix",
    led: "eucalyptus",
  },
  {
    title: "Games",
    href: "/toolkit/games/",
    icon: Gamepad2,
    match: "prefix",
    led: "yellow",
  },
  {
    title: "Notation Sandbox",
    href: "/tools/notation/",
    icon: Music,
    match: "prefix",
    led: "red",
  },
  {
    title: "Rhythm Randomizer",
    href: "/tools/rhythm/",
    icon: Drum,
    match: "prefix",
    led: "bamboo",
  },
  {
    title: "Circle of Fifths",
    href: "/tools/circle-of-fifths/",
    icon: Orbit,
    match: "prefix",
    led: "pith",
  },
  {
    title: "Keys.lite",
    href: "/tools/keys-lite/",
    icon: Piano,
    match: "prefix",
    led: "canopy",
  },
];

const LED_GLOW = new Map(BRAND_BACKLIGHT.map((swatch) => [swatch.id, swatch.glow]));

export function screenLedColor(id: string) {
  return LED_GLOW.get(id) ?? "#979da8";
}

export function screenLinkActive(pathname: string, link: ScreenLink, lessonBand?: BandId) {
  if (link.bandId && lessonBand === link.bandId) return true;
  const path = normalizePath(pathname);
  const href = normalizePath(link.href);
  if (link.match === "exact") return path === href;
  return path === href || path.startsWith(`${href}/`);
}
