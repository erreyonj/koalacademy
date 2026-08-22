import { scalePitches } from "./key";
import { emptyScore, eventsToMeasures } from "./parse";
import type { Duration, ScoreExcerpt } from "./types";

export type PresetId =
  | "empty"
  | "cMajorScale"
  | "aMinorScale"
  | "gMajorKey"
  | "fourQuarterRests"
  | "halfAndQuarterRests";

export type Preset = {
  id: PresetId;
  label: string;
  score: ScoreExcerpt;
};

function scaleExcerpt(key: string, startOctave: number, duration: Duration = "8"): ScoreExcerpt {
  const events = scalePitches(key, startOctave).map((pitch) => ({
    kind: "note" as const,
    pitch,
    duration,
  }));
  return {
    clef: "treble",
    key,
    time: "4/4",
    measures: eventsToMeasures(events, "4/4"),
  };
}

export const PRESETS: Preset[] = [
  { id: "empty", label: "Blank 4/4", score: emptyScore() },
  { id: "cMajorScale", label: "C major scale", score: scaleExcerpt("C", 4) },
  { id: "aMinorScale", label: "A minor scale", score: scaleExcerpt("Am", 3) },
  { id: "gMajorKey", label: "G major key signature", score: emptyScore({ key: "G" }) },
  {
    id: "fourQuarterRests",
    label: "Four quarter rests",
    score: {
      clef: "treble",
      key: "C",
      time: "4/4",
      measures: [
        {
          events: [
            { kind: "rest", duration: "q" },
            { kind: "rest", duration: "q" },
            { kind: "rest", duration: "q" },
            { kind: "rest", duration: "q" },
          ],
        },
      ],
    },
  },
  {
    id: "halfAndQuarterRests",
    label: "Half and quarter rests",
    score: {
      clef: "treble",
      key: "C",
      time: "4/4",
      measures: [
        {
          events: [
            { kind: "rest", duration: "h" },
            { kind: "rest", duration: "q" },
            { kind: "rest", duration: "q" },
          ],
        },
      ],
    },
  },
];

export function getPreset(id: PresetId): ScoreExcerpt {
  const found = PRESETS.find((preset) => preset.id === id);
  return found ? structuredClone(found.score) : emptyScore();
}
