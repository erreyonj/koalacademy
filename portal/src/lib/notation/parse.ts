import type { Clef, Duration, Measure, ScoreEvent, ScoreExcerpt, TimeSignature } from "./types";

const DURATIONS = new Set<Duration>(["w", "h", "q", "8", "16"]);

export function durationBeats(duration: Duration): number {
  switch (duration) {
    case "w":
      return 4;
    case "h":
      return 2;
    case "q":
      return 1;
    case "8":
      return 0.5;
    case "16":
      return 0.25;
  }
}

export function eventBeats(event: ScoreEvent): number {
  let beats = durationBeats(event.duration);
  if (event.dots === 1) beats *= 1.5;
  if (event.tuplet === "3:2") beats *= 2 / 3;
  return beats;
}

export function measureCapacity(time: TimeSignature): number {
  switch (time) {
    case "4/4":
      return 4;
    case "3/4":
      return 3;
    case "6/8":
      return 3;
  }
}

export function voiceTime(time: TimeSignature): { numBeats: number; beatValue: number } {
  const [numBeats, beatValue] = time.split("/").map(Number);
  return { numBeats, beatValue };
}

export function measureBeats(measure: Measure): number {
  return measure.events.reduce((sum, event) => sum + eventBeats(event), 0);
}

const TOKEN = /^(r|[A-G](?:#|b)?\d)\/(w|h|q|8)$/i;

export function parseNotes(notes: string): ScoreEvent[] {
  if (!notes.trim()) return [];
  return notes
    .trim()
    .split(/\s+/)
    .map((token) => {
      const match = token.match(TOKEN);
      if (!match) {
        throw new Error(`Invalid notation token: ${token}`);
      }
      const [, head, dur] = match;
      const duration = dur as Duration;
      if (head.toLowerCase() === "r") return { kind: "rest" as const, duration };
      return { kind: "note" as const, pitch: head, duration };
    });
}

export function eventsToMeasures(
  events: ScoreEvent[],
  time: TimeSignature,
  maxMeasures = 2,
): Measure[] {
  if (events.length === 0) return [{ events: [] }];
  const cap = measureCapacity(time);
  const measures: Measure[] = [{ events: [] }];
  let filled = 0;
  for (const event of events) {
    const beats = eventBeats(event);
    const last = measures[measures.length - 1];
    if (last.events.length > 0 && filled + beats > cap + 1e-6 && measures.length < maxMeasures) {
      measures.push({ events: [event] });
      filled = beats;
    } else {
      last.events.push(event);
      filled += beats;
    }
  }
  return measures;
}

export function emptyScore(
  overrides: Partial<Pick<ScoreExcerpt, "clef" | "key" | "time">> = {},
): ScoreExcerpt {
  return {
    clef: overrides.clef ?? "treble",
    key: overrides.key ?? "C",
    time: overrides.time ?? "4/4",
    measures: [{ events: [] }],
  };
}

export function excerptFromProps(props: {
  clef?: Clef;
  key?: string;
  time?: TimeSignature;
  notes?: string;
}): ScoreExcerpt {
  const clef = props.clef ?? "treble";
  const key = props.key ?? "C";
  const time = props.time ?? "4/4";
  const events = props.notes ? parseNotes(props.notes) : [];
  return { clef, key, time, measures: eventsToMeasures(events, time) };
}

export function isDuration(value: string): value is Duration {
  return DURATIONS.has(value as Duration);
}
