export type SandboxScrollKind = "bottom" | "top";

export type SandboxScrollGeometry = {
  /** Total scrollable content height of the scroller (`scrollHeight`). */
  scrollHeight: number;
  /** Visible height of the scroller (`clientHeight`). */
  clientHeight: number;
  /** Sandbox top edge measured from the top of the scroll content. */
  sandboxTop: number;
};

/** Breathing room kept above the sandbox when scrolling back to it. */
export const SANDBOX_SCROLL_PAD = 12;

/**
 * Target `scrollTop` for the notation scroller.
 * - `bottom`: show the bottom of the content (second bar underneath).
 * - `top`: bring the sandbox (LCD, controls, first bar) to the top edge.
 */
export function planSandboxScroll(
  kind: SandboxScrollKind,
  geometry: SandboxScrollGeometry,
): number {
  const max = Math.max(0, geometry.scrollHeight - geometry.clientHeight);
  if (kind === "bottom") return max;
  const target = geometry.sandboxTop - SANDBOX_SCROLL_PAD;
  return Math.min(max, Math.max(0, target));
}

/** Slack allowed before the settle pass corrects an interrupted scroll. */
const SETTLE_TOLERANCE = 2;
/** Long enough for a smooth scroll (and a closing menu's scroll lock) to finish. */
const SETTLE_DELAY_MS = 500;

let settleTimer: ReturnType<typeof setTimeout> | null = null;

function measureTarget(
  kind: SandboxScrollKind,
  main: HTMLElement,
  sandbox: HTMLElement,
): number {
  const mainRect = main.getBoundingClientRect();
  const sandboxRect = sandbox.getBoundingClientRect();
  return planSandboxScroll(kind, {
    scrollHeight: main.scrollHeight,
    clientHeight: main.clientHeight,
    sandboxTop: sandboxRect.top - mainRect.top + main.scrollTop,
  });
}

/**
 * Scroll `main` so the sandbox is framed for the given kind. A smooth scroll can
 * be cut short (e.g. a dropdown closing re-locks the page), so a settle pass
 * re-measures and jumps the remaining distance.
 */
export function scrollSandbox(
  kind: SandboxScrollKind,
  main: HTMLElement,
  sandbox: HTMLElement,
): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  main.scrollTo({
    top: measureTarget(kind, main, sandbox),
    behavior: reduce ? "auto" : "smooth",
  });
  if (settleTimer != null) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = null;
    if (!main.isConnected || !sandbox.isConnected) return;
    const target = measureTarget(kind, main, sandbox);
    if (Math.abs(main.scrollTop - target) > SETTLE_TOLERANCE) {
      main.scrollTo({ top: target, behavior: "auto" });
    }
  }, SETTLE_DELAY_MS);
}
