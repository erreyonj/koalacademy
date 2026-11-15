/**
 * Notehead sim. Logical space is portrait 900×1600, origin bottom-left, +y up.
 * Stair and notch ledges are the old 200×360 y-down layout mapped into this space.
 */

export const WORLD_W = 900;
export const WORLD_H = 1600;
export const FIXED_DT = 1 / 60;

const SVG_W = 200;
const SVG_H = 360;
const SX = WORLD_W / SVG_W;
const SY = WORLD_H / SVG_H;

export const SHIP_R = 7 * SY;
export const GRAVITY = 700 * SY;
const LAND_EPS = 0.75 * SY;

export type PitchName =
  `${"A" | "B" | "C" | "D" | "E" | "F" | "G"}${"" | "#" | "b"}${number}`;

export type DifficultyId = "easy" | "medium" | "hard";
export type RegionId = "launch" | "stairs" | "notch";
export type LedgeKind = "band" | "step" | "block";

export interface Scale {
  id: string;
  pitches: readonly PitchName[];
}

export interface DifficultyProfile {
  id: DifficultyId;
  apexWindowDegrees: number;
  stairClear: "top-three" | "all";
  notchClear: "pocket-or-block" | "block";
  splitSkills: boolean;
  /** Radians shaved off each side of the aim cone. */
  aimInset: number;
}

/** Power is 0..1. Angle is radians from straight up. Positive aims to +x. */
export interface Aim {
  power: number;
  angle: number;
}

export interface AimCone {
  min: number;
  max: number;
}

export interface Region {
  id: RegionId;
  label: string;
  scaleId: string;
  goalPitch: PitchName;
}

export interface Ledge {
  id: string;
  x0: number;
  x1: number;
  /** Top surface, +y up. */
  y: number;
  pitch: PitchName;
  kind: LedgeKind;
}

export interface Body {
  x: number;
  y: number;
  vx: number;
  /** +y is up. */
  vy: number;
  restingOn: string | null;
}

export interface ShotSample {
  t: number;
  body: Body;
  /** Pitches whose heights were crossed while rising, in order. */
  crossedUp: PitchName[];
  apexPitch: PitchName | null;
}

export interface ShotResult {
  regionId: RegionId;
  apexPitch: PitchName | null;
  landedOn: string | null;
  visited: readonly string[];
  pitchOk: boolean;
  landingOk: boolean;
  cleared: boolean;
}

export interface ShipRepair {
  anachrometer: boolean;
  tails: readonly string[];
}

export interface NoteheadWorldState {
  regionId: RegionId;
  repair: ShipRepair;
}

export const C_MAJOR: Scale = {
  id: "c-major",
  pitches: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
};

export const PROFILES: Record<DifficultyId, DifficultyProfile> = {
  easy: {
    id: "easy",
    apexWindowDegrees: 1,
    stairClear: "top-three",
    notchClear: "pocket-or-block",
    splitSkills: false,
    aimInset: 0,
  },
  medium: {
    id: "medium",
    apexWindowDegrees: 0,
    stairClear: "all",
    notchClear: "block",
    splitSkills: false,
    aimInset: 0.08,
  },
  hard: {
    id: "hard",
    apexWindowDegrees: 0,
    stairClear: "all",
    notchClear: "block",
    splitSkills: true,
    aimInset: 0.22,
  },
};

/** Drag this far in logical pixels for a full-power shot. */
export const PULL_REACH = 380;
/** Speed at power 1 for an aimed shot. */
export const AIM_SPEED = 2800;

export const REGIONS: readonly Region[] = [
  { id: "launch", label: "Launch", scaleId: C_MAJOR.id, goalPitch: "G4" },
  { id: "stairs", label: "Stairs", scaleId: C_MAJOR.id, goalPitch: "G4" },
  { id: "notch", label: "Notch", scaleId: C_MAJOR.id, goalPitch: "A4" },
];

export const LAUNCH_BAND: Ledge = {
  id: "launch-band",
  x0: 180,
  x1: 720,
  y: 220,
  pitch: "C4",
  kind: "band",
};

/** Body-height of scale degree i above the launch band. */
export const LAUNCH_SPACING = 140;
const LAUNCH_RISE_MAX = LAUNCH_SPACING * 8.8;

function fromSvg(partial: {
  id: string;
  x0: number;
  x1: number;
  y: number;
  pitch: PitchName;
  kind: LedgeKind;
}): Ledge {
  return {
    id: partial.id,
    x0: partial.x0 * SX,
    x1: partial.x1 * SX,
    y: (SVG_H - partial.y) * SY,
    pitch: partial.pitch,
    kind: partial.kind,
  };
}

export const STAIR_TREADS: readonly Ledge[] = [
  fromSvg({ id: "s1", x0: 86, x1: 200, y: 300, pitch: "C4", kind: "step" }),
  fromSvg({ id: "s2", x0: 110, x1: 200, y: 254, pitch: "D4", kind: "step" }),
  fromSvg({ id: "s3", x0: 132, x1: 200, y: 208, pitch: "E4", kind: "step" }),
  fromSvg({ id: "s4", x0: 152, x1: 200, y: 162, pitch: "F4", kind: "step" }),
  fromSvg({ id: "s5", x0: 170, x1: 200, y: 116, pitch: "G4", kind: "step" }),
];

export const STAIR_BAND: Ledge = fromSvg({
  id: "band",
  x0: 14,
  x1: 72,
  y: 300,
  pitch: "C4",
  kind: "band",
});

export const NOTCH_POCKET: Ledge = fromSvg({
  id: "pocket",
  x0: 72,
  x1: 106,
  y: 156,
  pitch: "E4",
  kind: "band",
});

export const NOTCH_BLOCK: Ledge = fromSvg({
  id: "block",
  x0: 164,
  x1: 190,
  y: 78,
  pitch: "A4",
  kind: "block",
});

export const NOTCH_FLOOR: Ledge = fromSvg({
  id: "floor",
  x0: 148,
  x1: 196,
  y: 292,
  pitch: "C4",
  kind: "band",
});

export const LAUNCH_LEDGES: readonly Ledge[] = [LAUNCH_BAND];
export const STAIR_LEDGES: readonly Ledge[] = [STAIR_BAND, ...STAIR_TREADS];
export const NOTCH_LEDGES: readonly Ledge[] = [
  NOTCH_POCKET,
  NOTCH_BLOCK,
  NOTCH_FLOOR,
];

const TOP_THREE = ["s3", "s4", "s5"] as const;

export function createWorld(): NoteheadWorldState {
  return {
    regionId: "launch",
    repair: { anachrometer: false, tails: [] },
  };
}

export function regionById(id: RegionId): Region {
  const region = REGIONS.find((entry) => entry.id === id);
  if (!region) throw new Error(`Unknown region ${id}`);
  return region;
}

export function ledgesFor(id: RegionId): readonly Ledge[] {
  if (id === "launch") return LAUNCH_LEDGES;
  if (id === "stairs") return STAIR_LEDGES;
  return NOTCH_LEDGES;
}

export function ledgeById(
  ledges: readonly Ledge[],
  id: string | null,
): Ledge | null {
  if (!id) return null;
  return ledges.find((ledge) => ledge.id === id) ?? null;
}

export function restOn(ledge: Ledge, x?: number): Body {
  const mid = (ledge.x0 + ledge.x1) / 2;
  return {
    x: x ?? mid,
    y: ledge.y + SHIP_R,
    vx: 0,
    vy: 0,
    restingOn: ledge.id,
  };
}

export function restBody(regionId: RegionId): Body {
  if (regionId === "launch") return restOn(LAUNCH_BAND);
  if (regionId === "stairs") return restOn(STAIR_BAND);
  return restOn(NOTCH_FLOOR);
}

/** Next stair tread strictly below `id`. */
export function lowerTread(id: string): Ledge | null {
  const current = ledgeById(STAIR_TREADS, id);
  if (!current) return null;
  const below = STAIR_TREADS.filter((ledge) => ledge.y < current.y - 1);
  below.sort((a, b) => b.y - a.y);
  return below[0] ?? null;
}

export function dropOnto(from: Ledge, target: Ledge, currentX: number): Body {
  let x = currentX - 16 * SX;
  if (x >= from.x0) x = from.x0 - 8 * SX;
  if (x < target.x0 + 4 * SX) x = target.x0 + 6 * SX;
  if (x > target.x1 - 4 * SX) x = target.x1 - 6 * SX;
  return {
    x,
    y: target.y + SHIP_R + 22 * SY,
    vx: 0,
    vy: -30 * SY,
    restingOn: null,
  };
}

/** Legal aim. Launch is straight up, so it has no cone. */
export function aimCone(regionId: RegionId, restingId: string): AimCone | null {
  if (regionId === "launch") return null;
  if (regionId === "stairs") return { min: -0.35, max: 1.05 };
  if (restingId === "pocket") return { min: -0.25, max: 1.15 };
  if (restingId === "block") return { min: -1.0, max: 0.45 };
  return { min: -1.15, max: 0.55 };
}

export function clampAim(
  aim: Aim,
  regionId: RegionId,
  restingId: string,
  inset = 0,
): Aim {
  const power = Math.max(0, Math.min(1, aim.power));
  const cone = aimCone(regionId, restingId);
  if (!cone) return { power, angle: 0 };
  const min = cone.min + inset;
  const max = cone.max - inset;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return {
    power,
    angle: Math.max(lo, Math.min(hi, aim.angle)),
  };
}

/**
 * `pullX`/`pullY` are the drag in logical space (+y up).
 * The shot flies opposite that drag. Launch ignores sideways drag.
 */
export function aimFromPull(
  regionId: RegionId,
  restingId: string,
  pullX: number,
  pullY: number,
  inset = 0,
): Aim {
  if (regionId === "launch") {
    const down = Math.max(0, -pullY);
    return { power: Math.min(1, down / PULL_REACH), angle: 0 };
  }
  const power = Math.min(1, Math.hypot(pullX, pullY) / PULL_REACH);
  const angle = Math.atan2(-pullX, -pullY);
  return clampAim({ power, angle }, regionId, restingId, inset);
}

export function launchVelocity(
  regionId: RegionId,
  restingId: string,
  aim: Aim,
  inset = 0,
): { vx: number; vy: number } {
  const clamped = clampAim(aim, regionId, restingId, inset);
  if (regionId === "launch") {
    return {
      vx: 0,
      vy: Math.sqrt(2 * GRAVITY * LAUNCH_RISE_MAX) * clamped.power,
    };
  }
  const speed = AIM_SPEED * clamped.power;
  return {
    vx: Math.sin(clamped.angle) * speed,
    vy: Math.cos(clamped.angle) * speed,
  };
}

/** Pull that puts the launch apex on scale degree `index` (0 = C4). */
export function pullForLaunchDegree(index: number): number {
  const degreeY = LAUNCH_BAND.y + (index + 1) * LAUNCH_SPACING;
  const rise = degreeY - (LAUNCH_BAND.y + SHIP_R);
  return Math.sqrt(Math.max(0, rise) / LAUNCH_RISE_MAX);
}

export function pitchIndex(pitch: PitchName | null): number {
  if (!pitch) return -1;
  return C_MAJOR.pitches.indexOf(pitch);
}

export function pitchAtHeight(y: number): PitchName | null {
  const index = Math.round((y - LAUNCH_BAND.y) / LAUNCH_SPACING) - 1;
  if (index < 0) return null;
  return C_MAJOR.pitches[Math.min(C_MAJOR.pitches.length - 1, index)] ?? null;
}

function degreeMarks(): { pitch: PitchName; y: number }[] {
  return C_MAJOR.pitches.map((pitch, index) => ({
    pitch,
    y: LAUNCH_BAND.y + (index + 1) * LAUNCH_SPACING,
  }));
}

/**
 * One flight frame. Lands only while falling. The highest crossed ledge wins.
 */
export function step(
  body: Body,
  ledges: readonly Ledge[],
  dt: number,
  gravity = GRAVITY,
): { body: Body; landedId: string | null } {
  if (body.restingOn || dt <= 0) return { body, landedId: null };

  const frame = Math.min(dt, FIXED_DT);
  const vy = body.vy - gravity * frame;
  const nextX = body.x + body.vx * frame;
  const nextY = body.y + vy * frame;

  if (vy < 0) {
    const prevBottom = body.y - SHIP_R;
    const nextBottom = nextY - SHIP_R;
    let hit: Ledge | null = null;
    for (const ledge of ledges) {
      const withinX = nextX >= ledge.x0 && nextX <= ledge.x1;
      const crossed = prevBottom >= ledge.y - LAND_EPS && nextBottom <= ledge.y;
      if (!withinX || !crossed) continue;
      if (!hit || ledge.y > hit.y) hit = ledge;
    }
    if (hit) {
      return {
        body: {
          x: nextX,
          y: hit.y + SHIP_R,
          vx: 0,
          vy: 0,
          restingOn: hit.id,
        },
        landedId: hit.id,
      };
    }
  }

  return {
    body: { x: nextX, y: nextY, vx: body.vx, vy, restingOn: null },
    landedId: null,
  };
}

export function afterLanding(
  regionId: RegionId,
  body: Body,
  landedId: string,
): Body | null {
  if (regionId !== "stairs" || !landedId.startsWith("s")) return null;
  const from = ledgeById(STAIR_TREADS, landedId);
  const next = lowerTread(landedId);
  if (!from || !next) return null;
  return dropOnto(from, next, body.x);
}

function outOfBounds(body: Body): boolean {
  return body.y < -240 || body.y > WORLD_H + 240 || body.x < -120 || body.x > WORLD_W + 120;
}

export function resolveShot(
  region: Region,
  profile: DifficultyProfile,
  partial: {
    apexPitch: PitchName | null;
    landedOn: string | null;
    visited: readonly string[];
  },
): ShotResult {
  const goal = pitchIndex(region.goalPitch);
  const apex = pitchIndex(partial.apexPitch);

  if (region.id === "launch") {
    const pitchOk =
      apex >= 0 && Math.abs(apex - goal) <= profile.apexWindowDegrees;
    const landingOk = partial.landedOn === LAUNCH_BAND.id;
    return {
      regionId: region.id,
      apexPitch: partial.apexPitch,
      landedOn: partial.landedOn,
      visited: partial.visited,
      pitchOk,
      landingOk,
      cleared: pitchOk && landingOk,
    };
  }

  if (region.id === "stairs") {
    const required =
      profile.stairClear === "all"
        ? STAIR_TREADS.map((ledge) => ledge.id)
        : [...TOP_THREE];
    const pitchOk = required.every((id) => partial.visited.includes(id));
    const landingOk = partial.visited.some((id) => id.startsWith("s"));
    return {
      regionId: region.id,
      apexPitch: partial.apexPitch,
      landedOn: partial.landedOn,
      visited: partial.visited,
      pitchOk,
      landingOk,
      cleared: pitchOk && landingOk,
    };
  }

  const onBlock = partial.landedOn === "block";
  const onPocket = partial.landedOn === "pocket";
  const cleared =
    profile.notchClear === "block" ? onBlock : onBlock || onPocket;
  return {
    regionId: region.id,
    apexPitch: partial.apexPitch,
    landedOn: partial.landedOn,
    visited: partial.visited,
    pitchOk: cleared,
    landingOk: partial.landedOn !== null,
    cleared,
  };
}

/** Fly a pull to rest. Stairs keep stepping down after the first tread. */
export function flyShot(
  regionId: RegionId,
  profile: DifficultyProfile,
  aim: Aim | number,
  restingId?: string,
): ShotResult & { crossedUp: readonly PitchName[] } {
  const region = regionById(regionId);
  const ledges = ledgesFor(regionId);
  let body = restBody(regionId);
  const home = body.restingOn ?? restingId ?? "";
  const shot: Aim = typeof aim === "number" ? { power: aim, angle: 0 } : aim;
  const velocity = launchVelocity(
    regionId,
    restingId ?? home,
    shot,
    profile.aimInset,
  );
  body = { ...body, ...velocity, restingOn: null };

  const crossed: PitchName[] = [];
  const visited: string[] = [];
  let apexY = body.y;
  let landedOn: string | null = null;
  const marks = degreeMarks();

  for (let frame = 0; frame < 1500 && !landedOn; frame++) {
    const rising = body.vy > 0;
    const prevY = body.y;
    const result = step(body, ledges, FIXED_DT);
    body = result.body;
    if (body.y > apexY) apexY = body.y;
    if (rising) {
      for (const mark of marks) {
        if (prevY < mark.y && body.y >= mark.y && !crossed.includes(mark.pitch)) {
          crossed.push(mark.pitch);
        }
      }
    }
    if (outOfBounds(body)) break;
    if (!result.landedId) continue;
    visited.push(result.landedId);
    const follow = afterLanding(regionId, body, result.landedId);
    if (follow) {
      body = follow;
      continue;
    }
    landedOn = result.landedId;
  }

  const resolved = resolveShot(region, profile, {
    apexPitch: pitchAtHeight(apexY),
    landedOn,
    visited,
  });
  return { ...resolved, crossedUp: crossed };
}

export interface ShotChart {
  points: { x: number; y: number }[];
  apex: { x: number; y: number } | null;
  landedOn: string | null;
}

/**
 * The flight `launchVelocity` would produce from `body`, including stair
 * drop-downs. The preview draws this. It does not change the live shot.
 */
export function chartShot(
  regionId: RegionId,
  body: Body,
  aim: Aim,
  inset = 0,
): ShotChart {
  const home = body.restingOn ?? "";
  const velocity = launchVelocity(regionId, home, aim, inset);
  let current: Body = { ...body, ...velocity, restingOn: null };
  const ledges = ledgesFor(regionId);
  const points = [{ x: body.x, y: body.y }];
  let apex: { x: number; y: number } | null = { x: current.x, y: current.y };
  let landedOn: string | null = null;

  for (let frame = 0; frame < 1500 && !landedOn; frame++) {
    const result = step(current, ledges, FIXED_DT);
    current = result.body;
    if (frame % 2 === 0) points.push({ x: current.x, y: current.y });
    if (!apex || current.y >= apex.y) apex = { x: current.x, y: current.y };
    if (outOfBounds(current)) break;
    if (!result.landedId) continue;
    points.push({ x: current.x, y: current.y });
    const follow = afterLanding(regionId, current, result.landedId);
    if (follow) {
      current = follow;
      points.push({ x: current.x, y: current.y });
      continue;
    }
    landedOn = result.landedId;
  }

  return { points, apex, landedOn };
}

export function toSvg(x: number, y: number): { x: number; y: number } {
  return { x: x / SX, y: SVG_H - y / SY };
}

export const SVG_VIEW = { w: SVG_W, h: SVG_H };
