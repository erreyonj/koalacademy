"use client";

import {
  applyKeyToPitch,
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

function readingsForPitches(pitches: string[], key: string) {
  const letters = pitches.map((pitch) => splitPitch(pitch).letter.toUpperCase());
  return {
    letters,
    word: letters.join(""),
    degrees: pitches.map((pitch) => scaleDegreeLabel(pitch, key)).join(" "),
    solfege: pitches.map((pitch) => solfegeLabel(pitch, key)).join(" "),
  };
}

function Readings({
  letters,
  degrees,
  solfege,
  correctMask,
  solved,
}: {
  letters: string[];
  degrees: string;
  solfege: string;
  /** Per-letter correct state (Solve). Omitted in Spelling. */
  correctMask?: boolean[];
  solved?: boolean;
}) {
  return (
    <div className="notation-spelling-readings" aria-live="polite">
      <p className="notation-spelling-word">
        {letters.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={
              correctMask?.[index] ? "notation-spelling-letter is-correct" : "notation-spelling-letter"
            }
          >
            {letter}
          </span>
        ))}
      </p>
      <p className="notation-spelling-or">or</p>
      <p className="notation-spelling-alt" aria-label="Scale degrees">
        {degrees}
      </p>
      <p className="notation-spelling-or">or</p>
      <p className="notation-spelling-alt" aria-label="Solfege">
        {solfege}
      </p>
      {solved ? (
        <p className="notation-spelling-status" role="status">
          Solved
        </p>
      ) : null}
    </div>
  );
}

export function NoteSpelling({
  score,
  variant = "spelling",
  target,
}: {
  score: ScoreExcerpt;
  variant?: "spelling" | "solve";
  /** Target A–G letters for Solve mode. */
  target?: string;
}) {
  if (variant === "solve") {
    const targetLetters = (target ?? "")
      .toUpperCase()
      .replace(/[^A-G]/g, "")
      .split("");
    if (targetLetters.length === 0) {
      return (
        <aside className="notation-spelling" aria-label="Solve prompt">
          <p className="eyebrow">Solve</p>
          <p className="notation-spelling-empty">Generate a word to place on the staff</p>
        </aside>
      );
    }
    const targetPitches = targetLetters.map((letter) =>
      applyKeyToPitch(`${letter}4`, score.key),
    );
    const { letters, degrees, solfege } = readingsForPitches(targetPitches, score.key);
    const placed = spellLetters(score);
    const correctMask = letters.map((letter, index) => placed[index] === letter);
    const solved =
      letters.length > 0 &&
      placed.length === letters.length &&
      correctMask.every(Boolean);

    return (
      <aside className="notation-spelling" aria-label="Solve prompt">
        <p className="eyebrow">Solve</p>
        <Readings
          letters={letters}
          degrees={degrees}
          solfege={solfege}
          correctMask={correctMask}
          solved={solved}
        />
      </aside>
    );
  }

  const pitches = spellPitches(score);
  const { letters, degrees, solfege } = readingsForPitches(pitches, score.key);

  return (
    <aside className="notation-spelling" aria-label="Note spelling">
      <p className="eyebrow">Spelling</p>
      {letters.length === 0 ? (
        <p className="notation-spelling-empty">Place notes to spell a word</p>
      ) : (
        <Readings letters={letters} degrees={degrees} solfege={solfege} />
      )}
    </aside>
  );
}
