/**
 * The Borealis cursor's rules, as pure functions of where and how often the
 * scene was clicked. Only Borealis added during play can be selected or
 * removed; the level's own are the level's, and stay put.
 *
 * A double-click on empty space nets to nothing: the first click adds a gem,
 * the second lands on it and removes it.
 */
import { distance, fromView, toView, viewSizeOf } from "../geometry";
import type { BorealisSpot, LevelView, Pt } from "../types";

/** Hit radius in view units. Matches the editor's marker size. */
export const GEM_HIT = 5;

export type CursorAction =
  | { kind: "add"; x: number; y: number }
  | { kind: "select"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "none" };

/** The added Borealis nearest `p` (view space) within the hit radius. */
export function gemAt(
  view: LevelView,
  extras: readonly BorealisSpot[],
  p: Pt,
  tol = GEM_HIT,
): BorealisSpot | null {
  let best: { gem: BorealisSpot; d: number } | null = null;
  for (const gem of extras) {
    const d = distance(p, toView(view, gem));
    if (d <= tol && (!best || d < best.d)) best = { gem, d };
  }
  return best?.gem ?? null;
}

/**
 * What one click does. `p` is the click in view space; `clicks` is the
 * browser's click count (1 single, 2 double).
 */
export function cursorAction(
  view: LevelView,
  extras: readonly BorealisSpot[],
  p: Pt,
  clicks: number,
  tol = GEM_HIT,
): CursorAction {
  const hit = gemAt(view, extras, p, tol);
  if (hit) {
    return clicks >= 2 ? { kind: "remove", id: hit.id } : { kind: "select", id: hit.id };
  }
  const size = viewSizeOf(view);
  if (p.x < 0 || p.y < 0 || p.x > size.w || p.y > size.h) return { kind: "none" };
  const at = fromView(view, p);
  return { kind: "add", x: at.x, y: at.y };
}
