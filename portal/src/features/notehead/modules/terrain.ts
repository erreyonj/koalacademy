/**
 * Rock masses per region, in that region's view space (+y down).
 * Route levels bring their own authored rock through `regions.ts`.
 * Drawing uses these outlines; `collide.ts` makes them solid.
 */
import {
  PORTRAIT_VIEW,
  type RegionId,
  type SvgViewSize,
} from "./sim";
import { regionData } from "./regions";

export interface Point {
  x: number;
  y: number;
}

export interface Mass {
  id: string;
  outline: readonly Point[];
  /** Score marks inside the rock. Each entry is one open stroke. */
  ticks: readonly (readonly Point[])[];
}

/** Outline weight. Landable tops sit half of it low, so the ship rests on the ink. */
export const INK = 2.6;

/** Marks keep this far from the outline. */
const CLEAR = 5;
/** Marks keep this far from each other. */
const SPREAD = 13;
/** Grid step for mark starts. */
const CELL = 6;
/** Visible rock, in square view units, that earns one mark. */
const AREA_PER_MARK = 800;
const MOST_MARKS = 18;

type Rand = () => number;

function at(x: number, y: number): Point {
  return { x, y };
}

function gap(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function insideMass(point: Point, mass: Pick<Mass, "outline">): boolean {
  const ring = mass.outline;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const straddles = a.y > point.y !== b.y > point.y;
    if (!straddles) continue;
    const cross = a.x + ((point.y - a.y) / (b.y - a.y)) * (b.x - a.x);
    if (point.x < cross) inside = !inside;
  }
  return inside;
}

/** Distance to the nearest outline edge, and that edge's heading. */
function nearestEdge(
  point: Point,
  ring: readonly Point[],
): { gap: number; heading: number } {
  let best = { gap: Infinity, heading: 0 };
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const along = Math.max(
      0,
      Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq),
    );
    const distance = gap(point, at(a.x + dx * along, a.y + dy * along));
    if (distance < best.gap) best = { gap: distance, heading: Math.atan2(dy, dx) };
  }
  return best;
}

/**
 * Score marks for one rock. The count follows the visible area, and starts
 * are drawn from a shuffled grid so the marks spread over the whole face.
 */
export function scoreMarks(
  ring: readonly Point[],
  rand: Rand,
  frame: SvgViewSize = PORTRAIT_VIEW,
): Point[][] {
  const xs = ring.map((point) => point.x);
  const ys = ring.map((point) => point.y);
  const minX = Math.max(3, Math.min(...xs));
  const maxX = Math.min(frame.w - 3, Math.max(...xs));
  const minY = Math.max(3, Math.min(...ys));
  const maxY = Math.min(frame.h - 3, Math.max(...ys));

  const roomy = (point: Point) =>
    point.x >= minX &&
    point.x <= maxX &&
    point.y >= minY &&
    point.y <= maxY &&
    insideMass(point, { outline: ring }) &&
    nearestEdge(point, ring).gap >= CLEAR;

  const cells: Point[] = [];
  for (let x = minX; x <= maxX; x += CELL) {
    for (let y = minY; y <= maxY; y += CELL) {
      if (roomy(at(x, y))) cells.push(at(x, y));
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  const count = Math.min(
    MOST_MARKS,
    Math.round((cells.length * CELL * CELL) / AREA_PER_MARK),
  );

  const marks: Point[][] = [];
  const taken: Point[] = [];
  let placed = 0;

  for (const cell of cells) {
    if (placed >= count) break;
    const start = at(
      cell.x + (rand() - 0.5) * CELL,
      cell.y + (rand() - 0.5) * CELL,
    );
    if (!roomy(start)) continue;
    if (taken.some((other) => gap(other, start) < SPREAD)) continue;

    const heading = nearestEdge(start, ring).heading + (rand() - 0.5) * 0.9;
    let reach = 6 + rand() * 12;
    let end = start;
    for (; reach >= 5; reach -= 1.5) {
      end = at(
        start.x + Math.cos(heading) * reach,
        start.y + Math.sin(heading) * reach,
      );
      if (roomy(end) && !taken.some((other) => gap(other, end) < SPREAD)) break;
    }
    if (reach < 5) continue;

    const mark = [start, end];
    const style = rand();
    if (style < 0.35) {
      const turn = heading + (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.5);
      const hook = at(end.x + Math.cos(turn) * 4, end.y + Math.sin(turn) * 4);
      if (roomy(hook)) mark.push(hook);
    }
    marks.push(mark);
    if (style > 0.7) {
      const from = at(end.x + Math.cos(heading) * 3.4, end.y + Math.sin(heading) * 3.4);
      const to = at(from.x + Math.cos(heading) * 2.2, from.y + Math.sin(heading) * 2.2);
      if (roomy(from) && roomy(to)) marks.push([from, to]);
    }
    taken.push(start, end);
    placed += 1;
  }
  return marks;
}

/**
 * Back to front. The same list comes back on every call. Rock comes from a
 * route level's registered region; the bare "launch" pseudo-region (the
 * editor's portrait frame) has none.
 */
export function massesFor(regionId: RegionId): readonly Mass[] {
  return regionData(regionId)?.masses ?? [];
}
