import type { Finger } from "./timeline";

export type SongStep = {
  beats: number;
  bass: string;
  chord: string[];
  symbol: string;
  bassFinger: Finger;
  chordFingers: Finger[];
};

export type SongKeyboard = {
  startLetter: "C" | "D" | "E" | "F" | "G" | "A" | "B";
  startOctave: number;
};

export type SongScore = {
  id: string;
  code: string;
  title: string;
  artist: string;
  description: string;
  href: string;
  bpm: number;
  timeSignature: "4/4";
  steps: SongStep[];
  bassKeyboard: SongKeyboard;
  chordKeyboard: SongKeyboard;
};

/** F minor bridge cell: Fm → Db → Eb → Ab. Dotted quarter, then fill the bar. */
export const HELLO: SongScore = {
  id: "hello",
  code: "SG-01",
  title: "Hello",
  artist: "Adele",
  description: "Bridge loop in F minor. Left hand holds the root; right hand holds the triad.",
  href: "/tools/keys-lite/songs/hello/",
  bpm: 80,
  timeSignature: "4/4",
  bassKeyboard: { startLetter: "F", startOctave: 2 },
  chordKeyboard: { startLetter: "C", startOctave: 4 },
  steps: [
    {
      beats: 1.5,
      bass: "F3",
      chord: ["F4", "Ab4", "C5"],
      symbol: "Fm",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
    {
      beats: 2.5,
      bass: "Db3",
      chord: ["Db4", "F4", "Ab4"],
      symbol: "Db",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
    {
      beats: 1.5,
      bass: "Eb3",
      chord: ["Eb4", "G4", "Bb4"],
      symbol: "Eb",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
    {
      beats: 2.5,
      bass: "Ab2",
      chord: ["Eb4", "Ab4", "C5"],
      symbol: "Ab",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
  ],
};

/** Two-bar Gm → F → Eb → F half-note loop. */
export const SEEING_GREEN: SongScore = {
  id: "seeing-green",
  code: "SG-02",
  title: "Seeing Green",
  artist: "Nicki Minaj",
  description: "Four-chord loop. Left hand holds the root; right hand holds the triad.",
  href: "/tools/keys-lite/songs/seeing-green/",
  bpm: 77,
  timeSignature: "4/4",
  bassKeyboard: { startLetter: "C", startOctave: 3 },
  chordKeyboard: { startLetter: "C", startOctave: 4 },
  steps: [
    {
      beats: 2,
      bass: "G3",
      chord: ["G4", "Bb4", "D5"],
      symbol: "Gm",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
    {
      beats: 2,
      bass: "F3",
      chord: ["F4", "A4", "C5"],
      symbol: "F",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
    {
      beats: 2,
      bass: "Eb3",
      chord: ["Eb4", "G4", "Bb4"],
      symbol: "Eb",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
    {
      beats: 2,
      bass: "F3",
      chord: ["F4", "A4", "C5"],
      symbol: "F",
      bassFinger: 5,
      chordFingers: [1, 3, 5],
    },
  ],
};

export const SONG_SCORES: SongScore[] = [HELLO, SEEING_GREEN];

export function songById(id: string): SongScore | undefined {
  return SONG_SCORES.find((song) => song.id === id);
}
