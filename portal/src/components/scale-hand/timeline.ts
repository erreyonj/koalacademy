import { strikePoint, whiteCenter, type Point } from "./keyboard";

export type Finger = 1 | 2 | 3 | 4 | 5;
export type HandSide = "right" | "left";
export type ScaleDir = "up" | "down" | "updown";
export type TimingMode = "lesson" | "smooth";
export type Timing = { mode: TimingMode; bpm: number };

export const TEMPO_PRESETS = [60, 80, 100, 120] as const;

export function beatMs(bpm: number): number {
  return 60_000 / bpm;
}

export function nextTempo(bpm: number): number {
  const index = TEMPO_PRESETS.indexOf(bpm as (typeof TEMPO_PRESETS)[number]);
  return TEMPO_PRESETS[(index + 1) % TEMPO_PRESETS.length];
}

export type MotionSample = {
  shift: number;
  thumbT: number;
  pressedFinger: Finger | null;
  note: string | null;
  crossFinger: Finger;
  /** Increments on each sounded note so C5 can retrigger at the turnaround. */
  attack: number;
};

export type TimedWaypoint = MotionSample & { time: number };

export type HandLayout = {
  palm: Point;
  wristRot: number;
  bases: Record<Finger, Point>;
  joints: Record<Finger, Point>;
  tips: Record<Finger, Point>;
  pressedFinger: Finger | null;
  note: string | null;
  thumbT: number;
};

export type MotionPlan = {
  waypoints: TimedWaypoint[];
  totalMs: number;
  steps: MotionSample[];
};

export const FINGERS: Finger[] = [1, 2, 3, 4, 5];

type Tone = { note: string; finger: Finger };

/** C–G span, then F–C after the crossing. Right-hand numbers. */
const GROUP1_RH: Record<Finger, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
const GROUP2_RH: Record<Finger, number> = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 };
/** Left hand: 5 on C, 1 on G, then 5 on F, 1 on C5. */
const GROUP1_LH: Record<Finger, number> = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 };
const GROUP2_LH: Record<Finger, number> = { 1: 7, 2: 6, 3: 5, 4: 4, 5: 3 };

const PALM_G1_RH: Point = { x: 208, y: 222 };
const PALM_G2_RH: Point = { x: 370, y: 222 };

const AXIS_G1 = whiteCenter(2);
const AXIS_G2 = whiteCenter(5);
const PALM_G1_LH: Point = { x: 2 * AXIS_G1 - PALM_G1_RH.x, y: PALM_G1_RH.y };
const PALM_G2_LH: Point = { x: 2 * AXIS_G2 - PALM_G2_RH.x, y: PALM_G2_RH.y };

const BASES_RH: Record<Finger, Point> = {
  1: { x: -80, y: -14 },
  2: { x: -28, y: -22 },
  3: { x: -6, y: -26 },
  4: { x: 16, y: -22 },
  5: { x: 34, y: -12 },
};

const BASES_LH: Record<Finger, Point> = {
  1: { x: -BASES_RH[1].x, y: BASES_RH[1].y },
  2: { x: -BASES_RH[2].x, y: BASES_RH[2].y },
  3: { x: -BASES_RH[3].x, y: BASES_RH[3].y },
  4: { x: -BASES_RH[4].x, y: BASES_RH[4].y },
  5: { x: -BASES_RH[5].x, y: BASES_RH[5].y },
};

/** Light PIP offset toward the player — piano form, not an arch. */
const CURL: Record<Finger, number> = {
  1: 5,
  2: 8,
  3: 10,
  4: 8,
  5: 6,
};

const UP_FINGERS_RH: Finger[] = [1, 2, 3, 1, 2, 3, 4, 5];
const UP_FINGERS_LH: Finger[] = [5, 4, 3, 2, 1, 3, 2, 1];
const DOWN_FINGERS_RH: Finger[] = [5, 4, 3, 2, 1, 3, 2, 1];
const DOWN_FINGERS_LH: Finger[] = [1, 2, 3, 1, 2, 3, 4, 5];

const DEFAULT_PITCHES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];

function zipTones(notes: string[], fingers: Finger[]): Tone[] {
  return notes.map((note, index) => ({ note, finger: fingers[index] ?? 1 }));
}

function downPitches(up: string[], repeatPeak: boolean): string[] {
  const top = up[up.length - 1];
  if (!top) return up;
  const rest = [...up.slice(0, -1)].reverse();
  return repeatPeak ? [top, top, ...rest] : [top, ...rest];
}

function downFingers(side: HandSide, repeatPeak: boolean): Finger[] {
  const fingers = side === "right" ? DOWN_FINGERS_RH : DOWN_FINGERS_LH;
  return repeatPeak ? [fingers[0], ...fingers] : fingers;
}

/** First tone after the 3–1 / 1–3 turn. Up/down prepends a second peak, so +1 then. */
const CROSS_AT = {
  up: { right: 3, left: 5 },
  down: { right: 5, left: 3 },
} as const;

export function crossingFinger(side: HandSide, dir: "up" | "down"): Finger {
  if (side === "right") return dir === "up" ? 1 : 3;
  return dir === "up" ? 3 : 1;
}

export function crossingLabel(side: HandSide, dir: "up" | "down"): string {
  return crossingFinger(side, dir) === 1 ? "thumb under" : "third over";
}

function groupTips(indices: Record<Finger, number>): Record<Finger, Point> {
  return {
    1: strikePoint(indices[1], true),
    2: strikePoint(indices[2], false),
    3: strikePoint(indices[3], false),
    4: strikePoint(indices[4], false),
    5: strikePoint(indices[5], false),
  };
}

const TIPS_RH_G1 = groupTips(GROUP1_RH);
const TIPS_RH_G2 = groupTips(GROUP2_RH);
const TIPS_LH_G1 = groupTips(GROUP1_LH);
const TIPS_LH_G2 = groupTips(GROUP2_LH);

const LESSON_FIRST_MS = 240;
const LESSON_STEP_MS = 480;
const LESSON_END_MS = 820;

function buildWaypoints(
  tones: Tone[],
  crossAt: number,
  fromShift: 0 | 1,
  crossFinger: Finger,
  timing: Timing,
): TimedWaypoint[] {
  const toShift = (fromShift === 0 ? 1 : 0) as 0 | 1;
  const fromT = fromShift;
  const toT = toShift;
  const smooth = timing.mode === "smooth";
  const step = smooth ? beatMs(timing.bpm) : LESSON_STEP_MS;
  const first = smooth ? step : LESSON_FIRST_MS;
  const wps: TimedWaypoint[] = [
    {
      time: 0,
      shift: fromShift,
      thumbT: fromT,
      pressedFinger: null,
      note: null,
      crossFinger,
      attack: 0,
    },
  ];
  let time = 0;
  let attack = 0;

  const pose = (
    at: number,
    shift: number,
    thumbT: number,
    tone: Tone | null,
    attackAt: number,
  ): TimedWaypoint => ({
    time: at,
    shift,
    thumbT,
    pressedFinger: tone?.finger ?? null,
    note: tone?.note ?? null,
    crossFinger,
    attack: attackAt,
  });

  for (let i = 0; i < tones.length; i++) {
    if (!smooth && i === crossAt) {
      const hold = tones[i - 1];
      time += 550;
      wps.push(pose(time, fromShift, fromT + 0.2 * (toT - fromT), hold, attack));
      time += 550;
      wps.push(pose(time, fromShift, fromT + 0.72 * (toT - fromT), hold, attack));
      time += 1000;
      wps.push(pose(time, fromShift, fromT + 0.72 * (toT - fromT), hold, attack));
      attack += 1;
      time += 480;
      wps.push(pose(time, fromShift + 0.22 * (toShift - fromShift), toT, tones[i], attack));
      time += 440;
      wps.push(pose(time, toShift, toT, tones[i], attack));
      continue;
    }
    attack += 1;
    time += i === 0 ? first : step;
    const crossed = i >= crossAt;
    wps.push(
      pose(
        time,
        crossed ? toShift : fromShift,
        crossed ? toT : fromT,
        tones[i],
        attack,
      ),
    );
  }
  time += smooth ? step : LESSON_END_MS;
  wps.push(pose(time, toShift, toT, tones[tones.length - 1], attack));
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

export function motionFor(
  side: HandSide,
  dir: ScaleDir,
  timing: Timing = { mode: "lesson", bpm: 80 },
  pitches: string[] = DEFAULT_PITCHES,
): MotionPlan {
  const upNotes = pitches.length === 8 ? pitches : DEFAULT_PITCHES;
  const repeatPeak = dir === "updown";
  const downNotes = downPitches(upNotes, repeatPeak);
  const upCross = crossingFinger(side, "up");
  const downCross = crossingFinger(side, "down");
  const upTones = zipTones(upNotes, side === "right" ? UP_FINGERS_RH : UP_FINGERS_LH);
  const downTones = zipTones(downNotes, downFingers(side, repeatPeak));
  const downCrossAt = CROSS_AT.down[side] + (repeatPeak ? 1 : 0);
  const up = buildWaypoints(upTones, CROSS_AT.up[side], 0, upCross, timing);
  const down = buildWaypoints(downTones, downCrossAt, 1, downCross, timing);
  const gap = timing.mode === "smooth" ? beatMs(timing.bpm) : LESSON_STEP_MS;
  const peak = upNotes[upNotes.length - 1] ?? "C5";
  const waypoints = dir === "up" ? up : dir === "down" ? down : stitchUpDown(up, down, gap, peak);
  return {
    waypoints,
    totalMs: waypoints[waypoints.length - 1].time,
    steps: uniqueSteps(waypoints),
  };
}

export function idleSample(side: HandSide, dir: ScaleDir): MotionSample {
  const down = dir === "down";
  const phase: "up" | "down" = down ? "down" : "up";
  return {
    shift: down ? 1 : 0,
    thumbT: down ? 1 : 0,
    pressedFinger: null,
    note: null,
    crossFinger: crossingFinger(side, phase),
    attack: 0,
  };
}

export const STEP_HOLD_MS = 550;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

function quad(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function rotateAround(point: Point, origin: Point, deg: number): Point {
  const r = (deg * Math.PI) / 180;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: origin.y + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

export function sampleMotion(timeMs: number, waypoints: TimedWaypoint[]): MotionSample {
  const total = waypoints[waypoints.length - 1].time;
  const time = Math.max(0, Math.min(total, timeMs));
  let i = 0;
  while (i < waypoints.length - 1 && waypoints[i + 1].time <= time) i += 1;
  const from = waypoints[i];
  const to = waypoints[Math.min(i + 1, waypoints.length - 1)];
  if (to.time === from.time) {
    return {
      shift: from.shift,
      thumbT: from.thumbT,
      pressedFinger: from.pressedFinger,
      note: from.note,
      crossFinger: from.crossFinger,
      attack: from.attack,
    };
  }
  const u = (time - from.time) / (to.time - from.time);
  const e = easeInOut(u);
  return {
    shift: lerp(from.shift, to.shift, e),
    thumbT: lerp(from.thumbT, to.thumbT, e),
    pressedFinger: u < 0.5 ? from.pressedFinger : to.pressedFinger,
    note: u < 0.5 ? from.note : to.note,
    crossFinger: u < 0.5 ? from.crossFinger : to.crossFinger,
    attack: u < 0.5 ? from.attack : to.attack,
  };
}

export function layoutHand(sample: MotionSample, side: HandSide): HandLayout {
  const palmG1 = side === "right" ? PALM_G1_RH : PALM_G1_LH;
  const palmG2 = side === "right" ? PALM_G2_RH : PALM_G2_LH;
  const basesLocal = side === "right" ? BASES_RH : BASES_LH;
  const tipsG1 = side === "right" ? TIPS_RH_G1 : TIPS_LH_G1;
  const tipsG2 = side === "right" ? TIPS_RH_G2 : TIPS_LH_G2;
  const palm = lerpPoint(palmG1, palmG2, sample.shift);
  const tuckBump = sample.thumbT * (1 - sample.thumbT);
  const wristRot =
    side === "right"
      ? lerp(-30, -22, sample.shift) - tuckBump * 8
      : lerp(30, 22, sample.shift) + tuckBump * 8;

  const bases = {} as Record<Finger, Point>;
  for (const finger of FINGERS) {
    bases[finger] = rotateAround(add(palm, basesLocal[finger]), palm, wristRot);
  }

  const tips = {} as Record<Finger, Point>;
  for (const finger of FINGERS) {
    if (finger === sample.crossFinger) {
      const from = tipsG1[finger];
      const to = tipsG2[finger];
      const arc: Point = {
        x: (from.x + to.x) / 2 + (side === "right" ? 18 : -18),
        y: Math.min(from.y, to.y) - 18,
      };
      tips[finger] = quad(from, arc, to, sample.thumbT);
    } else {
      tips[finger] = lerpPoint(tipsG1[finger], tipsG2[finger], sample.shift);
    }
  }

  for (const finger of [2, 3, 4, 5] as Finger[]) {
    bases[finger] = {
      x: tips[finger].x + (bases[finger].x - tips[finger].x) * 1.08,
      y: tips[finger].y + (bases[finger].y - tips[finger].y) * 1.08,
    };
  }

  for (const finger of FINGERS) {
    const pressed = sample.pressedFinger === finger;
    tips[finger] = { x: tips[finger].x, y: tips[finger].y + (pressed ? 5 : -7) };
  }

  const joints = {} as Record<Finger, Point>;
  for (const finger of FINGERS) {
    joints[finger] = curlJoint(bases[finger], tips[finger], JOINT_T[finger], CURL[finger]);
  }

  return {
    palm,
    wristRot,
    bases,
    joints,
    tips,
    pressedFinger: sample.pressedFinger,
    note: sample.note,
    thumbT: sample.thumbT,
  };
}

function curlJoint(base: Point, tip: Point, t: number, curl: number): Point {
  const mid = lerpPoint(base, tip, t);
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: mid.x + nx * curl, y: mid.y + ny * curl };
}

export function isTucking(sample: MotionSample): boolean {
  return sample.thumbT > 0.12 && sample.thumbT < 0.92;
}

export function lcdLine(
  sample: MotionSample,
  scaleName = "C major",
  side: HandSide = "right",
  opts: { both?: boolean; smooth?: boolean; bpm?: number } = {},
): string {
  const pace = opts.smooth ? ` · ${opts.bpm} bpm` : "";
  if (opts.both) {
    if (sample.note) return `${sample.note} · both`;
    return `${scaleName} · both${pace}`;
  }
  const hand = side === "right" ? "right" : "left";
  if (!sample.note) {
    return `${scaleName} · ${hand}${pace}`;
  }
  if (!opts.smooth && isTucking(sample)) {
    const label = sample.crossFinger === 1 ? "thumb under" : "third over";
    return `${sample.note} · ${label}`;
  }
  if (sample.pressedFinger) {
    return `${sample.note} · finger ${sample.pressedFinger}`;
  }
  return `${scaleName} · ${hand}${pace}`;
}

export const FINGER_WIDTH: Record<Finger, number> = {
  1: 24,
  2: 18,
  3: 19,
  4: 17,
  5: 15,
};

/** PIP sits about two-fifths of the way to the tip. */
export const JOINT_T: Record<Finger, number> = {
  1: 0.52,
  2: 0.4,
  3: 0.38,
  4: 0.4,
  5: 0.43,
};
