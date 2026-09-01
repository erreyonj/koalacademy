export type Clef = "treble" | "bass";

export type Duration = "w" | "h" | "q" | "8" | "16";

export type TupletRatio = "3:2";

export type TimeSignature = "4/4" | "3/4" | "6/8";

export type ScoreEvent =
  | { kind: "note"; pitch: string; duration: Duration; dots?: 1; tuplet?: TupletRatio }
  | { kind: "rest"; duration: Duration; dots?: 1; tuplet?: TupletRatio };

export type Measure = {
  events: ScoreEvent[];
};

export type ScoreExcerpt = {
  clef: Clef;
  /** Tonal key name: "C", "G", "F#m", "Bb". */
  key: string;
  time: TimeSignature;
  measures: Measure[];
};

export type CursorMode = "note" | "rest" | "erase" | "key";

export type AccidentalFamily = "sharp" | "flat";
