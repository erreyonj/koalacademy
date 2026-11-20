"use client";

import { splitPitch } from "@/lib/notation/key";
import type { ScoreExcerpt } from "@/lib/notation/types";

/** Letter names from placed notes, left-to-right / measure order. Rests skipped. */
export function spellLetters(score: ScoreExcerpt): string[] {
  const letters: string[] = [];
  for (const measure of score.measures) {
    for (const event of measure.events) {
      if (event.kind !== "note") continue;
      letters.push(splitPitch(event.pitch).letter.toUpperCase());
    }
  }
  return letters;
}

export function NoteSpelling({ score }: { score: ScoreExcerpt }) {
  const letters = spellLetters(score);
  const word = letters.join("");

  return (
    <aside className="notation-spelling" aria-label="Note spelling">
      <p className="eyebrow">Spelling</p>
      {letters.length === 0 ? (
        <p className="notation-spelling-empty">Place notes to spell a word</p>
      ) : (
        <>
          <ol className="notation-spelling-letters" aria-hidden="true">
            {letters.map((letter, index) => (
              <li key={`${letter}-${index}`} className="notation-spelling-letter">
                {letter}
              </li>
            ))}
          </ol>
          <p className="notation-spelling-word" aria-live="polite">
            {word}
          </p>
        </>
      )}
    </aside>
  );
}
