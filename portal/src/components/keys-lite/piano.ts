/**
 * Tiny piano for the scale-hand widget. No sample files: partials
 * are synthesised so the static build stays small, matching marbleFx.ts.
 */

let audioCtx: AudioContext | null = null;
let previousAmps: GainNode[] = [];

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/** Unlock audio from the Play click (user gesture). */
export function resumePiano() {
  const ctx = context();
  if (ctx?.state === "suspended") void ctx.resume();
}

const SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function noteToHz(note: string): number | null {
  const match = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!match) return null;
  const offset = SEMITONE[match[1]];
  if (offset === undefined) return null;
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const midi = (Number(match[3]) + 1) * 12 + offset + accidental;
  return 440 * 2 ** ((midi - 69) / 12);
}

const PARTIALS: { ratio: number; type: OscillatorType; gain: number }[] = [
  { ratio: 1, type: "sine", gain: 0.22 },
  { ratio: 2, type: "sine", gain: 0.08 },
  { ratio: 3, type: "sine", gain: 0.035 },
  { ratio: 1, type: "triangle", gain: 0.045 },
];

const DECAY = 0.7;

export function playNote(note: string) {
  const ctx = context();
  if (!ctx) return;
  const hz = noteToHz(note);
  if (!hz) return;

  const now = ctx.currentTime;

  for (const amp of previousAmps) {
    try {
      amp.gain.cancelScheduledValues(now);
      amp.gain.setValueAtTime(Math.max(amp.gain.value, 0.0001), now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    } catch {
      // Node already stopped.
    }
  }

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1700, now);
  filter.Q.value = 0.65;
  filter.connect(ctx.destination);

  const amps: GainNode[] = [];
  for (const partial of PARTIALS) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = partial.type;
    osc.frequency.setValueAtTime(hz * partial.ratio, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(partial.gain, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + DECAY);
    osc.connect(amp).connect(filter);
    osc.start(now);
    osc.stop(now + DECAY + 0.03);
    amps.push(amp);
  }
  previousAmps = amps;
}
