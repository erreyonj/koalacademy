/**
 * Notehead voices. Discrete pitches for landings and the goal tap.
 * One oscillator glides to each scale degree while the ship is rising.
 * Aim pull ticks short descending plucks only while the trajectory extends
 * (timbre matched to a note-repeat scrub reference).
 */

let audioCtx: AudioContext | null = null;
let climbOsc: OscillatorNode | null = null;
let climbGain: GainNode | null = null;

/** Below this power the aim clicks stay silent. */
const AIM_MIN_POWER = 0.05;
/** Click interval (ms) at light / full extension while casting further. */
const AIM_INTERVAL_SLOW = 120;
const AIM_INTERVAL_FAST = 58;
/** Ignore micro jitter smaller than this as "not casting further". */
const AIM_EXTEND_EPS = 0.004;
/** Stop ticks if extension stalls this long (ms). */
const AIM_STALL_MS = 48;

let aimPower = 0;
let aimLastClickMs = 0;
let aimLastExtendMs = 0;
let aimRaf = 0;

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

function aimIntervalMs(power: number): number {
  const t = Math.min(1, Math.max(0, power));
  const shaped = t * t * 0.45 + t * 0.55;
  return AIM_INTERVAL_SLOW + (AIM_INTERVAL_FAST - AIM_INTERVAL_SLOW) * shaped;
}

/**
 * Short descending pluck (~35ms): bright attack ~650Hz settling ~420Hz.
 * Same gesture each tick; louder as the chart extends.
 */
function playAimClick(ctx: AudioContext, power: number): void {
  const now = ctx.currentTime;
  const level = 0.045 + Math.min(1, power) * 0.09;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, now);
  filter.frequency.exponentialRampToValueAtTime(1100, now + 0.03);
  filter.Q.value = 0.85;
  filter.connect(ctx.destination);

  // Soft high tip on the attack.
  const tip = ctx.createOscillator();
  const tipGain = ctx.createGain();
  tip.type = "triangle";
  tip.frequency.setValueAtTime(980, now);
  tip.frequency.exponentialRampToValueAtTime(520, now + 0.018);
  tipGain.gain.setValueAtTime(0.0001, now);
  tipGain.gain.exponentialRampToValueAtTime(level * 0.35, now + 0.003);
  tipGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
  tip.connect(tipGain).connect(filter);
  tip.start(now);
  tip.stop(now + 0.03);

  // Main descending body.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(650, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.032);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(level, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(level * 0.45, now + 0.016);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
  osc.connect(gain).connect(filter);
  osc.start(now);
  osc.stop(now + 0.045);
}

function silenceAimLoop(): void {
  aimLastExtendMs = 0;
  if (aimRaf) {
    window.cancelAnimationFrame(aimRaf);
    aimRaf = 0;
  }
}

function stopAimClicks(): void {
  aimPower = 0;
  silenceAimLoop();
}

function aimLoop(stamp: number): void {
  aimRaf = 0;
  if (aimPower < AIM_MIN_POWER || stamp - aimLastExtendMs > AIM_STALL_MS) {
    silenceAimLoop();
    return;
  }
  const ctx = context();
  if (!ctx) {
    silenceAimLoop();
    return;
  }
  const gap = aimIntervalMs(aimPower);
  if (stamp - aimLastClickMs >= gap) {
    playAimClick(ctx, aimPower);
    aimLastClickMs = stamp;
  }
  aimRaf = window.requestAnimationFrame(aimLoop);
}

/**
 * Aim pull cue. Short descending plucks only while the trajectory is casting
 * further; rate and level scale with extension. Holding still or retracting
 * stops. Pass null to stop.
 */
export function setAimTone(power: number | null): void {
  if (power === null || power < AIM_MIN_POWER) {
    stopAimClicks();
    return;
  }
  const next = Math.min(1, power);
  const now = performance.now();
  const extending = next > aimPower + AIM_EXTEND_EPS;
  aimPower = next;
  if (!extending) {
    silenceAimLoop();
    return;
  }

  aimLastExtendMs = now;
  if (!aimRaf) {
    const ctx = context();
    if (ctx) {
      playAimClick(ctx, aimPower);
      aimLastClickMs = now;
    }
    aimRaf = window.requestAnimationFrame(aimLoop);
  }
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
