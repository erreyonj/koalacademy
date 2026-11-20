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

const HULL_HIT_SRC = "/assets/notehead/sfx/MO_SV1_fx_caution.wav";
/** Default gain for terrain / HP-loss caution hit. */
const HULL_HIT_VOLUME = 0.12;
let hullHitAudio: HTMLAudioElement | null = null;

/** Caution sting when the ship strikes terrain hard enough to lose HP. */
export function playHullHit(): void {
  resume();
  if (typeof window === "undefined") return;
  if (!hullHitAudio) {
    hullHitAudio = new Audio(HULL_HIT_SRC);
    hullHitAudio.preload = "auto";
  }
  hullHitAudio.volume = HULL_HIT_VOLUME;
  try {
    hullHitAudio.currentTime = 0;
  } catch {
    // Ignore seek errors before the buffer is ready.
  }
  void hullHitAudio.play().catch(() => {
    /* autoplay / gesture gates — ignore */
  });
}

const SOFT_LANDING_SRC = "/assets/notehead/sfx/ship-landing-1.wav";
/** Soft Frequency Band / gentle terrain contact (no HP loss). */
const SOFT_LANDING_VOLUME = 0.22;
let softLandingAudio: HTMLAudioElement | null = null;

/** Thud for landings and bumps that do not cost hull. */
export function playSoftLanding(): void {
  resume();
  if (typeof window === "undefined") return;
  if (!softLandingAudio) {
    softLandingAudio = new Audio(SOFT_LANDING_SRC);
    softLandingAudio.preload = "auto";
  }
  softLandingAudio.volume = SOFT_LANDING_VOLUME;
  try {
    softLandingAudio.currentTime = 0;
  } catch {
    // Ignore seek errors before the buffer is ready.
  }
  void softLandingAudio.play().catch(() => {
    /* autoplay / gesture gates — ignore */
  });
}

const ANACH_REPAIR_SRC = "/assets/notehead/sfx/RU_TF_fx_reboot.wav";
/** Gain for the Anachrometer repair reboot cue. */
const ANACH_REPAIR_VOLUME = 0.25;
let anachRepairAudio: HTMLAudioElement | null = null;

/** Reboot sting when the Captain finishes repairing the Anachrometer. */
export function playAnachRepair(): void {
  resume();
  if (typeof window === "undefined") return;
  if (!anachRepairAudio) {
    anachRepairAudio = new Audio(ANACH_REPAIR_SRC);
    anachRepairAudio.preload = "auto";
  }
  anachRepairAudio.volume = ANACH_REPAIR_VOLUME;
  try {
    anachRepairAudio.currentTime = 0;
  } catch {
    // Ignore seek errors before the buffer is ready.
  }
  void anachRepairAudio.play().catch(() => {
    /* autoplay / gesture gates — ignore */
  });
}

const ANACH_WARP_SRC = "/assets/notehead/sfx/anach-warp-sound-loopable.wav";
/** Sustained warp pulse while the Anachrometer is held. */
const ANACH_WARP_VOLUME = 0.2;
/**
 * Koala HOLD+LOOP style: play the attack once, then loop the energy pulse
 * at the sample tail (~0.14s period ending at EOF).
 */
const ANACH_WARP_LOOP_START = 0.419;
const ANACH_WARP_FADE_OUT = 0.09;

let anachWarpBuffer: AudioBuffer | null = null;
let anachWarpLoading: Promise<AudioBuffer | null> | null = null;
let anachWarpSource: AudioBufferSourceNode | null = null;
let anachWarpGain: GainNode | null = null;
let anachWarpWanted = false;

async function loadAnachWarpBuffer(
  ctx: AudioContext,
): Promise<AudioBuffer | null> {
  if (anachWarpBuffer) return anachWarpBuffer;
  if (!anachWarpLoading) {
    anachWarpLoading = fetch(ANACH_WARP_SRC)
      .then((res) => res.arrayBuffer())
      .then((raw) => ctx.decodeAudioData(raw.slice(0)))
      .then((buffer) => {
        anachWarpBuffer = buffer;
        return buffer;
      })
      .catch(() => {
        anachWarpLoading = null;
        return null;
      });
  }
  return anachWarpLoading;
}

function haltAnachWarpNodes(ctx: AudioContext | null): void {
  const gain = anachWarpGain;
  const source = anachWarpSource;
  anachWarpGain = null;
  anachWarpSource = null;
  if (!gain && !source) return;
  const now = ctx?.currentTime ?? 0;
  try {
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
    }
    source?.stop(now);
  } catch {
    // already stopped
  }
  try {
    source?.disconnect();
    gain?.disconnect();
  } catch {
    // already disconnected
  }
}

function armAnachWarp(ctx: AudioContext, buffer: AudioBuffer): void {
  if (!anachWarpWanted) return;
  haltAnachWarpNodes(ctx);
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(ANACH_WARP_VOLUME, now + 0.02);
  gain.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const loopStart = Math.min(
    ANACH_WARP_LOOP_START,
    Math.max(0, buffer.duration - 0.05),
  );
  source.loopStart = loopStart;
  source.loopEnd = buffer.duration;
  source.connect(gain);
  source.start(now);
  anachWarpGain = gain;
  anachWarpSource = source;
}

/**
 * Engage the Anachrometer warp pulse: full sample attack, then loop the
 * tail energy region until `stopAnachWarp`.
 */
export function startAnachWarp(): void {
  if (typeof window === "undefined") return;
  anachWarpWanted = true;
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  if (anachWarpBuffer) {
    armAnachWarp(ctx, anachWarpBuffer);
    return;
  }
  void loadAnachWarpBuffer(ctx).then((buffer) => {
    if (buffer && anachWarpWanted) armAnachWarp(ctx, buffer);
  });
}

/** Release the Anachrometer warp pulse with a short fade-out. */
export function stopAnachWarp(): void {
  anachWarpWanted = false;
  const ctx = context();
  const gain = anachWarpGain;
  const source = anachWarpSource;
  if (!gain && !source) return;
  anachWarpGain = null;
  anachWarpSource = null;
  const now = ctx?.currentTime ?? 0;
  try {
    if (gain && ctx) {
      const level = Math.max(gain.gain.value, 0.0001);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + ANACH_WARP_FADE_OUT,
      );
    }
    source?.stop(now + ANACH_WARP_FADE_OUT + 0.02);
  } catch {
    // already stopped
  }
  window.setTimeout(() => {
    try {
      source?.disconnect();
      gain?.disconnect();
    } catch {
      // already disconnected
    }
  }, (ANACH_WARP_FADE_OUT + 0.05) * 1000);
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

const TYPE_TICK_SRCS = [
  "/assets/notehead/sfx/ESM_Sci-fi_Device_or_Item_Noise_5_Computing_Glitch_Morph_Mechanism_Texture_Futuristic.wav",
  "/assets/notehead/sfx/ESM_Scifi_Loading_Screen_Loop_27_Sci_Fi_Glitch_Morph_Mechanism_Texture_Futuristic.wav",
] as const;
/** Per-character burst from the CM glitch textures. */
const TYPE_TICK_VOLUME = 0.16;
const TYPE_TICK_DUR = 0.055;
let typeTickBuffers: AudioBuffer[] | null = null;
let typeTickLoading: Promise<AudioBuffer[] | null> | null = null;

async function loadTypeTickBuffers(
  ctx: AudioContext,
): Promise<AudioBuffer[] | null> {
  if (typeTickBuffers) return typeTickBuffers;
  if (!typeTickLoading) {
    typeTickLoading = Promise.all(
      TYPE_TICK_SRCS.map(async (src) => {
        const res = await fetch(src);
        const raw = await res.arrayBuffer();
        return ctx.decodeAudioData(raw.slice(0));
      }),
    )
      .then((buffers) => {
        typeTickBuffers = buffers;
        return buffers;
      })
      .catch(() => {
        typeTickLoading = null;
        return null;
      });
  }
  return typeTickLoading;
}

const IDLE_FLASH_SRC = TYPE_TICK_SRCS[0];
/** Gain for the idle HUD flash attract cue. */
const IDLE_FLASH_VOLUME = 0.16;
let idleFlashAudio: HTMLAudioElement | null = null;

/** Glitch texture while the idle chrome flash marches across the HUD. */
export function playIdleFlash(): void {
  resume();
  if (typeof window === "undefined") return;
  if (!idleFlashAudio) {
    idleFlashAudio = new Audio(IDLE_FLASH_SRC);
    idleFlashAudio.preload = "auto";
  }
  idleFlashAudio.volume = IDLE_FLASH_VOLUME;
  try {
    idleFlashAudio.currentTime = 0;
  } catch {
    // Ignore seek errors before the buffer is ready.
  }
  void idleFlashAudio.play().catch(() => {
    /* autoplay / gesture gates — ignore */
  });
}

/** Cut the idle flash cue when the attract ends or the player moves. */
export function stopIdleFlash(): void {
  if (!idleFlashAudio) return;
  idleFlashAudio.pause();
  try {
    idleFlashAudio.currentTime = 0;
  } catch {
    // Ignore seek errors before the buffer is ready.
  }
}

/**
 * CM typewriter tick: short random slice from one of two glitch textures.
 * Picks a buffer at random each character so the crawl jumps between them.
 */
export function playTypeTick(): void {
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const playSlice = (buffers: AudioBuffer[]) => {
    if (buffers.length === 0) return;
    const buffer = buffers[Math.floor(Math.random() * buffers.length)]!;
    const maxOffset = Math.max(0, buffer.duration - TYPE_TICK_DUR);
    const offset = Math.random() * maxOffset;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(TYPE_TICK_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + TYPE_TICK_DUR);
    src.connect(gain).connect(ctx.destination);
    src.start(now, offset, TYPE_TICK_DUR);
  };

  if (typeTickBuffers) {
    playSlice(typeTickBuffers);
    return;
  }
  void loadTypeTickBuffers(ctx).then((buffers) => {
    if (buffers) playSlice(buffers);
  });
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
