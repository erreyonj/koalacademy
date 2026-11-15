/**
 * Notehead voices. Discrete pitches for landings and the goal tap.
 * One oscillator glides to each scale degree while the ship is rising.
 */

let audioCtx: AudioContext | null = null;
let climbOsc: OscillatorNode | null = null;
let climbGain: GainNode | null = null;

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

function noteToHz(note: string): number | null {
  const match = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!match) return null;
  const semitone: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  const offset = semitone[match[1]];
  if (offset === undefined) return null;
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const midi = (Number(match[3]) + 1) * 12 + offset + accidental;
  return 440 * 2 ** ((midi - 69) / 12);
}

export function resume(): void {
  const ctx = context();
  if (ctx?.state === "suspended") void ctx.resume();
}

export function playPitch(pitch: string): void {
  const ctx = context();
  const hz = noteToHz(pitch);
  if (!ctx || !hz) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(hz, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.46);
}

/** Glide the climb voice to `pitch`, or stop it when `pitch` is null. */
export function setClimb(pitch: string | null): void {
  const ctx = context();
  if (!ctx) return;
  if (!pitch) {
    if (climbGain) {
      const now = ctx.currentTime;
      climbGain.gain.cancelScheduledValues(now);
      climbGain.gain.setValueAtTime(Math.max(climbGain.gain.value, 0.0001), now);
      climbGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    }
    const osc = climbOsc;
    window.setTimeout(() => {
      try {
        osc?.stop();
      } catch {
        // already stopped
      }
      if (climbOsc === osc) {
        climbOsc = null;
        climbGain = null;
      }
    }, 120);
    return;
  }
  const hz = noteToHz(pitch);
  if (!hz) return;
  const now = ctx.currentTime;
  if (!climbOsc || !climbGain) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    climbOsc = osc;
    climbGain = gain;
    return;
  }
  climbOsc.frequency.cancelScheduledValues(now);
  climbOsc.frequency.linearRampToValueAtTime(hz, now + 0.06);
}
