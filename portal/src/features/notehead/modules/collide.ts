/**
 * Solid rock: keep the ship outside terrain masses so landings and hull hits
 * have something to bump into.
 */
import {
  containAgainstOpenings,
  leftFrameThroughOpening,
  touchedOpening,
  type FrameOpening,
} from "./exit-zone";
import {
  BREAK_SPEED,
  FIXED_DT,
  GRAVITY,
  MASS_HIT_SPEED,
  SHIP_R,
  WORLD_H,
  WORLD_W,
  fromSvgPoint,
  isSlopedStep,
  launchVelocity,
  ledgeById,
  ledgesFor,
  step,
  type Aim,
  type AimMode,
  type Body,
  type Ledge,
  type RegionId,
  type StepPolicy,
} from "./sim";
import { insideMass, massesFor, type Mass, type Point } from "./terrain";

export { MASS_BUMP_SPEED, MASS_HIT_SPEED } from "./sim";

/** Maximum simulated frames for the live trajectory preview (10 s at 60 Hz). */
const CHART_SOLID_FRAMES = 600;
/** Squared logical travel per frame below which an unseated preview counts as stalled on rock. */
const CHART_STALL_STEP_SQ = 0.25;
/** Consecutive stalled frames before terminating a rock-wedged preview. */
const CHART_STALL_LIMIT = 6;

export interface LogicalMass {
  id: string;
  outline: Point[];
}

interface PreparedMass {
  id: string;
  outline: readonly Point[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  ax: Float64Array;
  ay: Float64Array;
  dx: Float64Array;
  dy: Float64Array;
  invLenSq: Float64Array;
  nx: Float64Array;
  ny: Float64Array;
  edgeCount: number;
}

const logicalCache = new WeakMap<readonly Mass[], readonly LogicalMass[]>();
const preparedMassCache = new WeakMap<LogicalMass, PreparedMass>();
const preparedListCache = new WeakMap<
  readonly LogicalMass[],
  readonly PreparedMass[]
>();

function prepareMass(mass: LogicalMass): PreparedMass {
  const hit = preparedMassCache.get(mass);
  if (hit) return hit;

  const ring = mass.outline;
  const n = ring.length;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const axArr: number[] = [];
  const ayArr: number[] = [];
  const dxArr: number[] = [];
  const dyArr: number[] = [];
  const invLenSqArr: number[] = [];
  const nxArr: number[] = [];
  const nyArr: number[] = [];

  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    if (a.x < minX) minX = a.x;
    if (a.x > maxX) maxX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.y > maxY) maxY = a.y;

    const b = ring[(i + 1) % n]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-12) continue;

    const len = Math.sqrt(lenSq);
    let nx = -dy / len;
    let ny = dx / len;
    const probe = {
      x: a.x + dx * 0.5 + nx * 0.05,
      y: a.y + dy * 0.5 + ny * 0.05,
    };
    if (insideMass(probe, mass)) {
      nx = -nx;
      ny = -ny;
    }

    axArr.push(a.x);
    ayArr.push(a.y);
    dxArr.push(dx);
    dyArr.push(dy);
    invLenSqArr.push(1 / lenSq);
    nxArr.push(nx);
    nyArr.push(ny);
  }

  const prepared: PreparedMass = {
    id: mass.id,
    outline: ring,
    minX,
    minY,
    maxX,
    maxY,
    ax: Float64Array.from(axArr),
    ay: Float64Array.from(ayArr),
    dx: Float64Array.from(dxArr),
    dy: Float64Array.from(dyArr),
    invLenSq: Float64Array.from(invLenSqArr),
    nx: Float64Array.from(nxArr),
    ny: Float64Array.from(nyArr),
    edgeCount: axArr.length,
  };
  preparedMassCache.set(mass, prepared);
  return prepared;
}

function preparedList(masses: readonly LogicalMass[]): readonly PreparedMass[] {
  let cached = preparedListCache.get(masses);
  if (cached) return cached;
  cached = masses.map(prepareMass);
  preparedListCache.set(masses, cached);
  return cached;
}

function logicalMasses(regionId: RegionId): readonly LogicalMass[] {
  const view = massesFor(regionId);
  let cached = logicalCache.get(view);
  if (cached) return cached;
  cached = view.map((mass) => ({
    id: mass.id,
    outline: mass.outline.map((point) =>
      fromSvgPoint(point.x, point.y, regionId),
    ),
  }));
  logicalCache.set(view, cached);
  return cached;
}

function resolveOne(
  body: Body,
  prep: PreparedMass,
): { body: Body; hit: boolean; into: number; resolved: boolean } {
  const cx = body.x;
  const cy = body.y;
  if (
    prep.edgeCount === 0 ||
    cx < prep.minX - SHIP_R ||
    cx > prep.maxX + SHIP_R ||
    cy < prep.minY - SHIP_R ||
    cy > prep.maxY + SHIP_R
  ) {
    return { body, hit: false, into: 0, resolved: false };
  }

  let bestDistSq = Infinity;
  let bestPx = 0;
  let bestPy = 0;
  let bestNx = 0;
  let bestNy = 1;
  const { ax, ay, dx, dy, invLenSq, nx, ny, edgeCount } = prep;

  for (let i = 0; i < edgeCount; i++) {
    const ex = dx[i]!;
    const ey = dy[i]!;
    const rx = cx - ax[i]!;
    const ry = cy - ay[i]!;
    let along = (rx * ex + ry * ey) * invLenSq[i]!;
    if (along < 0) along = 0;
    else if (along > 1) along = 1;
    const px = ax[i]! + ex * along;
    const py = ay[i]! + ey * along;
    const ox = cx - px;
    const oy = cy - py;
    const distSq = ox * ox + oy * oy;
    if (distSq >= bestDistSq) continue;
    bestDistSq = distSq;
    bestPx = px;
    bestPy = py;
    bestNx = nx[i]!;
    bestNy = ny[i]!;
  }

  const touchLimit = SHIP_R - 0.01;
  if (bestDistSq >= touchLimit * touchLimit) {
    const withinBox =
      cx >= prep.minX &&
      cx <= prep.maxX &&
      cy >= prep.minY &&
      cy <= prep.maxY;
    if (!withinBox || !insideMass({ x: cx, y: cy }, prep)) {
      return { body, hit: false, into: 0, resolved: false };
    }
  }

  const x = bestPx + bestNx * SHIP_R;
  const y = bestPy + bestNy * SHIP_R;
  // Speed into the rock (positive = driving into the wall).
  const into = Math.max(0, -(body.vx * bestNx + body.vy * bestNy));
  // Kill inward velocity; keep tangential slide.
  const vn = body.vx * bestNx + body.vy * bestNy;
  let vx = body.vx;
  let vy = body.vy;
  if (vn < 0) {
    vx -= vn * bestNx;
    vy -= vn * bestNy;
  }
  // Clear resting if the rock shoved us; impact HP only on hard contact speed.
  return {
    body: { x, y, vx, vy, restingOn: null },
    hit: into >= MASS_HIT_SPEED,
    into,
    resolved: true,
  };
}

/**
 * Push the ship out of every rock mass for this region.
 * `hit` is true when an impact should cost hull (hard contact).
 * `into` is the strongest inward speed seen this resolve (for soft bumps).
 */
export function resolveMasses(
  body: Body,
  regionId: RegionId,
): { body: Body; hit: boolean; massId: string | null; into: number } {
  return resolvePreparedMasses(body, preparedList(logicalMasses(regionId)));
}

/**
 * Same push-out against masses the caller supplies (logical space, +y up).
 * The level editor's playtest uses this so authored rock never touches the
 * region registry.
 */
export function resolveMassesAgainst(
  body: Body,
  masses: readonly LogicalMass[],
): { body: Body; hit: boolean; massId: string | null; into: number } {
  return resolvePreparedMasses(body, preparedList(masses));
}

function resolvePreparedMasses(
  body: Body,
  prepared: readonly PreparedMass[],
): { body: Body; hit: boolean; massId: string | null; into: number } {
  let current = body;
  let hit = false;
  let massId: string | null = null;
  let bestInto = 0;
  // A few passes so corners of overlapping masses settle.
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let i = 0; i < prepared.length; i++) {
      const mass = prepared[i]!;
      const result = resolveOne(current, mass);
      if (!result.resolved) continue;
      current = result.body;
      moved = true;
      if (result.into > bestInto) {
        bestInto = result.into;
        massId = mass.id;
      }
      if (result.hit) hit = true;
    }
    if (!moved) break;
  }
  return { body: current, hit, massId: hit ? massId : null, into: bestInto };
}

/** Test helper: view-space mass still available for drawing checks. */
export function massIdsFor(regionId: RegionId): readonly string[] {
  return massesFor(regionId).map((mass: Mass) => mass.id);
}

/**
 * One sim frame with solid rock. Flat ledge seats skip mass pushes.
 */
export function stepSolid(
  body: Body,
  ledges: readonly Ledge[],
  dt: number,
  regionId: RegionId,
  gravity = GRAVITY,
  policy: StepPolicy = { breakSpeed: BREAK_SPEED, catchBands: false },
): { body: Body; landedId: string | null; massHit: boolean } {
  const result = step(body, ledges, dt, gravity, policy);
  const seat = ledgeById(ledges, result.body.restingOn);
  if (result.body.restingOn && !isSlopedStep(seat)) {
    return { body: result.body, landedId: result.landedId, massHit: false };
  }
  const solid = resolveMasses(result.body, regionId);
  return {
    body: solid.body,
    landedId: result.landedId,
    massHit: solid.hit,
  };
}

/**
 * Side-effect-free fractional sub-step (`0 < dt < FIXED_DT`) matching live
 * `tickSim` (ledges + rock + sealed openings) so slow-mo Anachrometer renders
 * smoothly at display rate without mutating authoritative fixed-step state.
 */
export function previewSubstepSolid(
  body: Body,
  ledges: readonly Ledge[],
  dt: number,
  regionId: RegionId,
  openings: readonly FrameOpening[] = [],
  policy: StepPolicy = { breakSpeed: BREAK_SPEED, catchBands: false },
): Body {
  if (dt <= 1e-6) return body;
  const result = step(body, ledges, Math.min(dt, FIXED_DT), GRAVITY, policy);
  let next = result.body;
  const seat = ledgeById(ledges, next.restingOn);
  if (!next.restingOn || isSlopedStep(seat)) {
    next = resolveMasses(next, regionId).body;
    if (openings.length > 0) {
      next = containAgainstOpenings(next, openings).body;
    }
  }
  return next;
}

/** Shot preview that respects solid rock and optional sealed level borders. */
export function chartShotSolid(
  regionId: RegionId,
  body: Body,
  aim: Aim,
  inset = 0,
  mode: AimMode = regionId === "launch" ? "vertical" : "free",
  openings?: readonly FrameOpening[],
): {
  points: { x: number; y: number }[];
  apex: { x: number; y: number } | null;
  landedOn: string | null;
} {
  const home = body.restingOn ?? "";
  const velocity = launchVelocity(regionId, home, aim, inset, mode);
  let current: Body = { ...body, ...velocity, restingOn: null };
  const ledges = ledgesFor(regionId);
  const prepared = preparedList(logicalMasses(regionId));
  const hasOpenings = Boolean(openings && openings.length > 0);
  const policy: StepPolicy = { breakSpeed: BREAK_SPEED, catchBands: true };
  const points = [{ x: body.x, y: body.y }];
  let apex: { x: number; y: number } | null = { x: current.x, y: current.y };
  let landedOn: string | null = null;
  let stillFrames = 0;

  for (let frame = 0; frame < CHART_SOLID_FRAMES && !landedOn; frame++) {
    const prevX = current.x;
    const prevY = current.y;
    const result = step(current, ledges, FIXED_DT, GRAVITY, policy);
    let next = result.body;
    const seat = ledgeById(ledges, next.restingOn);
    if (!next.restingOn || isSlopedStep(seat)) {
      next = resolvePreparedMasses(next, prepared).body;
      if (hasOpenings && openings) {
        next = containAgainstOpenings(next, openings).body;
      }
    }
    current = next;

    if (frame % 2 === 0) points.push({ x: current.x, y: current.y });
    if (!apex || current.y >= apex.y) apex = { x: current.x, y: current.y };

    if (hasOpenings && openings) {
      let exited = false;
      for (let i = 0; i < openings.length; i++) {
        const op = openings[i]!;
        if (leftFrameThroughOpening(op, current) || touchedOpening(op, current)) {
          exited = true;
          break;
        }
      }
      if (exited) {
        points.push({ x: current.x, y: current.y });
        break;
      }
    }

    if (
      current.y < -240 ||
      current.y > WORLD_H + 240 ||
      current.x < -120 ||
      current.x > WORLD_W + 120
    ) {
      break;
    }

    const moveDx = current.x - prevX;
    const moveDy = current.y - prevY;
    if (!current.restingOn && moveDx * moveDx + moveDy * moveDy < CHART_STALL_STEP_SQ) {
      stillFrames += 1;
      if (stillFrames >= CHART_STALL_LIMIT) {
        points.push({ x: current.x, y: current.y });
        break;
      }
    } else {
      stillFrames = 0;
    }

    if (isSlopedStep(seat)) continue;
    if (!result.landedId) continue;
    points.push({ x: current.x, y: current.y });
    if (!current.restingOn) continue;
    landedOn = result.landedId;
  }

  return { points, apex, landedOn };
}

/**
 * The highest rock surface directly below (x, y), in logical space, or null
 * over open sky. Used to plant an exit band under a Borealis.
 */
export function surfaceBelow(
  masses: readonly LogicalMass[],
  x: number,
  y: number,
): number | null {
  let best: number | null = null;
  for (const mass of masses) {
    const ring = mass.outline;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      if (a.x === b.x) continue;
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      if (x < lo || x > hi) continue;
      const surface = a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
      if (surface > y) continue;
      if (best === null || surface > best) best = surface;
    }
  }
  return best;
}

/** Logical rock for a registered region (cached). */
export function logicalMassesFor(regionId: RegionId): readonly LogicalMass[] {
  return logicalMasses(regionId);
}
