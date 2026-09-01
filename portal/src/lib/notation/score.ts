import { applyKeyToPitch } from "./key";
import { emptyScore, eventBeats, measureBeats, measureCapacity } from "./parse";
import type { Clef, Duration, ScoreEvent, ScoreExcerpt, TimeSignature } from "./types";

export function setClef(score: ScoreExcerpt, clef: Clef): ScoreExcerpt {
  return { ...score, clef };
}

export function setTime(score: ScoreExcerpt, time: TimeSignature): ScoreExcerpt {
  return { ...score, time };
}

export function clearMeasures(score: ScoreExcerpt): ScoreExcerpt {
  return { ...score, measures: [{ events: [] }] };
}

export function replaceEvent(
  score: ScoreExcerpt,
  measureIndex: number,
  eventIndex: number,
  event: ScoreEvent,
): ScoreExcerpt {
  return {
    ...score,
    measures: score.measures.map((measure, i) =>
      i !== measureIndex
        ? measure
        : {
            events: measure.events.map((current, j) => (j === eventIndex ? event : current)),
          },
    ),
  };
}

export function removeEvent(
  score: ScoreExcerpt,
  measureIndex: number,
  eventIndex: number,
): ScoreExcerpt {
  const measures = score.measures.map((measure, i) =>
    i !== measureIndex
      ? measure
      : { events: measure.events.filter((_, j) => j !== eventIndex) },
  );
  const kept = measures.filter((measure, i) => measure.events.length > 0 || i === 0);
  return { ...score, measures: kept.length > 0 ? kept : [{ events: [] }] };
}

export function appendEvent(score: ScoreExcerpt, event: ScoreEvent): ScoreExcerpt {
  const cap = measureCapacity(score.time);
  const measures = score.measures.map((measure) => ({ events: [...measure.events] }));
  if (measures.length === 0) measures.push({ events: [] });
  const last = measures[measures.length - 1];
  const nextBeats = measureBeats(last) + eventBeats(event);
  if (last.events.length > 0 && nextBeats > cap + 1e-6) {
    if (measures.length >= 2) return score;
    measures.push({ events: [event] });
  } else {
    last.events.push(event);
  }
  return { ...score, measures };
}

export function placeNote(score: ScoreExcerpt, naturalPitch: string, duration: Duration): ScoreExcerpt {
  return appendEvent(score, {
    kind: "note",
    pitch: applyKeyToPitch(naturalPitch, score.key),
    duration,
  });
}

export function placeRest(score: ScoreExcerpt, duration: Duration): ScoreExcerpt {
  return appendEvent(score, { kind: "rest", duration });
}

export function replaceWithNote(
  score: ScoreExcerpt,
  measureIndex: number,
  eventIndex: number,
  naturalPitch: string,
  duration: Duration,
): ScoreExcerpt {
  return replaceEvent(score, measureIndex, eventIndex, {
    kind: "note",
    pitch: applyKeyToPitch(naturalPitch, score.key),
    duration,
  });
}

export { emptyScore };
