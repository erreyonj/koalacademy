"use client";

/**
 * Marble throw / drop animation plus the two tiny WebAudio cues. No asset
 * files: the chime and ding are synthesised so the static build stays small
 * and nothing needs a CSP exception.
 */

let audioCtx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  startHz: number,
  endHz: number,
  at: number,
  length: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startHz, at);
  osc.frequency.exponentialRampToValueAtTime(endHz, at + length);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(amp).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** Bright two-note chime as the marble lands in the bucket. */
export function playChime() {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, 1046, 1046, now, 0.16, 0.18);
  tone(ctx, 1568, 1568, now + 0.09, 0.26, 0.16);
  // Glassy click on contact.
  tone(ctx, 2600, 1800, now, 0.05, 0.08, "triangle");
}

/** Short downward ding as a marble leaves the bucket. */
export function playDing() {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, 660, 330, now, 0.28, 0.16);
  tone(ctx, 440, 220, now + 0.06, 0.24, 0.1, "triangle");
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function centre(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function spawn(x: number, y: number, hue: number): HTMLSpanElement {
  const marble = document.createElement("span");
  marble.className = "marble-fx";
  marble.style.setProperty("--marble-hue", String(hue));
  marble.style.left = `${x}px`;
  marble.style.top = `${y}px`;
  document.body.appendChild(marble);
  return marble;
}

/**
 * Throw a marble from `from` into `bucket` along an arc. Resolves when it
 * lands so the caller can pulse the bucket in time with the chime.
 */
export function throwMarble(
  from: Element,
  bucket: Element,
  hue: number,
): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  const start = centre(from.getBoundingClientRect());
  const target = bucket.getBoundingClientRect();
  const end = { x: target.left + target.width / 2, y: target.top + target.height * 0.28 };
  const marble = spawn(start.x, start.y, hue);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lift = Math.min(220, Math.max(90, Math.abs(dx) * 0.35 + 60));

  const animation = marble.animate(
    [
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0 },
      {
        transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1.15)`,
        opacity: 1,
        offset: 0.5,
      },
      {
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`,
        opacity: 0.2,
        offset: 1,
      },
    ],
    { duration: 620, easing: "cubic-bezier(0.3, 0.1, 0.5, 1)", fill: "forwards" },
  );
  return animation.finished.then(
    () => marble.remove(),
    () => marble.remove(),
  );
}

/** Drop a marble out of the bottom of the bucket and let it fall away. */
export function dropMarble(bucket: Element, hue: number): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  const rect = bucket.getBoundingClientRect();
  const marble = spawn(rect.left + rect.width / 2, rect.bottom - 10, hue);
  const drift = (Math.random() - 0.5) * 40;
  const animation = marble.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.7)", opacity: 0, offset: 0 },
      { transform: "translate(-50%, 10px) scale(1)", opacity: 1, offset: 0.2 },
      {
        transform: `translate(calc(-50% + ${drift}px), 140px) scale(0.9)`,
        opacity: 0,
        offset: 1,
      },
    ],
    { duration: 560, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
  );
  return animation.finished.then(
    () => marble.remove(),
    () => marble.remove(),
  );
}
