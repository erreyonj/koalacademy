"use client";

import {
  scaleDegreeLabel,
  solfegeLabel,
  splitPitch,
} from "@/lib/notation/key";
import type { ScoreExcerpt } from "@/lib/notation/types";

/** Letter names from placed notes, left-to-right / measure order. Rests skipped. */
export function spellLetters(score: ScoreExcerpt): string[] {
  return spellPitches(score).map((pitch) => splitPitch(pitch).letter.toUpperCase());
}

/** Sounding pitches from placed notes, left-to-right / measure order. Rests skipped. */
export function spellPitches(score: ScoreExcerpt): string[] {
  const pitches: string[] = [];
  for (const measure of score.measures) {
    for (const event of measure.events) {
      if (event.kind !== "note") continue;
      pitches.push(event.pitch);
    }
  }
  return pitches;
}

export function NoteSpelling({ score }: { score: ScoreExcerpt }) {
  const pitches = spellPitches(score);
  const letters = pitches.map((pitch) => splitPitch(pitch).letter.toUpperCase());
  const word = letters.join("");
  const degrees = pitches.map((pitch) => scaleDegreeLabel(pitch, score.key)).join(" ");
  const solfege = pitches.map((pitch) => solfegeLabel(pitch, score.key)).join(" ");

  return (
    <aside className="notation-spelling" aria-label="Note spelling">
      <p className="eyebrow">Spelling</p>
      {letters.length === 0 ? (
        <p className="notation-spelling-empty">Place notes to spell a word</p>
      ) : (
        <div className="notation-spelling-readings" aria-live="polite">
          <p className="notation-spelling-word">{word}</p>
          <p className="notation-spelling-or">or</p>
          <p className="notation-spelling-alt" aria-label="Scale degrees">
            {degrees}
          </p>
          <p className="notation-spelling-or">or</p>
          <p className="notation-spelling-alt" aria-label="Solfege">
            {solfege}
          </p>
        </div>
      )}
    </aside>
  );
}
