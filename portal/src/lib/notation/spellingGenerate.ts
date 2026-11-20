import { keyFromTonicLetter, type KeyMode } from "./key";
import { emptyScore } from "./parse";
import { placeNote } from "./score";
import type { Duration, ScoreExcerpt } from "./types";

const NOTE_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;

/** Cap for generated spelling runs — two 4/4 bars of quarters. */
export const SPELLING_LETTER_CAP = 8;

const DEFAULT_OCTAVE = 4;

export function pickSpellingWord(
  words: readonly string[],
  exclude?: string,
): string {
  const pool =
    exclude && words.length > 1
      ? words.filter((word) => word.toLowerCase() !== exclude.toLowerCase())
      : words;
  return pool[Math.floor(Math.random() * pool.length)] ?? "feed";
}

export function pickRandomLetters(max = SPELLING_LETTER_CAP): string {
  const capped = Math.max(1, Math.min(SPELLING_LETTER_CAP, max));
  const length = 3 + Math.floor(Math.random() * (capped - 2));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += NOTE_LETTERS[Math.floor(Math.random() * NOTE_LETTERS.length)];
  }
  return out;
}

/** Replace the score notes with letter pitches (quarters by default). */
export function scoreFromSpellingLetters(
  score: ScoreExcerpt,
  letters: string,
  mode: KeyMode,
  duration: Duration = "q",
): ScoreExcerpt {
  const chars = letters
    .toUpperCase()
    .replace(/[^A-G]/g, "")
    .slice(0, SPELLING_LETTER_CAP)
    .split("");
  if (chars.length === 0) {
    return emptyScore({ ...score, key: keyFromTonicLetter("C", mode) });
  }
  const key = keyFromTonicLetter(chars[0], mode);
  let next = emptyScore({ ...score, key });
  for (const letter of chars) {
    next = placeNote(next, `${letter}${DEFAULT_OCTAVE}`, duration);
  }
  return next;
}
