import { eventsToMeasures } from "@/lib/notation/parse";
import type { ScoreEvent, ScoreExcerpt } from "@/lib/notation/types";
import type { NoteDuration, PitchId } from "./pitches";

interface StaffNote {
  pitch: PitchId;
  duration: NoteDuration;
}

/**
 * The room's code so far on a treble staff: solved letters, then the live
 * dial selection (omitted once the word is cracked).
 */
export function staffProgress(
  solved: readonly StaffNote[],
  live: StaffNote | null,
): ScoreExcerpt {
  const notes = live ? [...solved, live] : solved;
  const events: ScoreEvent[] = notes.map((note) => ({
    kind: "note",
    pitch: note.pitch,
    duration: note.duration,
  }));
  return {
    clef: "treble",
    key: "C",
    time: "4/4",
    measures: eventsToMeasures(events, "4/4", 8),
  };
}
