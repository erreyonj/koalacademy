import type { Lesson } from "./types";

/** One glossary term, introduced by a single curriculum code (KSN.1, not a band file). */
export interface GlossaryEntry {
  /** Stable kebab-case id. */
  id: string;
  term: string;
  definition: string;
  /** Curriculum code that introduced the term, e.g. "KSN.1". */
  lessonCode: string;
}

export interface GlossaryLesson {
  code: string;
  title: string;
}

/**
 * Approved glossary entries, in the order each lesson introduced them.
 * Tiles are derived from these codes, so a lesson with no entries has no tile.
 */
export const GLOSSARY_ENTRIES: readonly GlossaryEntry[] = [
  {
    id: "waveform",
    term: "Waveform",
    definition: "Visual representation of sound.",
    lessonCode: "KSN.1",
  },
  {
    id: "sampler",
    term: "Sampler",
    definition: "Lets you play a sound like an instrument.",
    lessonCode: "KSN.1",
  },
  {
    id: "koala-sampler",
    term: "Koala Sampler",
    definition: "Mobile sampler DAW.",
    lessonCode: "KSN.1",
  },
  {
    id: "daw",
    term: "DAW",
    definition: "Digital Audio Workstation.",
    lessonCode: "KSN.1",
  },
  {
    id: "sample-tab",
    term: "Sample Tab",
    definition: "Holds samples and sample banks.",
    lessonCode: "KSN.1",
  },
  {
    id: "sequence-tab",
    term: "Sequence Tab",
    definition: "Holds Sequences and arrangements.",
    lessonCode: "KSN.1",
  },
  {
    id: "perform-tab",
    term: "Perform Tab",
    definition: "Holds FX (effects) and other Functions.",
    lessonCode: "KSN.1",
  },
  {
    id: "volume-knob",
    term: "Volume Knob",
    definition: "Controls volume of a sample.",
    lessonCode: "KSN.1",
  },
  {
    id: "pitch-knob",
    term: "Pitch Knob",
    definition: "Controls pitch of a sample.",
    lessonCode: "KSN.1",
  },
  {
    id: "pan",
    term: "Pan",
    definition: "Controls left and right placement of sample.",
    lessonCode: "KSN.1",
  },
  {
    id: "amplitude",
    term: "Amplitude",
    definition: "Volume range of a sound.",
    lessonCode: "KSN.1",
  },
  {
    id: "tempo",
    term: "Tempo",
    definition: "Controls the speed of music.",
    lessonCode: "KSN.2",
  },
  {
    id: "undo",
    term: "Undo",
    definition: "Undoes last action.",
    lessonCode: "KSN.2",
  },
  {
    id: "solo",
    term: "Solo",
    definition: "Isolates a sample or sound.",
    lessonCode: "KSN.2",
  },
  {
    id: "mute",
    term: "Mute",
    definition: "Turns off a sample.",
    lessonCode: "KSN.2",
  },
  {
    id: "bar-measure",
    term: "Bar/Measure",
    definition: "A single unit of music.",
    lessonCode: "KSN.2",
  },
  {
    id: "transport",
    term: "Transport",
    definition: "Play, record, tempo, quantize functions and more.",
    lessonCode: "KSN.2",
  },
];

/** Lessons that have at least one entry, in first-seen seed order. */
export function glossaryLessons(): GlossaryLesson[] {
  const seen = new Set<string>();
  const lessons: GlossaryLesson[] = [];
  for (const entry of GLOSSARY_ENTRIES) {
    if (seen.has(entry.lessonCode)) continue;
    seen.add(entry.lessonCode);
    lessons.push({ code: entry.lessonCode, title: entry.lessonCode });
  }
  return lessons;
}

/**
 * Title for a glossary tile. Prefer the 6–8 lesson when both bands exist;
 * otherwise the first matching lesson. Falls back to the code.
 */
export function glossaryLessonTitle(
  code: string,
  lessons: Pick<Lesson, "code" | "title" | "bands">[]
): string {
  const matches = lessons.filter((lesson) => lesson.code === code);
  const preferred =
    matches.find((lesson) => lesson.bands.includes("6-8")) ?? matches[0];
  return preferred?.title ?? code;
}

/** Terms for one lesson, in seed order. */
export function termsForLesson(code: string): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter((entry) => entry.lessonCode === code);
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

export function filterEntries(query: string): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter((entry) => entryMatches(entry, query));
}

/** All matching terms, A–Z. No ranking. */
export function termsAlphabetically(query = ""): GlossaryEntry[] {
  return filterEntries(query).sort((a, b) =>
    a.term.localeCompare(b.term, undefined, { sensitivity: "base" })
  );
}

export interface GlossaryLetterGroup {
  letter: string;
  entries: GlossaryEntry[];
}

/** Alphabetical terms grouped by first letter. Empty letters are omitted. */
export function termsByLetter(query = ""): GlossaryLetterGroup[] {
  const groups: GlossaryLetterGroup[] = [];
  for (const entry of termsAlphabetically(query)) {
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
