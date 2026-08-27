import type { Lesson } from "./types";

/**
 * Student-facing component filters for band lesson lists.
 * Match by lesson `code`, not the long curriculum `component` title.
 */
export interface ComponentFilter {
  id: string;
  /** Short code on the pad (AT is invented — Advanced Theory is a DYS split). */
  abbrev: string;
  label: string;
  /** Prefix match: `BMT` matches `BMT` and `BMT.1`. */
  prefix?: string;
  /** Explicit codes when one curriculum component maps to two buttons (DYS). */
  codes?: readonly string[];
}

export const COMPONENT_FILTERS: readonly ComponentFilter[] = [
  { id: "bmt", abbrev: "BMT", label: "Basic Music Theory", prefix: "BMT" },
  { id: "ksn", abbrev: "KSN", label: "Koala Sampler", prefix: "KSN" },
  { id: "us", abbrev: "US", label: "Understanding Sampling", prefix: "US" },
  { id: "d4", abbrev: "D4", label: "Digital Drumming", prefix: "D4" },
  { id: "songform", abbrev: "SONGFORM", label: "Song Form", prefix: "SONGFORM" },
  { id: "srp", abbrev: "SRP", label: "Sampling Rights", prefix: "SRP" },
  { id: "dys", abbrev: "DYS", label: "Defining Your Sound", codes: ["DYS.1", "DYS.2"] },
  { id: "advanced-theory", abbrev: "AT", label: "Advanced Theory", codes: ["DYS.3", "DYS.4", "DYS.5"] },
  { id: "projects", abbrev: "AW", label: "Projects", prefix: "AW" },
  { id: "aep", abbrev: "AEP", label: "Advanced Koala", prefix: "AEP" },
  { id: "performance", abbrev: "PERFORMANCE", label: "Performing in Koala", prefix: "PERFORMANCE" },
];

export function getComponentFilter(id: string): ComponentFilter | undefined {
  return COMPONENT_FILTERS.find((filter) => filter.id === id);
}

function matchesPrefix(code: string, prefix: string): boolean {
  return code === prefix || code.startsWith(`${prefix}.`);
}

export function lessonMatchesFilter(
  lesson: Pick<Lesson, "code">,
  filter: ComponentFilter
): boolean {
  if (filter.codes) return filter.codes.includes(lesson.code);
  if (filter.prefix) return matchesPrefix(lesson.code, filter.prefix);
  return false;
}

/** Empty `componentId` (All) or an unknown id returns the full list. */
export function filterLessonsByComponent(
  lessons: Lesson[],
  componentId: string
): Lesson[] {
  const filter = getComponentFilter(componentId);
  if (!filter) return lessons;
  return lessons.filter((lesson) => lessonMatchesFilter(lesson, filter));
}
