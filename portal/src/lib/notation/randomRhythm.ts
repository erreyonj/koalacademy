import type { Duration, Measure, ScoreEvent, ScoreExcerpt, TimeSignature, TupletRatio } from "./types";

const RHYTHM_PITCH = "G4";
const REST_WEIGHT = 0.2;
const QUARTER_WEIGHT = 0.4;

export const RHYTHM_TIMES: TimeSignature[] = ["4/4", "3/4", "6/8"];
export const RHYTHM_BAR_COUNTS = [1, 2, 3, 4] as const;

export type RhythmBarCount = (typeof RHYTHM_BAR_COUNTS)[number];

export type RhythmExtras = {
  dotted: boolean;
  triplets: boolean;
  sixteenths: boolean;
  eighthRests: boolean;
};

export const EMPTY_RHYTHM_EXTRAS: RhythmExtras = {
  dotted: false,
  triplets: false,
  sixteenths: false,
  eighthRests: false,
};

export function anyRhythmExtras(extras: RhythmExtras): boolean {
  return extras.dotted || extras.triplets || extras.sixteenths || extras.eighthRests;
}

type Cell = { beats: number; events: ScoreEvent[] };

type EventExtra = { dots?: 1; tuplet?: TupletRatio };

function clampBars(bars: number): RhythmBarCount {
  if (bars <= 1) return 1;
  if (bars >= 4) return 4;
  return bars as RhythmBarCount;
}

function roll(): 0 | 1 | 2 {
  const n = Math.random();
  if (n < REST_WEIGHT) return 0;
  if (n < REST_WEIGHT + QUARTER_WEIGHT) return 1;
  return 2;
}

function note(duration: Duration, pitch = RHYTHM_PITCH, extra?: EventExtra): ScoreEvent {
  return { kind: "note", pitch, duration, ...extra };
}

function rest(duration: Duration, extra?: EventExtra): ScoreEvent {
  return { kind: "rest", duration, ...extra };
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Simple-meter beat: quarter rest, quarter note, or two eighths. */
function pickSimpleBeat(pitch: string): ScoreEvent[] {
  const pickRoll = roll();
  if (pickRoll === 0) return [rest("q")];
  if (pickRoll === 1) return [note("q", pitch)];
  return [note("8", pitch), note("8", pitch)];
}

/**
 * Compound beat in 6/8 (three eighths): three eighth rests, three eighth notes,
 * or quarter + eighth.
 */
function pickCompoundBeat(pitch: string): ScoreEvent[] {
  const pickRoll = roll();
  if (pickRoll === 0) return [rest("8"), rest("8"), rest("8")];
  if (pickRoll === 1) return [note("8", pitch), note("8", pitch), note("8", pitch)];
  return [note("q", pitch), note("8", pitch)];
}

function simpleCells(extras: RhythmExtras, pitch: string): Cell[] {
  const cells: Cell[] = [
    { beats: 1, events: [rest("q")] },
    { beats: 1, events: [note("q", pitch)] },
    { beats: 1, events: [note("8", pitch), note("8", pitch)] },
  ];
  if (extras.eighthRests) {
    cells.push(
      { beats: 1, events: [note("8", pitch), rest("8")] },
      { beats: 1, events: [rest("8"), note("8", pitch)] },
      { beats: 1, events: [rest("8"), rest("8")] },
    );
  }
  if (extras.sixteenths) {
    cells.push(
      { beats: 1, events: [note("16", pitch), note("16", pitch), note("16", pitch), note("16", pitch)] },
      { beats: 1, events: [note("8", pitch), note("16", pitch), note("16", pitch)] },
      { beats: 1, events: [note("16", pitch), note("16", pitch), note("8", pitch)] },
      { beats: 1, events: [note("16", pitch), rest("16"), note("16", pitch), rest("16")] },
      { beats: 1, events: [rest("16"), rest("16"), rest("16"), rest("16")] },
    );
  }
  if (extras.dotted) {
    cells.push(
      { beats: 1, events: [note("8", pitch, { dots: 1 }), note("16", pitch)] },
      { beats: 1, events: [note("16", pitch), note("8", pitch, { dots: 1 })] },
      { beats: 2, events: [note("q", pitch, { dots: 1 }), note("8", pitch)] },
    );
  }
  if (extras.triplets) {
    const t = { tuplet: "3:2" as const };
    cells.push(
      { beats: 1, events: [note("8", pitch, t), note("8", pitch, t), note("8", pitch, t)] },
      { beats: 1, events: [note("8", pitch, t), rest("8", t), note("8", pitch, t)] },
    );
  }
  return cells;
}

function compoundCells(extras: RhythmExtras, pitch: string): Cell[] {
  const cells: Cell[] = [
    { beats: 1, events: [rest("8"), rest("8"), rest("8")] },
    { beats: 1, events: [note("8", pitch), note("8", pitch), note("8", pitch)] },
    { beats: 1, events: [note("q", pitch), note("8", pitch)] },
  ];
  if (extras.eighthRests) {
    cells.push(
      { beats: 1, events: [note("8", pitch), rest("8"), note("8", pitch)] },
      { beats: 1, events: [rest("8"), note("8", pitch), note("8", pitch)] },
      { beats: 1, events: [note("8", pitch), note("8", pitch), rest("8")] },
      { beats: 1, events: [rest("8"), rest("8"), note("8", pitch)] },
      { beats: 1, events: [note("8", pitch), rest("8"), rest("8")] },
    );
  }
  if (extras.sixteenths) {
    cells.push(
      { beats: 1, events: [note("16", pitch), note("16", pitch), note("16", pitch), note("16", pitch), note("16", pitch), note("16", pitch)] },
      { beats: 1, events: [note("8", pitch), note("8", pitch), note("16", pitch), note("16", pitch)] },
      { beats: 1, events: [note("16", pitch), note("16", pitch), note("8", pitch), note("8", pitch)] },
      { beats: 1, events: [note("8", pitch), note("16", pitch), note("16", pitch), note("8", pitch)] },
      { beats: 1, events: [note("8", pitch), note("8", pitch), rest("16"), rest("16")] },
    );
  }
  if (extras.dotted) {
    cells.push({ beats: 1, events: [note("q", pitch, { dots: 1 })] });
  }
  return cells;
}

function beatsIn(time: TimeSignature): number {
  switch (time) {
    case "4/4":
      return 4;
    case "3/4":
      return 3;
    case "6/8":
      return 2;
  }
}

function fillFromPool(pool: Cell[], totalBeats: number): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  let filled = 0;
  while (filled < totalBeats) {
    const remaining = totalBeats - filled;
    const fit = pool.filter((cell) => cell.beats <= remaining);
    const cell = pick(fit.length > 0 ? fit : pool.filter((item) => item.beats === 1));
    events.push(...cell.events);
    filled += cell.beats;
  }
  return events;
}

export function randomMeasure(
  time: TimeSignature,
  pitch = RHYTHM_PITCH,
  extras: RhythmExtras = EMPTY_RHYTHM_EXTRAS,
): Measure {
  if (!anyRhythmExtras(extras)) {
    const pickBeat = time === "6/8" ? pickCompoundBeat : pickSimpleBeat;
    const events: ScoreEvent[] = [];
    for (let i = 0; i < beatsIn(time); i += 1) {
      events.push(...pickBeat(pitch));
    }
    return { events };
  }

  const pool = time === "6/8" ? compoundCells(extras, pitch) : simpleCells(extras, pitch);
  return { events: fillFromPool(pool, beatsIn(time)) };
}

export function randomRhythm(options: {
  time: TimeSignature;
  bars: number;
  pitch?: string;
  extras?: RhythmExtras;
}): ScoreExcerpt {
  const time = options.time;
  const bars = clampBars(options.bars);
  const pitch = options.pitch ?? RHYTHM_PITCH;
  const extras = options.extras ?? EMPTY_RHYTHM_EXTRAS;
  return {
    clef: "treble",
    key: "C",
    time,
    measures: Array.from({ length: bars }, () => randomMeasure(time, pitch, extras)),
  };
}
