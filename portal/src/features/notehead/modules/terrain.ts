/**
 * Rock masses per region, in that region's view space (+y down).
 * Portrait regions use 200×360; zig uses landscape 360×200.
 * Shapes follow the sim ledges. Drawing uses these outlines; `collide.ts`
 * makes them solid.
 */
import {
  LAUNCH_BAND,
  LANDSCAPE_VIEW,
  NOTCH_BLOCK,
  NOTCH_FLOOR,
  NOTCH_POCKET,
  PORTRAIT_VIEW,
  STAIR_TREADS,
  ZIG_LEFT,
  ZIG_PEAK,
  ZIG_RIGHT,
  ledgeYAt,
  toSvg,
  zigCameraFrame,
  type Ledge,
  type RegionId,
  type SvgViewSize,
} from "./sim";
import { seeded } from "./rand";

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

const { w: W, h: H } = PORTRAIT_VIEW;
/** Masses run this far past the frame so their outline never closes on screen. */
const OVER = 16;
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

function span(
  ledge: Ledge,
  regionId: RegionId = "launch",
): { x0: number; x1: number; y: number } {
  const a = toSvg(ledge.x0, ledge.y, regionId);
  const b = toSvg(ledge.x1, ledge.y, regionId);
  return { x0: a.x, x1: b.x, y: a.y };
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
function scoreMarks(
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

function mass(
  id: string,
  outline: Point[],
  rand: Rand,
  frame: SvgViewSize = PORTRAIT_VIEW,
): Mass {
  return { id, outline, ticks: scoreMarks(outline, rand, frame) };
}

/** A free vertex. Vertices pinned to a ledge use `at`. */
function rougher(rand: Rand, amount = 2.5) {
  return (x: number, y: number): Point =>
    at(x + (rand() - 0.5) * 2 * amount, y + (rand() - 0.5) * 2 * amount);
}

function launchMasses(): Mass[] {
  const rand = seeded(0x4c41);
  const rough = rougher(rand);
  const band = span(LAUNCH_BAND);
  // The shaft is the band's width plus a margin. Both cliffs stand outside it.
  const left = band.x0 - 7;
  const right = band.x1 + 7;
  const y = band.y;

  return [
    mass(
      "launch-left",
      [
        at(-OVER, -OVER),
        at(left + 1, -OVER),
        rough(left - 2, y - 214),
        rough(left + 2, y - 132),
        rough(left - 8, y - 94),
        rough(left - 13, y - 46),
        rough(left - 25, y - 20),
        at(-OVER, y - 46),
      ],
      rand,
    ),
    mass(
      "launch-right-back",
      [
        at(W + OVER, -OVER),
        at(right + 2, -OVER),
        rough(right + 5, y - 226),
        rough(right, y - 150),
        rough(right + 5, y - 74),
        rough(right + 14, y - 40),
        at(W + OVER, y - 30),
      ],
      rand,
    ),
    mass(
      "launch-right-front",
      [
        at(W + OVER, y - 118),
        rough(right + 19, y - 112),
        rough(right + 9, y - 78),
        rough(right + 4, y - 22),
        rough(right + 8, y + 24),
        at(right + 5, H + OVER),
        at(W + OVER, H + OVER),
      ],
      rand,
    ),
  ];
}

function stairMasses(): Mass[] {
  const rand = seeded(0x5354);
  const rough = rougher(rand, 1.5);
  // Lowest tread first in world +y, but SVG y grows down — sort by SVG y desc.
  const treads = [...STAIR_TREADS].sort((a, b) => a.y - b.y);
  const lowest = treads[0]!;
  const highest = treads[treads.length - 1]!;

  const lip = (tread: Ledge, x: number) => {
    const p = toSvg(x, ledgeYAt(tread, x));
    return at(p.x, p.y + INK / 2);
  };

  const lowLeft = lip(lowest, lowest.x0);
  const outline: Point[] = [
    at(lowLeft.x - 6, H + OVER),
    rough(lowLeft.x - 3, (lowLeft.y + H) / 2),
    lowLeft,
  ];
  treads.forEach((tread, index) => {
    const next = treads[index + 1];
    if (!next) return;
    const open = lip(tread, next.x0);
    const lean = 0.8 + rand() * 1.6;
    outline.push(at(open.x + lean, open.y));
    const mid = lip(next, next.x0);
    outline.push(
      at(
        mid.x + lean * 0.5 + (rand() - 0.5) * 2,
        open.y + (mid.y - open.y) * (0.35 + rand() * 0.3),
      ),
    );
    outline.push(mid);
  });
  // Trace the top tread's full lip so steeper slopes stay under rock.
  const highLeft = lip(highest, highest.x0);
  const highRight = lip(highest, highest.x1);
  if (outline[outline.length - 1] !== highLeft) {
    outline.push(highLeft);
  }
  outline.push(highRight);
  outline.push(at(W + OVER, highRight.y), at(W + OVER, H + OVER));

  return [mass("stair-stack", outline, rand)];
}

/**
 * Classic notch rock: left wall with a clear first peak above the pocket,
 * pocket shelf, lower slope under the floor band, and a pad under the block.
 */
function notchMasses(): Mass[] {
  const rand = seeded(0x4e56);
  const rough = rougher(rand, 1.8);
  const block = span(NOTCH_BLOCK, "notch");
  const floor = span(NOTCH_FLOOR, "notch");
  const pocket = span(NOTCH_POCKET, "notch");
  const blockLip = block.y + INK / 2;
  const floorLip = floor.y + INK / 2;
  const pocketLip = pocket.y + INK / 2;

  return [
    mass(
      "notch-wall-left",
      [
        at(0, 36),
        // Thin upper face, then a chamfer so pocket shots can go straight up
        // without the chart clipping the inner corner (see aim video).
        at(52, 36),
        at(52, pocketLip - 48),
        rough(58, pocketLip - 28),
        rough(68, pocketLip - 12),
        at(pocket.x0 - 2, pocketLip),
        at(pocket.x1 + 2, pocketLip),
        at(pocket.x1 + 2, pocketLip + 42),
        rough(96, 210),
        rough(150, 268),
        at(78, H),
        at(0, H),
      ],
      rand,
    ),
    mass(
      "notch-slope-low",
      [
        at(0, 332),
        rough(118, 308),
        at(floor.x0 - 4, floorLip + 6),
        at(floor.x0 + 2, floorLip),
        at(floor.x1 - 2, floorLip + 2),
        at(W, 286),
        at(W, H + OVER),
        at(0, H + OVER),
      ],
      rand,
    ),
    mass(
      "notch-block-pad",
      [
        at(block.x0 - 2, blockLip),
        at(block.x1 + 4, blockLip),
        at(block.x1 + 6, blockLip + 34),
        at(block.x0 - 4, blockLip + 34),
      ],
      rand,
    ),
  ];
}

/**
 * Zig landscape: twin hanging cliffs + bottom peak.
 * Keep outer bodies / peak (green). Cut upper inward teeth (red). Fill under
 * the right mid-shelf (orange). Outlines bleed into the camera pad.
 */
function zigMasses(): Mass[] {
  const frame = LANDSCAPE_VIEW;
  const { ox, oy } = zigCameraFrame();
  const rand = seeded(0x5a49);
  const rough = rougher(rand, 2.2);
  const peak = span(ZIG_PEAK, "zig");
  const left = span(ZIG_LEFT, "zig");
  const peakLip = peak.y + INK / 2;
  const leftLip = left.y + INK / 2;
  // Sloped right lip: sample both ends so the wedge sits under the step.
  const rightOpen = toSvg(ZIG_RIGHT.x0, ledgeYAt(ZIG_RIGHT, ZIG_RIGHT.x0), "zig");
  const rightWall = toSvg(ZIG_RIGHT.x1, ledgeYAt(ZIG_RIGHT, ZIG_RIGHT.x1), "zig");
  // Content-space edges that land on the outer camera frame after translate.
  const edgeL = -ox - OVER;
  const edgeT = -oy - OVER;
  const edgeR = frame.w + ox + OVER;
  const edgeB = frame.h + oy + OVER;

  return [
    mass(
      "zig-cliff-left",
      [
        // Green: keep the outer left body.
        at(edgeL, edgeT),
        at(102, edgeT),
        rough(96, 22),
        rough(82, 44),
        // Red: cut the inward tooth above the left shelf (recess the face).
        rough(64, leftLip - 44),
        at(left.x0 - 4, leftLip - 16),
        // Green: keep the left shelf lip.
        at(left.x0 - 6, leftLip),
        at(left.x1 + 4, leftLip),
        rough(left.x1 - 4, leftLip + 28),
        rough(36, leftLip + 56),
        rough(12, 168),
        at(edgeL, edgeB),
      ],
      rand,
      frame,
    ),
    // Right cliff: green mid body kept; red tip trimmed; orange fill under shelf.
    mass(
      "zig-cliff-right",
      [
        at(edgeR, edgeT),
        // Red: pull the top tip back (less corridor bite).
        at(292, edgeT),
        rough(304, 18),
        at(rightWall.x + 6, rightWall.y - 4),
        at(rightWall.x + 4, rightWall.y + INK / 2),
        at(rightOpen.x - 2, rightOpen.y + INK / 2),
        // Orange: solid fill under the mid-right shelf lip.
        at(rightOpen.x + 6, rightOpen.y + 12),
        at(rightOpen.x + 22, rightOpen.y + 28),
        rough(rightOpen.x + 40, rightOpen.y + 46),
        rough(310, rightOpen.y + 64),
        // Green: keep the lower right body into the wall.
        rough(340, 150),
        at(edgeR, edgeB),
      ],
      rand,
      frame,
    ),
    // Green: keep the bottom peak island.
    mass(
      "zig-peak",
      [
        at(96, edgeB),
        rough(118, peakLip + 22),
        at(peak.x0 - 6, peakLip + 4),
        at(peak.x0 + 6, peakLip),
        at(peak.x1 - 6, peakLip + 1),
        at(peak.x1 + 10, peakLip + 8),
        rough(260, peakLip + 22),
        at(280, edgeB),
      ],
      rand,
      frame,
    ),
  ];
}

const BUILDERS: Record<RegionId, () => Mass[]> = {
  launch: launchMasses,
  stairs: stairMasses,
  notch: notchMasses,
  zig: zigMasses,
};

const built = new Map<RegionId, readonly Mass[]>();

/** Drop cached outlines (tests / hot edits to ledges). */
export function clearMassCache(): void {
  built.clear();
}

/** Back to front. The same list comes back on every call. */
export function massesFor(regionId: RegionId): readonly Mass[] {
  let masses = built.get(regionId);
  if (!masses) {
    masses = BUILDERS[regionId]();
    built.set(regionId, masses);
  }
  return masses;
}
