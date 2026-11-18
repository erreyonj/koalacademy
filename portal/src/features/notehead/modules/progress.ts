/**
 * Beat-driven route: Launch → Notch → Launch → Stairs → Zig.
 */
import { engageWarp, WARP_BAND_ID } from "./anachrometer";
import {
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
  NOTCH_POCKET,
  SHIP_R,
  STAIR_BAND,
  STAIR_TREADS,
  WORLD_H,
  WORLD_W,
  ZIG_LEFT,
  ZIG_PEAK,
  ZIG_RIGHT,
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
  | "zig-1";

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

export const BEAT_ORDER: readonly BeatId[] = [
  "launch-teach",
  "notch-crash",
  "notch-calibrate",
  "launch-bridge",
  "stairs-anach",
  "zig-1",
];

const ZIG_BANDS = [ZIG_PEAK.id, ZIG_LEFT.id, ZIG_RIGHT.id] as const;

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

const NOTCH_BANDS = [NOTCH_FLOOR.id, NOTCH_POCKET.id, NOTCH_BLOCK.id] as const;

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
    hint: "Warp, then gather Borealis at the pocket and block.",
    clearHint: "Through the exit",
    enter: () => restOn(NOTCH_FLOOR),
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const gathered = NOTCH_BANDS.every((id) => flight.visited.includes(id));
      const cleared = gathered && flight.crossedExit;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Through the exit"
          : gathered
            ? "Fly out through the exit"
            : "Collect Borealis at pocket and block",
      };
    },
  },
  "launch-bridge": {
    id: "launch-bridge",
    label: "Launch bridge",
    regionId: "launch",
    next: "stairs-anach",
    hint: "Full-power shot from the launch band through the exit.",
    clearHint: "Into the stairs",
    // Continue the Notch exit jump: rise from below and seat on the band.
    enter: () => ({
      x: (LAUNCH_BAND.x0 + LAUNCH_BAND.x1) / 2,
      y: 48,
      vx: 0,
      vy: 1320,
      restingOn: null,
    }),
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
            : "Full power from the launch band",
      };
    },
  },
  "stairs-anach": {
    id: "stairs-anach",
    label: "Stairs",
    regionId: "stairs",
    next: "zig-1",
    hint: "Warp and gather Borealis above every tread.",
    clearHint: "Through the exit",
    // Arrive like the Launch Bridge exit shot: rise onto the approach band.
    enter: () => {
      const mid = (STAIR_BAND.x0 + STAIR_BAND.x1) / 2;
      return {
        x: mid - 30,
        y: 24,
        vx: 90,
        vy: 920,
        restingOn: null,
      };
    },
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const required = STAIR_TREADS.map((ledge) => ledge.id);
      const gathered = required.every((id) => flight.visited.includes(id));
      const cleared = gathered && flight.crossedExit;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Through the exit"
          : gathered
            ? "Fly out through the exit"
            : "Collect Borealis on every tread",
      };
    },
  },
  "zig-1": {
    id: "zig-1",
    label: "Zig",
    regionId: "zig",
    next: null,
    hint: "Warp and zig-zag: gather Borealis floating, left shelf, then right shelf.",
    clearHint: "Through the exit",
    // Rise onto the peak Frequency Band (the starting sling).
    enter: () => ({
      x: (ZIG_PEAK.x0 + ZIG_PEAK.x1) / 2,
      y: 60,
      vx: 40,
      vy: 1180,
      restingOn: null,
    }),
    catchBands: (repair) => repair.anachrometer,
    evaluate: (flight, repair) => {
      const gathered = ZIG_BANDS.every((id) => flight.visited.includes(id));
      const cleared = gathered && flight.crossedExit;
      return {
        cleared,
        repair,
        hint: cleared
          ? "Through the exit"
          : gathered
            ? "Fly out through the exit"
            : "Collect Borealis float → left → right",
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
