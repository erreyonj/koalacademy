/**
 * Notehead sim. Logical space is portrait 900×1600, origin bottom-left, +y up.
 * Portrait regions use 200×360 y-down art; zig uses landscape 360×200 art,
 * both mapped into the same logical world.
 */

export const WORLD_W = 900;
export const WORLD_H = 1600;
export const FIXED_DT = 1 / 60;

export interface SvgViewSize {
  w: number;
  h: number;
}

/** Portrait art frame shared by launch, stairs, and notch. */
export const PORTRAIT_VIEW: SvgViewSize = { w: 200, h: 360 };
/**
 * Zig content frame (ledge / terrain authoring, same 1.8 ratio as the mocks).
 * The on-screen camera zooms out via {@link ZIG_CAMERA} — see {@link zigCameraFrame}.
 */
export const LANDSCAPE_VIEW: SvgViewSize = { w: 360, h: 200 };
/** Zig render scale. Below 1 zooms out (more sky around the level). */
export const ZIG_CAMERA = 0.88;

/** Outer SVG view + content origin for zig's zoomed-out camera. */
export function zigCameraFrame(): {
  content: SvgViewSize;
  view: SvgViewSize;
  ox: number;
  oy: number;
} {
  const content = LANDSCAPE_VIEW;
  const view = { w: content.w / ZIG_CAMERA, h: content.h / ZIG_CAMERA };
  return {
    content,
    view,
    ox: (view.w - content.w) / 2,
    oy: (view.h - content.h) / 2,
  };
}

const SVG_W = PORTRAIT_VIEW.w;
const SVG_H = PORTRAIT_VIEW.h;
const SX = WORLD_W / SVG_W;
const SY = WORLD_H / SVG_H;

function scalesFor(view: SvgViewSize): { sx: number; sy: number } {
  return { sx: WORLD_W / view.w, sy: WORLD_H / view.h };
}

export const SHIP_R = 7 * SY;
export const GRAVITY = 700 * SY;
const LAND_EPS = 0.75 * SY;
/**
 * Fall faster than this and bands no longer catch (logical |vy|).
 * Tuned so a return from the launch guide breaks through, while a short hop still seats.
 */
export const BREAK_SPEED = 380 * SY;
/**
 * Fall speed into a step/block that costs hull.
 * ≈ freefall from ~6 ship radii (~3 diameters). Short hops onto adjacent
 * treads stay free; long drops still sting.
 */
export const LANDING_HIT_SPEED = 240 * SY;
/**
 * Speed into a rock face / sealed exit wall that costs hull.
 * Matches {@link LANDING_HIT_SPEED} so a short hop (aim power ≲ 0.35) into a
 * wall stays free, while committed slams still tax HP. Softer contacts still
 * resolve and can play the soft-landing cue via {@link MASS_BUMP_SPEED}.
 */
export const MASS_HIT_SPEED = LANDING_HIT_SPEED;
/**
 * Inward speed that counts as an audible wall bump (no HP). Below this the
 * resolve may still push the ship out of rock without a soft-landing cue.
 */
export const MASS_BUMP_SPEED = 25 * SY;
/** Gentle −x kick when seating on a sloping tread. */
export const SLIDE_SPEED = 80 * SX;
/** Extra −x acceleration while seated on a sloping tread. */
export const SLIDE_ACCEL = 200 * SX;
/** Tread slope: higher toward +x (wall), slides toward open sky (−x). */
export const STAIR_SLOPE = 0.32;
/** Soft spring that docks the ship to a Frequency Band's center. */
export const DOCK_STIFF = 14;
/** Velocity damping while docking on a band. */
export const DOCK_DAMP = 7;
/** Settle threshold (logical px / speed). */
export const DOCK_EPS = 1.2;

export type PitchName =
  `${"A" | "B" | "C" | "D" | "E" | "F" | "G"}${"" | "#" | "b"}${number}`;

export type DifficultyId = "easy" | "medium" | "hard";
export type RegionId = "launch" | "stairs" | "notch" | "zig";

export function svgViewFor(regionId: RegionId): SvgViewSize {
  return regionId === "zig" ? LANDSCAPE_VIEW : PORTRAIT_VIEW;
}
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
  /** Hull hit points at full. */
  maxHp: number;
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
  /** Top surface at mid-x, +y up. */
  y: number;
  pitch: PitchName;
  kind: LedgeKind;
  /** Rise over run (+y up). Steps use a small slope so the ship slides off. */
  slope?: number;
}

/** Landing rules for one `step` call. */
export interface StepPolicy {
  /** Skip landing on bands while falling faster than this (logical |vy|). */
  breakSpeed: number;
  /** When true, bands can catch even above breakSpeed. */
  catchBands: boolean;
}

export const DEFAULT_STEP_POLICY: StepPolicy = {
  breakSpeed: BREAK_SPEED,
  catchBands: false,
};

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
    maxHp: 10,
  },
  medium: {
    id: "medium",
    apexWindowDegrees: 0,
    stairClear: "all",
    notchClear: "block",
    splitSkills: false,
    aimInset: 0.08,
    maxHp: 8,
  },
  hard: {
    id: "hard",
    apexWindowDegrees: 0,
    stairClear: "all",
    notchClear: "block",
    splitSkills: true,
    aimInset: 0.22,
    maxHp: 5,
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
  { id: "zig", label: "Zig", scaleId: C_MAJOR.id, goalPitch: "A4" },
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

function fromSvg(
  partial: {
    id: string;
    x0: number;
    x1: number;
    y: number;
    pitch: PitchName;
    kind: LedgeKind;
    slope?: number;
  },
  view: SvgViewSize = PORTRAIT_VIEW,
): Ledge {
  const { sx, sy } = scalesFor(view);
  return {
    id: partial.id,
    x0: partial.x0 * sx,
    x1: partial.x1 * sx,
    y: (view.h - partial.y) * sy,
    pitch: partial.pitch,
    kind: partial.kind,
    slope: partial.slope,
  };
}

/**
 * Three long treads tucked into the lower-right stair cave.
 * Open faces stay wide; slope tips down toward open sky (−x).
 */
export const STAIR_TREADS: readonly Ledge[] = [
  fromSvg({
    id: "s1",
    x0: 96,
    x1: 200,
    y: 318,
    pitch: "C4",
    kind: "step",
    slope: STAIR_SLOPE,
  }),
  fromSvg({
    id: "s2",
    x0: 128,
    x1: 200,
    y: 248,
    pitch: "E4",
    kind: "step",
    slope: STAIR_SLOPE,
  }),
  fromSvg({
    id: "s3",
    x0: 156,
    x1: 200,
    y: 178,
    pitch: "G4",
    kind: "step",
    slope: STAIR_SLOPE,
  }),
];

/** Surface height of a ledge at logical x (+y up). */
export function ledgeYAt(ledge: Ledge, x: number): number {
  const mid = (ledge.x0 + ledge.x1) / 2;
  return ledge.y + (ledge.slope ?? 0) * (x - mid);
}

export function isSlopedStep(ledge: Ledge | null | undefined): boolean {
  return Boolean(ledge && ledge.kind === "step" && (ledge.slope ?? 0) !== 0);
}

/**
 * Visible open span of a tread (excludes the part buried under higher steps).
 * Used for Borealis placement along the climb path.
 */
export function openTreadSpan(tread: Ledge): { x0: number; x1: number } {
  const next = [...STAIR_TREADS]
    .sort((a, b) => a.y - b.y)
    .find((entry) => entry.y > tread.y);
  return { x0: tread.x0, x1: next ? next.x0 : tread.x1 };
}

/** Approach Frequency Band — left of the lowest tread, slightly below its open lip. */
export const STAIR_BAND: Ledge = fromSvg({
  id: "band",
  x0: 18,
  x1: 78,
  y: 336,
  pitch: "C4",
  kind: "band",
});

/** Classic notch: left pocket, high right block, floor band on the lower slope. */
export const NOTCH_POCKET: Ledge = fromSvg({
  id: "pocket",
  // Seat sits further into the shaft so straight-up / up-right charts clear the wall.
  x0: 78,
  x1: 118,
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

/**
 * Invisible teach height on notch-calibrate (pocket altitude). Crossing it
 * rising fires the Anachrometer GI. Not drawn — no on-screen guide line.
 */
export const ANACH_TEACH_Y = NOTCH_POCKET.y;

/**
 * Zig landscape: bottom peak → left shelf → right wedge (Borealis zig-zag).
 * Coords are landscape 360×200 view space. Shelves are spread ~2× farther
 * apart than the first mock so the climb reads across the wide frame.
 */
export const ZIG_PEAK: Ledge = fromSvg(
  {
    id: "zig-peak",
    x0: 128,
    x1: 232,
    y: 178,
    pitch: "C4",
    kind: "band",
  },
  LANDSCAPE_VIEW,
);

export const ZIG_LEFT: Ledge = fromSvg(
  {
    id: "zig-left",
    x0: 48,
    x1: 132,
    y: 102,
    pitch: "E4",
    kind: "band",
  },
  LANDSCAPE_VIEW,
);

/** Right wedge tip — slopes down toward the shaft (−x). */
export const ZIG_RIGHT: Ledge = fromSvg(
  {
    id: "zig-right",
    x0: 228,
    x1: 318,
    y: 48,
    pitch: "A4",
    kind: "step",
    slope: -0.28,
  },
  LANDSCAPE_VIEW,
);

export const LAUNCH_LEDGES: readonly Ledge[] = [LAUNCH_BAND];
export const STAIR_LEDGES: readonly Ledge[] = [STAIR_BAND, ...STAIR_TREADS];
export const NOTCH_LEDGES: readonly Ledge[] = [
  NOTCH_POCKET,
  NOTCH_BLOCK,
  NOTCH_FLOOR,
];
export const ZIG_LEDGES: readonly Ledge[] = [ZIG_PEAK, ZIG_LEFT, ZIG_RIGHT];

const TOP_THREE = ["s1", "s2", "s3"] as const;

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
  if (id === "zig") return ZIG_LEDGES;
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
  if (regionId === "zig") return restOn(ZIG_PEAK);
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
  if (regionId === "zig") {
    if (restingId === ZIG_PEAK.id) return { min: -1.15, max: 0.25 };
    if (restingId === ZIG_LEFT.id) return { min: -0.15, max: 1.25 };
    // From the right wedge, aim back up the shaft / toward exit.
    if (restingId === ZIG_RIGHT.id) return { min: -1.25, max: 0.2 };
    return { min: -1.0, max: 1.0 };
  }
  // Pocket mouth opens upward; allow near-vertical and out into the shaft.
  if (restingId === "pocket") return { min: -0.15, max: 1.2 };
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

function mayCatch(ledge: Ledge, fallSpeed: number, policy: StepPolicy): boolean {
  if (ledge.kind !== "band") return true;
  if (policy.catchBands) return true;
  return fallSpeed <= policy.breakSpeed;
}

/**
 * Soft magnetic dock: ease the ship to the band mid-x while seated.
 * Not used for Anachrometer warp bands (those track the ship mid-flight).
 */
export function dockOnBand(
  body: Body,
  ledge: Ledge,
  dt: number,
): Body {
  const frame = Math.min(dt, FIXED_DT);
  const mid = (ledge.x0 + ledge.x1) / 2;
  const dx = mid - body.x;
  if (Math.abs(dx) <= DOCK_EPS && Math.abs(body.vx) <= DOCK_EPS * 4) {
    return {
      x: mid,
      y: ledgeYAt(ledge, mid) + SHIP_R,
      vx: 0,
      vy: 0,
      restingOn: ledge.id,
    };
  }
  const ax = dx * DOCK_STIFF - body.vx * DOCK_DAMP;
  const vx = body.vx + ax * frame;
  const x = Math.max(ledge.x0, Math.min(ledge.x1, body.x + vx * frame));
  return {
    x,
    y: ledgeYAt(ledge, x) + SHIP_R,
    vx,
    vy: 0,
    restingOn: ledge.id,
  };
}

export function isDockableBand(ledge: Ledge | null | undefined): boolean {
  return Boolean(ledge && ledge.kind === "band" && ledge.id !== "warp-band");
}

/**
 * Slide along a sloping tread: stay seated, ease toward open sky, then drip
 * off the lip without a trampoline bounce. +x into the wall is killed.
 */
function slideOnStep(
  body: Body,
  ledge: Ledge,
  dt: number,
): { body: Body; landedId: string | null; impactSpeed: number } {
  const frame = Math.min(dt, FIXED_DT);
  const vx = Math.min(body.vx, 0) - SLIDE_ACCEL * frame;
  const nextX = body.x + vx * frame;
  if (nextX < ledge.x0 - 1 || nextX > ledge.x1 + 1) {
    const lipX = Math.max(ledge.x0, Math.min(ledge.x1, nextX));
    const surface = ledgeYAt(ledge, lipX);
    // Leave grounded: keep slide speed, fall under gravity — no upward hop.
    return {
      body: {
        x: nextX,
        y: surface + SHIP_R,
        vx: Math.min(vx, -SLIDE_SPEED),
        vy: 0,
        restingOn: null,
      },
      landedId: null,
      impactSpeed: 0,
    };
  }
  return {
    body: {
      x: nextX,
      y: ledgeYAt(ledge, nextX) + SHIP_R,
      vx,
      vy: 0,
      restingOn: ledge.id,
    },
    landedId: null,
    impactSpeed: 0,
  };
}

/**
 * One flight frame. Lands only while falling. The highest crossed ledge wins.
 * Sloped steps always seat, then slide off toward open sky.
 * `impactSpeed` is the fall speed at contact (0 when not landing).
 */
export function step(
  body: Body,
  ledges: readonly Ledge[],
  dt: number,
  gravity = GRAVITY,
  policy: StepPolicy = DEFAULT_STEP_POLICY,
): { body: Body; landedId: string | null; impactSpeed: number } {
  if (dt <= 0) return { body, landedId: null, impactSpeed: 0 };

  if (body.restingOn) {
    const seat = ledgeById(ledges, body.restingOn);
    if (!seat) return { body, landedId: null, impactSpeed: 0 };
    if (isSlopedStep(seat)) return slideOnStep(body, seat, dt);
    if (isDockableBand(seat)) {
      return {
        body: dockOnBand(body, seat, dt),
        landedId: null,
        impactSpeed: 0,
      };
    }
    return { body, landedId: null, impactSpeed: 0 };
  }

  const frame = Math.min(dt, FIXED_DT);
  const vy = body.vy - gravity * frame;
  const nextX = body.x + body.vx * frame;
  const nextY = body.y + vy * frame;
  const fallSpeed = Math.max(0, -vy);

  if (vy < 0) {
    const prevBottom = body.y - SHIP_R;
    const nextBottom = nextY - SHIP_R;
    let hit: Ledge | null = null;
    for (const ledge of ledges) {
      if (!mayCatch(ledge, fallSpeed, policy)) continue;
      const surface = ledgeYAt(ledge, nextX);
      const withinX = nextX >= ledge.x0 && nextX <= ledge.x1;
      const crossed =
        prevBottom >= surface - LAND_EPS && nextBottom <= surface;
      if (!withinX || !crossed) continue;
      const surfaceY = ledgeYAt(ledge, nextX);
      const hitY = hit ? ledgeYAt(hit, nextX) : -Infinity;
      // Prefer Frequency Bands when tied so exit/warp seats stay soft.
      if (
        !hit ||
        surfaceY > hitY + 1e-6 ||
        (Math.abs(surfaceY - hitY) <= 1e-6 &&
          ledge.kind === "band" &&
          hit.kind !== "band")
      ) {
        hit = ledge;
      }
    }
    if (hit) {
      const surface = ledgeYAt(hit, nextX);
      if (isSlopedStep(hit)) {
        // Always land. Kill fall energy; start a gentle slide toward open sky.
        return {
          body: {
            x: nextX,
            y: surface + SHIP_R,
            vx: Math.min(body.vx, 0) * 0.35 - SLIDE_SPEED,
            vy: 0,
            restingOn: hit.id,
          },
          landedId: hit.id,
          impactSpeed: fallSpeed,
        };
      }
      return {
        body: {
          x: nextX,
          y: surface + SHIP_R,
          // Keep a little horizontal speed so the center-dock eases in.
          vx: isDockableBand(hit) ? body.vx * 0.2 : 0,
          vy: 0,
          restingOn: hit.id,
        },
        landedId: hit.id,
        impactSpeed: fallSpeed,
      };
    }
  }

  return {
    body: { x: nextX, y: nextY, vx: body.vx, vy, restingOn: null },
    landedId: null,
    impactSpeed: 0,
  };
}

/**
 * Legacy auto drop-down between stair treads. Route stairs no longer use this;
 * sloping treads + Anachrometer hops replace it. Kept for older sandbox calls.
 */
export function afterLanding(
  regionId: RegionId,
  body: Body,
  landedId: string,
): Body | null {
  if (regionId !== "stairs" || !landedId.startsWith("s")) return null;
  const from = ledgeById(STAIR_TREADS, landedId);
  const hit = from;
  // Sloped route treads never chain-drop.
  if (hit?.slope) return null;
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

/**
 * Fly a pull until rest or out of bounds.
 * Defaults to catching bands so legacy apex / notch checks still land.
 * Route play passes a policy with `catchBands: false` for break-through.
 */
export function flyShot(
  regionId: RegionId,
  profile: DifficultyProfile,
  aim: Aim | number,
  restingId?: string,
  policy: StepPolicy = { breakSpeed: BREAK_SPEED, catchBands: true },
): ShotResult & { crossedUp: readonly PitchName[]; body: Body } {
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
    const result = step(body, ledges, FIXED_DT, GRAVITY, policy);
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
    if (result.landedId && !visited.includes(result.landedId)) {
      visited.push(result.landedId);
    }
    // Keep simulating while seated on a sloping tread (land → slide → bounce).
    if (isSlopedStep(ledgeById(ledges, body.restingOn))) continue;
    if (!result.landedId) continue;
    if (!body.restingOn) continue;
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
  return { ...resolved, crossedUp: crossed, body };
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
    const result = step(current, ledges, FIXED_DT, GRAVITY, {
      breakSpeed: BREAK_SPEED,
      catchBands: true,
    });
    current = result.body;
    if (frame % 2 === 0) points.push({ x: current.x, y: current.y });
    if (!apex || current.y >= apex.y) apex = { x: current.x, y: current.y };
    if (outOfBounds(current)) break;
    if (isSlopedStep(ledgeById(ledges, current.restingOn))) continue;
    if (!result.landedId) continue;
    points.push({ x: current.x, y: current.y });
    if (!current.restingOn) continue;
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

export function toSvg(
  x: number,
  y: number,
  regionId: RegionId = "launch",
): { x: number; y: number } {
  const view = svgViewFor(regionId);
  const { sx, sy } = scalesFor(view);
  return { x: x / sx, y: view.h - y / sy };
}

/** View-space point (+y down) → logical (+y up). */
export function fromSvgPoint(
  x: number,
  y: number,
  regionId: RegionId = "launch",
): { x: number; y: number } {
  const view = svgViewFor(regionId);
  const { sx, sy } = scalesFor(view);
  return { x: x * sx, y: (view.h - y) * sy };
}

/** @deprecated Prefer svgViewFor(regionId). Portrait default for older call sites. */
export const SVG_VIEW = PORTRAIT_VIEW;
