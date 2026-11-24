/**
 * Solid rock: keep the ship outside terrain masses so landings and hull hits
 * have something to bump into.
 */
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

interface LogicalMass {
  id: string;
  outline: Point[];
}

const logicalCache = new Map<RegionId, readonly LogicalMass[]>();

function logicalMasses(regionId: RegionId): readonly LogicalMass[] {
  let cached = logicalCache.get(regionId);
  if (cached) return cached;
  cached = massesFor(regionId).map((mass) => ({
    id: mass.id,
    outline: mass.outline.map((point) =>
      fromSvgPoint(point.x, point.y, regionId),
    ),
  }));
  logicalCache.set(regionId, cached);
  return cached;
}

function inside(point: Point, outline: readonly Point[]): boolean {
  return insideMass(point, { outline });
}

function nearestOnRing(
  point: Point,
  ring: readonly Point[],
): { point: Point; normal: Point; dist: number } {
  let best = {
    point: ring[0]!,
    normal: { x: 0, y: 1 },
    dist: Infinity,
  };
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
    const px = a.x + dx * along;
    const py = a.y + dy * along;
    const dist = Math.hypot(point.x - px, point.y - py);
    if (dist >= best.dist) continue;
    // Edge tangent → candidate normal (perpendicular).
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    const probe = { x: px + nx, y: py + ny };
    if (inside(probe, ring)) {
      nx = -nx;
      ny = -ny;
    }
    best = { point: { x: px, y: py }, normal: { x: nx, y: ny }, dist };
  }
  return best;
}

function resolveOne(
  body: Body,
  mass: LogicalMass,
): { body: Body; hit: boolean; into: number; resolved: boolean } {
  const center = { x: body.x, y: body.y };
  const buried = inside(center, mass.outline);
  const near = nearestOnRing(center, mass.outline);
  if (!buried && near.dist >= SHIP_R - 0.01) {
    return { body, hit: false, into: 0, resolved: false };
  }

  const n = near.normal;
  const x = near.point.x + n.x * SHIP_R;
  const y = near.point.y + n.y * SHIP_R;
  // Speed into the rock (positive = driving into the wall).
  const into = Math.max(0, -(body.vx * n.x + body.vy * n.y));
  // Kill inward velocity; keep tangential slide.
  const vn = body.vx * n.x + body.vy * n.y;
  let vx = body.vx;
  let vy = body.vy;
  if (vn < 0) {
    vx -= vn * n.x;
    vy -= vn * n.y;
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
  let current = body;
  let hit = false;
  let massId: string | null = null;
  let bestInto = 0;
  // A few passes so corners of overlapping masses settle.
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const mass of logicalMasses(regionId)) {
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

/** Shot preview that respects solid rock (used by the live chart). */
export function chartShotSolid(
  regionId: RegionId,
  body: Body,
  aim: Aim,
  inset = 0,
  mode: AimMode = regionId === "launch" ? "vertical" : "free",
): {
  points: { x: number; y: number }[];
  apex: { x: number; y: number } | null;
  landedOn: string | null;
} {
  const home = body.restingOn ?? "";
  const velocity = launchVelocity(regionId, home, aim, inset, mode);
  let current: Body = { ...body, ...velocity, restingOn: null };
  const ledges = ledgesFor(regionId);
  const points = [{ x: body.x, y: body.y }];
  let apex: { x: number; y: number } | null = { x: current.x, y: current.y };
  let landedOn: string | null = null;

  for (let frame = 0; frame < 1500 && !landedOn; frame++) {
    const result = stepSolid(current, ledges, FIXED_DT, regionId, GRAVITY, {
      breakSpeed: BREAK_SPEED,
      catchBands: true,
    });
    current = result.body;
    if (frame % 2 === 0) points.push({ x: current.x, y: current.y });
    if (!apex || current.y >= apex.y) apex = { x: current.x, y: current.y };
    if (
      current.y < -240 ||
      current.y > WORLD_H + 240 ||
      current.x < -120 ||
      current.x > WORLD_W + 120
    ) {
      break;
    }
    if (isSlopedStep(ledgeById(ledges, current.restingOn))) continue;
    if (!result.landedId) continue;
    points.push({ x: current.x, y: current.y });
    if (!current.restingOn) continue;
    landedOn = result.landedId;
  }

  return { points, apex, landedOn };
}
