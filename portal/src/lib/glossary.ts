import type { Lesson } from "./types";

/** One glossary term. `lessonCode` is the 6–8 curriculum code (KSN.1, not KSN.1-35). */
export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  lessonCode: string;
  /** Order inside the lesson. */
  position: number;
}

export interface GlossaryLesson {
  code: string;
  title: string;
  /** Deck path segment, so the heading code can open the lesson. */
  slug: string;
}

/**
 * Glossary key for a lesson page. 6–8 uses its own code. A 3–5 file uses the
 * 6–8 twin (`BMT.1-35` → `BMT.1`, `intro-35` → `INTRO-68`). K–2 has none.
 */
export function glossaryCodeForLesson(
  lesson: Pick<Lesson, "slug" | "code" | "bands">
): string | null {
  if (!lesson.bands.includes("3-5") && !lesson.bands.includes("6-8")) return null;
  if (lesson.bands.includes("6-8")) return lesson.code;
  if (lesson.slug === "intro-35") return "INTRO-68";
  if (lesson.code.endsWith("-35")) return lesson.code.slice(0, -3);
  return null;
}

/** Case-insensitive substring match on term, definition, and lesson code. */
export function entryMatches(entry: GlossaryEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    entry.term.toLowerCase().includes(q) ||
    entry.definition.toLowerCase().includes(q) ||
    entry.lessonCode.toLowerCase().includes(q)
  );
}

/** Terms for one lesson, in authored order. */
export function termsForLesson(
  entries: readonly GlossaryEntry[],
  code: string
): GlossaryEntry[] {
  return entries
    .filter((entry) => entry.lessonCode === code)
    .sort((a, b) => a.position - b.position || a.term.localeCompare(b.term));
}

export interface GlossaryLetterGroup {
  letter: string;
  entries: GlossaryEntry[];
}

/** Alphabetical terms grouped by first letter. Empty letters are omitted. */
export function termsByLetter(entries: readonly GlossaryEntry[]): GlossaryLetterGroup[] {
  const sorted = [...entries].sort((a, b) =>
    a.term.localeCompare(b.term, undefined, { sensitivity: "base" })
  );
  const groups: GlossaryLetterGroup[] = [];
  for (const entry of sorted) {
    const letter = entry.term.charAt(0).toUpperCase() || "#";
    const last = groups[groups.length - 1];
    if (!last || last.letter !== letter) {
      groups.push({ letter, entries: [entry] });
    } else {
      last.entries.push(entry);
    }
  }
  return groups;
}
