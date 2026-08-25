import type { Lesson } from "./types";

/**
 * Topics that always appear as Skills filters, even when no lesson is tagged
 * yet. Ids are lowercase; treat the string as the future progress-table key.
 */
export const CATALOG_SKILLS = [
  "daws",
  "royalties",
  "publishing",
  "social media",
  "drumkits",
] as const;

const DISPLAY_LABELS: Record<string, string> = {
  daws: "DAWs",
  "4/4": "4/4",
};

export function skillLabel(id: string): string {
  if (DISPLAY_LABELS[id]) return DISPLAY_LABELS[id];
  return id.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function skillHref(id: string): string {
  return `/skills/?skill=${encodeURIComponent(id)}`;
}

/** Display form for a skill tag, e.g. `key signatures` → `#key-signatures`. */
export function skillHashtag(id: string): string {
  return `#${id.replace(/\s+/g, "-")}`;
}

/** Canonical tags plus every skill found on lessons, first-seen order. */
export function catalogSkills(lessons: Lesson[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of [...CATALOG_SKILLS, ...lessons.flatMap((lesson) => lesson.skills)]) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export interface SkillQuery {
  q?: string;
  skill?: string;
}

function haystack(lesson: Lesson): string {
  return [lesson.title, lesson.focus, lesson.component, lesson.strand]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

/** Higher is a better match: exact skill, skill contains query, then title/focus. */
function matchScore(lesson: Lesson, query: string): number {
  if (!query) return 0;
  if (lesson.skills.includes(query)) return 3;
  if (lesson.skills.some((skill) => skill.includes(query))) return 2;
  if (haystack(lesson).includes(query)) return 1;
  return 0;
}

/**
 * Filter the lesson index. A selected skill is required when set. A text query
 * matches skill tags first, then title / focus / component / strand.
 */
export function matchLessons(lessons: Lesson[], { q, skill }: SkillQuery): Lesson[] {
  const query = q?.trim().toLowerCase() ?? "";
  const skillId = skill?.trim().toLowerCase() ?? "";

  const filtered = lessons.filter((lesson) => {
    if (skillId && !lesson.skills.includes(skillId)) return false;
    if (!query) return true;
    return matchScore(lesson, query) > 0;
  });

  if (!query) return filtered;

  return filtered
    .map((lesson, index) => ({ lesson, index, score: matchScore(lesson, query) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.lesson);
}
