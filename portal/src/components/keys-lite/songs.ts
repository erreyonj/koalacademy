import type { Finger } from "./timeline";

export type SongStep = {
  beats: number;
  /** Null when this step is a rest. */
  bass: string | null;
  chord: string[];
  symbol: string;
  bassFinger: Finger;
  chordFingers: Finger[];
  section: string;
  rest?: boolean;
};

export type SongKeyboard = {
  startLetter: "C" | "D" | "E" | "F" | "G" | "A" | "B";
  startOctave: number;
  whiteCount: number;
};

export type SongSection = {
  id: string;
  label: string;
  /** Index into `steps` where this section starts. */
  startStep: number;
  /** First bar index (0-based) for staff labels. */
  startBar: number;
  barCount: number;
};

export type SongScore = {
  id: string;
  code: string;
  title: string;
  artist: string;
  description: string;
  href: string;
  bpm: number;
  key: string;
  timeSignature: "4/4";
  steps: SongStep[];
  sections: SongSection[];
  keyboard: SongKeyboard;
};

const RH: Finger[] = [1, 3, 5];
const LH: Finger = 5;

function step(
  beats: number,
  bass: string,
  chord: string[],
  symbol: string,
  section: string,
): SongStep {
  return {
    beats,
    bass,
    chord,
    symbol,
    bassFinger: LH,
    chordFingers: RH,
    section,
  };
}

function rest(beats: number, section: string): SongStep {
  return {
    beats,
    bass: null,
    chord: [],
    symbol: "",
    bassFinger: LH,
    chordFingers: RH,
    section,
    rest: true,
  };
}

/** Dotted quarter, then hold through the bar. */
function bar(
  first: { bass: string; chord: string[]; symbol: string },
  second: { bass: string; chord: string[]; symbol: string },
  section: string,
): SongStep[] {
  return [
    step(1.5, first.bass, first.chord, first.symbol, section),
    step(2.5, second.bass, second.chord, second.symbol, section),
  ];
}

const FM = { bass: "F3", chord: ["F4", "Ab4", "C5"], symbol: "Fm" };
const DB = { bass: "Db3", chord: ["Db4", "F4", "Ab4"], symbol: "Db" };
const EB = { bass: "Eb3", chord: ["Eb4", "G4", "Bb4"], symbol: "Eb" };
const AB = { bass: "Ab3", chord: ["Eb4", "Ab4", "C5"], symbol: "Ab" };
const AB_LOW = { bass: "Ab2", chord: ["Eb4", "Ab4", "C5"], symbol: "Ab" };
const CM = { bass: "C3", chord: ["C4", "Eb4", "G4"], symbol: "Cm" };

/** Verse cell: Fm → Ab → Eb → Db (2 bars). */
function verseCell(section: string): SongStep[] {
  return [...bar(FM, AB, section), ...bar(EB, DB, section)];
}

/** Pre cell: Fm → Eb → Cm → Db (2 bars). */
function preCell(section: string): SongStep[] {
  return [...bar(FM, EB, section), ...bar(CM, DB, section)];
}

/**
 * Full pre: normal cell, then Fm → Eb → Db on beat 4 of bar 3, held through
 * beats 1–3 of bar 4, then a quarter rest on beat 4.
 */
function preSection(section: string): SongStep[] {
  return [
    ...preCell(section),
    step(1.5, FM.bass, FM.chord, FM.symbol, section),
    step(1.5, EB.bass, EB.chord, EB.symbol, section),
    step(1, DB.bass, DB.chord, DB.symbol, section),
    step(3, DB.bass, DB.chord, DB.symbol, section),
    rest(1, section),
  ];
}

/** Chorus cell: Fm → Db → Ab → Eb (2 bars). */
function chorusCell(section: string): SongStep[] {
  return [...bar(FM, DB, section), ...bar(AB, EB, section)];
}

/** Bridge cell: Fm → Db → Eb → Ab2 (2 bars). */
function bridgeCell(section: string): SongStep[] {
  return [...bar(FM, DB, section), ...bar(EB, AB_LOW, section)];
}

/** Bridge: three full cells, then Fm → Db, and a whole-bar Eb hold. */
function bridgeSection(section: string): SongStep[] {
  return [
    ...repeat(3, () => bridgeCell(section)),
    ...bar(FM, DB, section),
    step(4, EB.bass, EB.chord, EB.symbol, section),
  ];
}

function repeat<T>(times: number, factory: () => T[]): T[] {
  return Array.from({ length: times }, factory).flat();
}

type FormChunk = {
  id: string;
  label: string;
  bars: number;
  steps: SongStep[];
};

function buildForm(chunks: FormChunk[]): {
  steps: SongStep[];
  sections: SongSection[];
} {
  const steps: SongStep[] = [];
  const sections: SongSection[] = [];
  let bar = 0;
  for (const chunk of chunks) {
    sections.push({
      id: `${chunk.id}-${sections.length}`,
      label: chunk.label,
      startStep: steps.length,
      startBar: bar,
      barCount: chunk.bars,
    });
    steps.push(...chunk.steps);
    bar += chunk.bars;
  }
  return { steps, sections };
}

/**
 * Chart half-unit = 4 bars (cell × 2). A full verse or chorus is two half-units
 * (8 bars). Intro / outro = 2 bars (one cell).
 * Form: intro, verse×2, pre, chorus×2, break, verse, pre, chorus×2, bridge,
 * chorus×2, outro.
 */
function verseSection(section: string): SongStep[] {
  return repeat(4, () => verseCell(section));
}

function chorusSection(section: string): SongStep[] {
  return repeat(4, () => chorusCell(section));
}

const helloForm = buildForm([
  { id: "half-verse", label: "Intro", bars: 2, steps: verseCell("Intro") },
  { id: "verse", label: "Verse", bars: 8, steps: verseSection("Verse") },
  { id: "verse", label: "Verse", bars: 8, steps: verseSection("Verse") },
  { id: "pre", label: "Pre", bars: 4, steps: preSection("Pre") },
  { id: "chorus", label: "Chorus", bars: 8, steps: chorusSection("Chorus") },
  { id: "chorus", label: "Chorus", bars: 8, steps: chorusSection("Chorus") },
  { id: "break", label: "Break", bars: 2, steps: verseCell("Break") },
  { id: "verse", label: "Verse", bars: 8, steps: verseSection("Verse") },
  { id: "pre", label: "Pre", bars: 4, steps: preSection("Pre") },
  { id: "chorus", label: "Chorus", bars: 8, steps: chorusSection("Chorus") },
  { id: "chorus", label: "Chorus", bars: 8, steps: chorusSection("Chorus") },
  { id: "bridge", label: "Bridge", bars: 8, steps: bridgeSection("Bridge") },
  { id: "chorus", label: "Chorus", bars: 8, steps: chorusSection("Chorus") },
  { id: "chorus", label: "Chorus", bars: 8, steps: chorusSection("Chorus") },
  { id: "half-verse", label: "Outro", bars: 2, steps: verseCell("Outro") },
]);

/** F2–C6: 26 white keys. */
const HELLO_KEYBOARD: SongKeyboard = {
  startLetter: "F",
  startOctave: 2,
  whiteCount: 26,
};

export const HELLO: SongScore = {
  id: "hello",
  code: "SG-01",
  title: "Hello",
  artist: "Adele",
  description:
    "Full form in F minor. Left hand holds the root; right hand holds the triad.",
  href: "/tools/keys-lite/songs/hello/",
  bpm: 80,
  key: "Fm",
  timeSignature: "4/4",
  keyboard: HELLO_KEYBOARD,
  steps: helloForm.steps,
  sections: helloForm.sections,
};

export const SONG_SCORES: SongScore[] = [HELLO];

export function songById(id: string): SongScore | undefined {
  return SONG_SCORES.find((song) => song.id === id);
}

/** Group steps into 4/4 measures by cumulative beat length. */
export function stepsToMeasures(steps: SongStep[]): SongStep[][] {
  const measures: SongStep[][] = [];
  let current: SongStep[] = [];
  let beats = 0;
  for (const item of steps) {
    current.push(item);
    beats += item.beats;
    if (beats >= 4 - 1e-6) {
      measures.push(current);
      current = [];
      beats = 0;
    }
  }
  if (current.length > 0) measures.push(current);
  return measures;
}

export function stepToBar(steps: SongStep[], stepIndex: number): number {
  let beats = 0;
  for (let i = 0; i < stepIndex && i < steps.length; i += 1) {
    beats += steps[i].beats;
  }
  return Math.floor(beats / 4 + 1e-6);
}

export function barToStep(steps: SongStep[], barIndex: number): number {
  const measures = stepsToMeasures(steps);
  let index = 0;
  for (let bar = 0; bar < barIndex && bar < measures.length; bar += 1) {
    index += measures[bar].length;
  }
  return index;
}
