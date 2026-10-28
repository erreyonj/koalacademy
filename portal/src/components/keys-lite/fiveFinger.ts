import {
  beatMs,
  type Finger,
  type HandSide,
  type MotionPlan,
  type MotionSample,
  type ScaleDir,
  type TimedWaypoint,
  type Timing,
} from "./timeline";

const FIVE_RH: Finger[] = [1, 2, 3, 4, 5];
const FIVE_LH: Finger[] = [5, 4, 3, 2, 1];

const DEFAULT_FIVE = ["C4", "D4", "E4", "F4", "G4"];

const LESSON_FIRST_MS = 240;
const LESSON_STEP_MS = 480;
const LESSON_END_MS = 820;

type Tone = { note: string; finger: Finger };

export function fiveFingers(side: HandSide): Finger[] {
  return side === "right" ? FIVE_RH : FIVE_LH;
}

function zipTones(notes: string[], fingers: Finger[]): Tone[] {
  return notes.map((note, index) => ({ note, finger: fingers[index] ?? 1 }));
}

function downFingersFromUp(up: Finger[], repeatPeak: boolean): Finger[] {
  const down = [...up].reverse();
  return repeatPeak ? [down[0], ...down] : down;
}

function downPitches(up: string[], repeatPeak: boolean): string[] {
  const top = up[up.length - 1];
  if (!top) return up;
  const rest = [...up.slice(0, -1)].reverse();
  return repeatPeak ? [top, top, ...rest] : [top, ...rest];
}

function buildWaypoints(tones: Tone[], timing: Timing): TimedWaypoint[] {
  const smooth = timing.mode === "smooth";
  const step = smooth ? beatMs(timing.bpm) : LESSON_STEP_MS;
  const first = smooth ? step : LESSON_FIRST_MS;
  const wps: TimedWaypoint[] = [
    {
      time: 0,
      shift: 0,
      thumbT: 0,
      pressedFinger: null,
      note: null,
      crossFinger: 1,
      attack: 0,
    },
  ];
  let time = 0;
  let attack = 0;

  for (let i = 0; i < tones.length; i++) {
    attack += 1;
    time += i === 0 ? first : step;
    wps.push({
      time,
      shift: 0,
      thumbT: 0,
      pressedFinger: tones[i].finger,
      note: tones[i].note,
      crossFinger: 1,
      attack,
    });
  }

  time += smooth ? step : LESSON_END_MS;
  const last = tones[tones.length - 1];
  wps.push({
    time,
    shift: 0,
    thumbT: 0,
    pressedFinger: last?.finger ?? null,
    note: last?.note ?? null,
    crossFinger: 1,
    attack,
  });
  return wps;
}

function stitchUpDown(
  up: TimedWaypoint[],
  down: TimedWaypoint[],
  gapMs: number,
  peak: string,
): TimedWaypoint[] {
  const upLast = up[up.length - 1].time;
  const afterRest = down.filter((wp) => wp.time > 0);
  let start = 0;
  while (start < afterRest.length && afterRest[start].note !== peak) start += 1;
  if (start >= afterRest.length) return up;
  const firstAttack = afterRest[start].attack;
  while (
    start < afterRest.length &&
    afterRest[start].note === peak &&
    afterRest[start].attack === firstAttack
  ) {
    start += 1;
  }
  if (start >= afterRest.length) return up;
  const origin = afterRest[start].time;
  const tail = afterRest.slice(start).map((wp) => ({
    ...wp,
    time: wp.time - origin + upLast + gapMs,
  }));
  return [...up, ...tail];
}

function uniqueSteps(waypoints: TimedWaypoint[]): MotionSample[] {
  const steps: MotionSample[] = [];
  for (const wp of waypoints) {
    if (!wp.note) continue;
    const prev = steps[steps.length - 1];
    if (prev && prev.note === wp.note && prev.attack === wp.attack) continue;
    steps.push({
      shift: wp.shift,
      thumbT: wp.thumbT,
      pressedFinger: wp.pressedFinger,
      note: wp.note,
      crossFinger: wp.crossFinger,
      attack: wp.attack,
    });
  }
  return steps;
}

/** Five-note position: degrees 1–5, no thumb-under cross. */
export function fiveFingerMotion(
  side: HandSide,
  dir: ScaleDir,
  timing: Timing = { mode: "lesson", bpm: 80 },
  pitches: string[] = DEFAULT_FIVE,
): MotionPlan {
  const upNotes =
    pitches.length >= 5 ? pitches.slice(0, 5) : DEFAULT_FIVE;
  const repeatPeak = dir === "updown";
  const downNotes = downPitches(upNotes, repeatPeak);
  const upRow = fiveFingers(side);
  const downRow = downFingersFromUp(upRow, repeatPeak);
  const up = buildWaypoints(zipTones(upNotes, upRow), timing);
  const down = buildWaypoints(zipTones(downNotes, downRow), timing);
  const gap = timing.mode === "smooth" ? beatMs(timing.bpm) : LESSON_STEP_MS;
  const peak = upNotes[upNotes.length - 1] ?? "G4";
  const waypoints =
    dir === "up" ? up : dir === "down" ? down : stitchUpDown(up, down, gap, peak);
  return {
    waypoints,
    totalMs: waypoints[waypoints.length - 1].time,
    steps: uniqueSteps(waypoints),
  };
}

export function fiveFingerIdle(): MotionSample {
  return {
    shift: 0,
    thumbT: 0,
    pressedFinger: null,
    note: null,
    crossFinger: 1,
    attack: 0,
  };
}
