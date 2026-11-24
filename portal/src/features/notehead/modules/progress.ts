/**
 * Region travel: Launch / Notch / Launch Bridge / Stairs / Zig / Tail.
 * Notch crash is a one-shot fall intro, not a free-standing level.
 */
import { engageWarp, WARP_BAND_ID } from "./anachrometer";
import {
  type FrameOpening,
  exitZoneFor,
  leftBottomOpening,
  leftFrameThroughOpening,
  leftOpening,
  openingFromExitZone,
  rightBottomOpening,
} from "./exit-zone";
import {
  type AimMode,
  type Body,
  type Ledge,
  type PitchName,
  type RegionId,
  type ShipRepair,
  BREAK_SPEED,
  DEFAULT_STEP_POLICY,
  FIXED_DT,
  LAUNCH_BAND,
  LAUNCH_SPACING,
  NOTCH_BLOCK,
  NOTCH_FLOOR,
  SHIP_R,
  STAIR_BAND,
  WORLD_H,
  WORLD_W,
  ZIG_PEAK,
  isSlopedStep,
  ledgeById,
  ledgesFor,
  pitchIndex,
  regionById,
  restOn,
  step,
  type StepPolicy,
} from "./sim";
import { resolveMasses } from "./collide";

export type BeatId =
  | "launch-teach"
  | "notch-crash"
  | "notch-calibrate"
  | "launch-bridge"
  | "stairs-anach"
  | "zig-1"
  | "launch-tail";

export interface BeatFlight {
  /** Highest y this flight. */
  apexY: number;
  /** Goal pitch height was crossed while rising. */
  crossedGoal: boolean;
  /** Fell through a band without landing (break-through). */
  brokeBand: boolean;
  /** Left the frame through the beat's exit opening this run. */
  crossedExit: boolean;
  visited: readonly string[];
  landedOn: string | null;
  /** Last resting ledge after the flight settled, if any. */
  restingOn: string | null;
  /** Pull power for the shot that started this flight, if any. */
  power?: number;
}

export interface BeatClear {
  cleared: boolean;
  repair: ShipRepair;
  hint: string;
}

export interface BeatDef {
  id: BeatId;
  label: string;
  regionId: RegionId;
  next: BeatId | null;
  hint: string;
  clearHint: string;
  /** Entry body when the beat starts. */
  enter: (repair: ShipRepair) => Body;
  /** Whether bands break through on hard falls this beat. */
  catchBands: (repair: ShipRepair) => boolean;
  evaluate: (flight: BeatFlight, repair: ShipRepair) => BeatClear;
}

/** Debug / sandbox order — includes the one-shot crash intro. */
export const BEAT_ORDER: readonly BeatId[] = [
  "launch-teach",
  "notch-crash",
  "notch-calibrate",
  "launch-bridge",
  "stairs-anach",
  "zig-1",
  "launch-tail",
];

/**
 * Player-facing regions (crash is folded into the first Launch → Notch trip).
 * Names stay even when terrain is shared (Launch / Tail).
 */
export const PLAYABLE_BEATS: readonly BeatId[] = [
  "launch-teach",
  "notch-calibrate",
  "launch-bridge",
  "stairs-anach",
  "zig-1",
  "launch-tail",
];

/** Persistent visit / intro flags for freer travel. */
export interface RouteMemory {
  /** Notch crash fall has played once. */
  crashSeen: boolean;
  /** Beats whose enter CM/GI already ran. */
  storySeen: readonly BeatId[];
}

export function emptyRouteMemory(): RouteMemory {
  return { crashSeen: false, storySeen: [] };
}

export function markStorySeen(memory: RouteMemory, id: BeatId): RouteMemory {
  if (memory.storySeen.includes(id)) return memory;
  return { ...memory, storySeen: [...memory.storySeen, id] };
}

export function markCrashSeen(memory: RouteMemory): RouteMemory {
  return { ...memory, crashSeen: true };
}

/**
 * Launch teach = vertical; Bridge / Tail / Borealis beats = free aim.
 * Tail shares launch terrain but aims freely so the lower return is reachable.
 */
export function aimModeForBeat(beatId: BeatId): AimMode {
  if (beatId === "launch-teach") return "vertical";
  return "free";
}

/**
 * Launch Bridge / Tail lower-left return exit (logical bottom-left origin, +y up).
 * Leave the frame through the left edge while still in the bottom 8% of the
 * world — effectively the lower-left corner gap from (0,0) → (0, 0.08·H).
 * Does not use “below the band” (that conflicts with the rise-from-below enter).
 */
export const BRIDGE_RETURN_Y_FRAC = 0.08;

export function bridgeReturnYMax(): number {
  return WORLD_H * BRIDGE_RETURN_Y_FRAC;
}

/** True when the ship has left the frame through the Bridge → Notch gap. */
export function leftThroughBridgeReturnExit(body: {
  x: number;
  y: number;
}): boolean {
  return leftFrameThroughOpening(leftBottomOpening(BRIDGE_RETURN_Y_FRAC), body);
}

/**
 * Entry poses:
 * - Rise = forward arrival continuing an upward exit shot.
 * - Fall = reverse arrival from a later region (drop in from above).
 * - Side = reverse through a lateral exit (Zig right → Stairs left-band).
 */

/** Falling re-entry into Notch (skip crash dialogue — already visited). */
export function notchReturnEnter(): Body {
  return {
    x: NOTCH_BLOCK.x0 - 20,
    y: WORLD_H - 80,
    vx: 80,
    vy: -320,
    restingOn: null,
  };
}

/** Rise onto the launch band (Notch → Bridge forward). */
export function bridgeRiseEnter(): Body {
  return {
    x: (LAUNCH_BAND.x0 + LAUNCH_BAND.x1) / 2,
    y: 48,
    vx: 0,
    vy: 1320,
    restingOn: null,
  };
}

/**
 * Stairs → Bridge reverse: fall from above onto the launch band.
 * Soft |vy| so Anachrometer can still seat (under BREAK_SPEED).
 */
export function bridgeFallEnter(): Body {
  return {
    x: (LAUNCH_BAND.x0 + LAUNCH_BAND.x1) / 2,
    y: WORLD_H - 60,
    vx: 0,
    vy: -360,
    restingOn: null,
  };
}

/** Rise onto the stairs approach band (Bridge → Stairs forward). */
export function stairsRiseEnter(): Body {
  const mid = (STAIR_BAND.x0 + STAIR_BAND.x1) / 2;
  return {
    x: mid - 30,
    y: 24,
    vx: 90,
    vy: 920,
    restingOn: null,
  };
}

/**
 * Zig lower-left → Stairs: fall from above onto the **right edge** of the
 * approach Frequency Band. Soft |vy| so Anachrometer can still seat.
 */
export function stairsFallEnter(): Body {
  return {
    x: STAIR_BAND.x1 - SHIP_R * 1.2,
    y: WORLD_H - 60,
    vx: -30,
    vy: -340,
    restingOn: null,
  };
}

/**
 * Zig lower-right warp → re-enter Zig: jump in from the left lower barrier
 * toward the peak Frequency Band (same-beat soft reentry).
 */
export function zigJumpFromLeftEnter(): Body {
  return {
    x: SHIP_R * 1.5,
    y: Math.max(SHIP_R * 2, WORLD_H * 0.06),
    vx: 320,
    vy: 980,
    restingOn: null,
  };
}

/** Rise onto the Zig peak (Stairs → Zig forward). */
export function zigRiseEnter(): Body {
  return {
    x: (ZIG_PEAK.x0 + ZIG_PEAK.x1) / 2,
    y: 60,
    vx: 40,
    vy: 1180,
    restingOn: null,
  };
}

/** Tail → Zig reverse: fall from above onto the peak band. */
export function zigFallEnter(): Body {
  return {
    x: (ZIG_PEAK.x0 + ZIG_PEAK.x1) / 2,
    y: WORLD_H - 50,
    vx: 0,
    vy: -360,
    restingOn: null,
  };
}

/** Stairs lower-right / warp path → Zig: same jump-in from the left lower barrier. */
export function zigWarpEnter(): Body {
  return zigJumpFromLeftEnter();
}

export type TravelMode = "forward" | "return" | "warp";

/** Bidirectional region travel: forward still goes through beat.evaluate. */
export interface TravelRoute {
  id: string;
  to: BeatId;
  mode: TravelMode;
  opening: FrameOpening;
  /** Bridge / Tail: arm only after seating on the launch band. */
  requireSeated?: boolean;
  /** Return / warp routes supply the destination enter body. */
  enterBody?: () => Body;
  /**
   * Same-beat reposition only (keep Borealis / tonation attempt).
   * Used by Zig’s lower-right warp loop.
   */
  softReentry?: boolean;
}

/** Stairs reverse: leave left near the approach band (lower ~40% of world). */
const STAIRS_RETURN_Y1 = WORLD_H * 0.4;
/**
 * Zig / Stairs corner gaps. Peak sits near y≈176 (~11% H); use 14% so the
 * lower-left / lower-right exits are reachable from the peak shelf.
 */
export const ZIG_CORNER_Y_FRAC = 0.14;

/**
 * Open travel routes for a beat (forward exits + reverse returns).
 * Frame seal uses every route's opening.
 */
export function travelRoutesFor(beatId: BeatId): TravelRoute[] {
  const forward = exitZoneFor(beatId);
  const routes: TravelRoute[] = [];

  if (beatId === "notch-calibrate" && forward) {
    routes.push({
      id: "notch-up",
      to: "launch-bridge",
      mode: "forward",
      opening: openingFromExitZone(forward),
    });
  }

  if (beatId === "launch-bridge" && forward) {
    routes.push({
      id: "bridge-up",
      to: "stairs-anach",
      mode: "forward",
      opening: openingFromExitZone(forward),
    });
    routes.push({
      id: "bridge-return-notch",
      to: "notch-calibrate",
      mode: "return",
      opening: leftBottomOpening(BRIDGE_RETURN_Y_FRAC),
      requireSeated: true,
      enterBody: notchReturnEnter,
    });
  }

  if (beatId === "stairs-anach" && forward) {
    routes.push({
      id: "stairs-right",
      to: "zig-1",
      mode: "forward",
      opening: openingFromExitZone(forward),
    });
    routes.push({
      id: "stairs-warp-zig",
      to: "zig-1",
      mode: "forward",
      opening: rightBottomOpening(ZIG_CORNER_Y_FRAC),
      enterBody: zigJumpFromLeftEnter,
    });
    routes.push({
      id: "stairs-return-bridge",
      to: "launch-bridge",
      mode: "return",
      opening: leftOpening(0, STAIRS_RETURN_Y1),
      enterBody: bridgeFallEnter,
    });
  }

  if (beatId === "zig-1" && forward) {
    routes.push({
      id: "zig-up",
      to: "launch-tail",
      mode: "forward",
      opening: openingFromExitZone(forward),
    });
    routes.push({
      id: "zig-return-stairs-left",
      to: "stairs-anach",
      mode: "return",
      opening: leftBottomOpening(ZIG_CORNER_Y_FRAC),
      enterBody: stairsFallEnter,
    });
    routes.push({
      id: "zig-warp-loop",
      to: "zig-1",
      mode: "warp",
      opening: rightBottomOpening(ZIG_CORNER_Y_FRAC),
      enterBody: zigJumpFromLeftEnter,
      softReentry: true,
    });
  }

  if (beatId === "launch-tail") {
    routes.push({
      id: "tail-return-zig",
      to: "zig-1",
      mode: "return",
      opening: leftBottomOpening(BRIDGE_RETURN_Y_FRAC),
      requireSeated: true,
      enterBody: zigFallEnter,
    });
  }

  return routes;
}

/** Frame openings that stay unsealed for the current beat. */
export function openingsForBeat(beatId: BeatId): FrameOpening[] {
  return travelRoutesFor(beatId).map((route) => route.opening);
}

/** Match an OOB body against a travel route opening (and seating gate). */
export function matchTravelRoute(
  beatId: BeatId,
  body: { x: number; y: number },
  seated: boolean,
): TravelRoute | null {
  for (const route of travelRoutesFor(beatId)) {
    if (route.requireSeated && !seated) continue;
    if (leftFrameThroughOpening(route.opening, body)) return route;
  }
  return null;
}

/**
 * Zig cliff feet can block true OOB. When the ship is pressed into a lower
 * corner opening (inside the frame), treat it as taking that exit.
 */
export function matchZigCornerIntent(body: {
  x: number;
  y: number;
  vx: number;
  vy: number;
}): TravelRoute | null {
  const yMax = WORLD_H * ZIG_CORNER_Y_FRAC;
  if (body.y < 0 || body.y > yMax) return null;
  const routes = travelRoutesFor("zig-1");
  // Pressed into / past the left seal in the lower-left pocket.
  if (body.x <= SHIP_R * 1.35 && body.vx <= 40) {
    return routes.find((r) => r.id === "zig-return-stairs-left") ?? null;
  }
  // Pressed into / past the right seal in the lower-right pocket.
  if (body.x >= WORLD_W - SHIP_R * 1.35 && body.vx >= -40) {
    return routes.find((r) => r.id === "zig-warp-loop") ?? null;
  }
  return null;
}

function goalHeight(regionId: RegionId): number {
  const region = regionById(regionId);
  const index = pitchIndex(region.goalPitch);
  if (regionId === "launch") {
    return LAUNCH_BAND.y + (Math.max(0, index) + 1) * LAUNCH_SPACING;
  }
  return LAUNCH_BAND.y + (Math.max(0, index) + 1) * LAUNCH_SPACING;
}

export function launchGoalY(): number {
  return goalHeight("launch");
}

/** Full-power bridge shot: at least this fraction of pull. */
export const BRIDGE_POWER = 0.92;

export const PROGRESSION: Record<BeatId, BeatDef> = {
  "launch-teach": {
    id: "launch-teach",
    label: "Launch",
    regionId: "launch",
    next: "notch-crash",
    hint: "Pull the Frequency Band. Reach the guide, then the fall will break through.",
    clearHint: "Through the band",
    enter: () => restOn(LAUNCH_BAND),
    // Live policy flips this after the guide (see stepPolicyFor).
    catchBands: () => false,
    evaluate: (flight, repair) => {
      const cleared = flight.crossedGoal && flight.brokeBand;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Through the band"
          : flight.crossedGoal
            ? "Fall through the band"
            : "Reach the guide on the way up",
      };
    },
  },
  "notch-crash": {
    id: "notch-crash",
    label: "Notch crash",
    regionId: "notch",
    next: "notch-calibrate",
    hint: "Falling in. Touch the high block, then the floor.",
    clearHint: "Anachrometer online",
    enter: () => ({
      // Drop from above toward the high right block.
      x: NOTCH_BLOCK.x0 - 20,
      y: WORLD_H - 80,
      vx: 220,
      vy: -260,
      restingOn: null,
    }),
    // Floor must catch after the block bounce; pocket is out of the entry path.
    catchBands: () => true,
    evaluate: (flight, repair) => {
      const hitBlock = flight.visited.includes(NOTCH_BLOCK.id);
      const onFloor =
        flight.landedOn === NOTCH_FLOOR.id ||
        flight.restingOn === NOTCH_FLOOR.id;
      const cleared = hitBlock && onFloor;
      return {
        cleared,
        repair: cleared
          ? { ...repair, anachrometer: true }
          : repair,
        hint: cleared
          ? "Anachrometer online"
          : hitBlock
            ? "Reach the floor"
            : "Hit the high block",
      };
    },
  },
  "notch-calibrate": {
    id: "notch-calibrate",
    label: "Notch",
    regionId: "notch",
    next: "launch-bridge",
    hint: "Exit anytime — Ascending 4th is E4 (block) then A4 (pocket).",
    clearHint: "Through the exit",
    enter: () => restOn(NOTCH_FLOOR),
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const cleared = flight.crossedExit;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Through the exit"
          : "Exit anytime — Ascending 4th is E4 then A4",
      };
    },
  },
  "launch-bridge": {
    id: "launch-bridge",
    label: "Launch bridge",
    regionId: "launch",
    next: "stairs-anach",
    hint: "Free-aim through the top exit — or leave the lower-left corner back to Notch.",
    clearHint: "Into the stairs",
    // Continue the Notch exit jump: rise from below and seat on the band.
    enter: () => bridgeRiseEnter(),
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const powered = (flight.power ?? 0) >= BRIDGE_POWER;
      const cleared = powered && flight.crossedExit;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Into the stairs"
          : powered
            ? "Fly out through the exit"
            : "Free-aim a strong shot through the exit",
      };
    },
  },
  "stairs-anach": {
    id: "stairs-anach",
    label: "Stairs",
    regionId: "stairs",
    next: "zig-1",
    hint: "Exit right or lower-right warp to Zig — leave left back to the Bridge.",
    clearHint: "Through the exit",
    // Arrive like the Launch Bridge exit shot: rise onto the approach band.
    enter: () => stairsRiseEnter(),
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const cleared = flight.crossedExit;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Through the exit"
          : "Exit right anytime — complete the arpeggio for Tonation",
      };
    },
  },
  "zig-1": {
    id: "zig-1",
    label: "Zig",
    regionId: "zig",
    next: "launch-tail",
    hint: "Exit up to Tail — lower-left falls to Stairs, lower-right warps in from the left barrier.",
    clearHint: "Through the exit",
    // Rise onto the peak Frequency Band (the starting sling).
    enter: () => zigRiseEnter(),
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const cleared = flight.crossedExit;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Through the exit"
          : "Exit up anytime — complete the contour for Tonation",
      };
    },
  },
  "launch-tail": {
    id: "launch-tail",
    label: "Tail",
    regionId: "launch",
    next: null,
    hint: "Free-aim for the Note-Tail — or leave the lower-left corner back to Zig.",
    clearHint: "Note-Tail recovered",
    enter: () => restOn(LAUNCH_BAND),
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const grabbed = flight.visited.includes("tail-eighth");
      return {
        cleared: grabbed,
        repair: grabbed
          ? {
              ...repair,
              tails: repair.tails.includes("eighth")
                ? repair.tails
                : [...repair.tails, "eighth"],
            }
          : repair,
        hint: grabbed
          ? "Note-Tail recovered"
          : "Launch up and collect the Note-Tail",
      };
    },
  },
};

export function beatById(id: BeatId): BeatDef {
  return PROGRESSION[id];
}

export function stepPolicyFor(
  beat: BeatDef,
  repair: ShipRepair,
  /** Launch teach: band stays soft until the guide is crossed. */
  crossedGoal = false,
): StepPolicy {
  if (beat.id === "launch-teach") {
    return {
      breakSpeed: BREAK_SPEED,
      catchBands: !crossedGoal,
    };
  }
  return {
    breakSpeed: BREAK_SPEED,
    catchBands: beat.catchBands(repair),
  };
}

/** Ledges for a region plus optional exit / warp bands. */
export function liveLedges(
  regionId: RegionId,
  warp: Ledge | null,
  exitBand: Ledge | null = null,
): readonly Ledge[] {
  const base = ledgesFor(regionId);
  const withExit = exitBand ? [...base, exitBand] : base;
  if (!warp) return withExit;
  return [...withExit, warp];
}

export function emptyRepair(): ShipRepair {
  return { anachrometer: false, tails: [] };
}

/** Sandbox jump: beats after the crash already have Anachrometer. */
export function repairForBeat(id: BeatId): ShipRepair {
  if (id === "launch-teach" || id === "notch-crash") {
    return emptyRepair();
  }
  return { anachrometer: true, tails: [] };
}

export function createRoute(): {
  beatId: BeatId;
  repair: ShipRepair;
  body: Body;
} {
  const beatId: BeatId = "launch-teach";
  const repair = emptyRepair();
  return {
    beatId,
    repair,
    body: PROGRESSION[beatId].enter(repair),
  };
}

/**
 * Run a scripted airborne path until rest or out of bounds.
 * Used by the table sandbox tests.
 */
export function simulateFlight(options: {
  regionId: RegionId;
  body: Body;
  policy?: StepPolicy;
  warp?: Ledge | null;
  maxFrames?: number;
  beatId?: BeatId;
  power?: number;
}): BeatFlight {
  const policy = options.policy ?? DEFAULT_STEP_POLICY;
  let body = { ...options.body };
  if (body.restingOn && body.vy === 0 && body.vx === 0 && options.power) {
    // Caller already applied launch velocity when power is set with airborne body.
  }
  let warp = options.warp ?? null;
  const visited: string[] = [];
  let apexY = body.y;
  let crossedGoal = false;
  let brokeBand = false;
  let landedOn: string | null = null;
  const goalY = goalHeight(options.regionId);
  const maxFrames = options.maxFrames ?? 1800;

  if (!body.restingOn) {
    // airborne entry
  } else {
    body = { ...body, restingOn: null };
  }

  for (let frame = 0; frame < maxFrames; frame++) {
    const rising = body.vy > 0;
    const prevY = body.y;
    const prevBottom = body.y - SHIP_R;
    const ledges = liveLedges(options.regionId, warp);
    const livePolicy =
      options.beatId === "launch-teach"
        ? { ...policy, catchBands: !crossedGoal }
        : policy;
    const result = step(body, ledges, FIXED_DT, undefined, livePolicy);
    body = result.body;
    if (!body.restingOn || isSlopedStep(ledgeById(ledges, body.restingOn))) {
      body = resolveMasses(body, options.regionId).body;
    }
    if (body.y > apexY) apexY = body.y;
    if (rising && prevY < goalY && body.y >= goalY) crossedGoal = true;

    if (
      !result.landedId &&
      body.vy < 0 &&
      Math.abs(body.vy) > livePolicy.breakSpeed
    ) {
      for (const ledge of ledges) {
        if (ledge.kind !== "band") continue;
        const withinX = body.x >= ledge.x0 && body.x <= ledge.x1;
        const crossed =
          prevBottom >= ledge.y && body.y - SHIP_R < ledge.y;
        if (withinX && crossed) brokeBand = true;
      }
    }

    if (
      body.y < -240 ||
      body.y > WORLD_H + 240 ||
      body.x < -120 ||
      body.x > WORLD_W + 120
    ) {
      break;
    }

    if (result.landedId && !visited.includes(result.landedId)) {
      visited.push(result.landedId);
    }
    // Land → slide → bounce on sloping treads; keep going until airborne again.
    if (isSlopedStep(ledgeById(ledges, body.restingOn))) continue;
    if (!result.landedId) {
      if (body.restingOn) break;
      continue;
    }
    if (!body.restingOn) continue;
    if (
      options.beatId === "notch-crash" &&
      result.landedId === NOTCH_BLOCK.id
    ) {
      body = bounceOffCrashBlock(body);
      continue;
    }
    landedOn = result.landedId;
    break;
  }

  return {
    apexY,
    crossedGoal,
    brokeBand,
    crossedExit: false,
    visited,
    landedOn,
    restingOn: body.restingOn,
    power: options.power,
  };
}

/** Engage a mid-flight warp under `body` without killing velocity. */
export function applyWarp(body: Body, pitch: PitchName = "C4"): {
  body: Body;
  warp: Ledge;
} {
  return engageWarp(body, pitch);
}

/**
 * After the crash hits the high block, shove toward the floor so the beat
 * can finish without Anachrometer.
 */
export function bounceOffCrashBlock(body: Body): Body {
  const mid = (NOTCH_FLOOR.x0 + NOTCH_FLOOR.x1) / 2;
  return {
    x: mid,
    // Drop toward the floor band without enough fall time to drift off it.
    y: Math.min(body.y + SHIP_R, NOTCH_FLOOR.y + SHIP_R + 280),
    vx: 0,
    vy: -220,
    restingOn: null,
  };
}

export function clearWarpBand(
  ledges: readonly Ledge[],
): readonly Ledge[] {
  return ledges.filter((ledge) => ledge.id !== WARP_BAND_ID);
}

export { WARP_BAND_ID, goalHeight };
