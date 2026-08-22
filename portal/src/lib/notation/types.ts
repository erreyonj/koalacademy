export type Clef = "treble" | "bass";

export type Duration = "w" | "h" | "q" | "8";

export type TimeSignature = "4/4" | "3/4" | "6/8";

export type ScoreEvent =
  | { kind: "note"; pitch: string; duration: Duration }
  | { kind: "rest"; duration: Duration };

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
