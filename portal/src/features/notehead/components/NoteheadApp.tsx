"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIdleAttract } from "../hooks/useIdleAttract";
import {
  canWarp,
  followWarpBand,
  WARP_BAND_ID,
  WARP_TIME_SCALE,
} from "../modules/anachrometer";
import {
  playHullHit,
  playPitch,
  playSoftLanding,
  resume,
  setAimTone,
  setClimb,
  startAnachWarp,
  stopAnachWarp,
} from "../modules/audio";
import {
  type Borealis,
  COLLECT_RADIUS,
  exitBandFor,
  spawnBorealis,
  stepBorealis,
} from "../modules/borealis";
import {
  type NoteTail,
  spawnNoteTail,
  stepNoteTail,
  TAIL_EIGHTH_ID,
} from "../modules/note-tail";
import { chartShotSolid, resolveMasses } from "../modules/collide";
import {
  applyExitBarrierHit,
  applyLandingHit,
  applyRegionClearHeal,
  breachWipesTonation,
  clampHp,
  hullEnabled,
  isHardLanding,
  isSoftMassBump,
  maxHp,
} from "../modules/health";
import { clearanceBelow } from "../modules/momentum";
import { containAgainstOpenings } from "../modules/exit-zone";
import {
  type RouteMemory,
  aimModeFor,
  applyWarp,
  emptyRepair,
  emptyRouteMemory,
  evaluateSlingshot,
  guideY,
  liveLedges,
  markStorySeen,
  stepPolicyFor,
} from "../modules/progress";
import {
  type Aim,
  type Body,
  type DifficultyId,
  type Ledge,
  type PitchName,
  type ShipRepair,
  C_MAJOR,
  FIXED_DT,
  LAUNCH_SPACING,
  PROFILES,
  SHIP_R,
  WORLD_H,
  WORLD_W,
  aimFromPull,
  fromSvgPoint,
  isDockableBand,
  isLandscapeRegion,
  isSlopedStep,
  launchVelocity,
  ledgeById,
  pitchAtHeight,
  regionById,
  step,
  svgViewFor,
} from "../modules/sim";
import {
  applyCollect,
  awardIfNew,
  emptyAttempt,
  emptyRouteTonation,
  intervalHudPair,
  noteTailGateOk,
  TONATION_CAP,
  type IntervalAttempt,
  type RouteTonation,
  wipeTonation,
} from "../modules/tonation";
import type { FrameGesture, GesturePhase } from "../modules/view";
import {
  MusicTransport,
  useThemeMusic,
} from "@/features/games/theme-music";
import {
  interruptsForEvent,
  type StoryEventId,
  type StoryInterrupt as StoryInterruptData,
} from "../modules/story";
import { getRoute } from "../routes/registry";
import { eventsFor, type Slingshot } from "../routes/events";
import { arrive, matchDeparture, type Departure } from "../routes/runtime";
import { HullCueMark } from "./ExitZone";
import { StartScreen } from "./StartScreen";
import { StoryInterrupt } from "./StoryInterrupt";
import { SvgNoteheadView } from "./SvgNoteheadView";
import "../notehead.css";

type Phase = GesturePhase;
type ScreenPhase = "start" | "play";

const THEME_SRC = "/assets/notehead/notehead-etheral-vibe.wav";
/** Slow-mo while the band snaps and the ship falls out through the floor gap. */
const BREAK_FALL_TIME_SCALE = 0.22;
/** Hull-breach shatter before GI / level restart. */
const HULL_BREACH_MS = 880;
/**
 * Dev chrome (level jump pills + under-stage helper text) — on in local/dev
 * by default; set NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT=1 to show in a production
 * build, or =0 to force-hide even in development.
 */
const SHOW_DEV_CHROME =
  process.env.NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT === "1" ||
  (process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT !== "0");

/** Repairs a place starts with (dev jumps): none at the origin, all after. */
function repairForPlace(placeId: string, origin: string): ShipRepair {
  return placeId === origin ? emptyRepair() : { anachrometer: true, tails: [] };
}

function hintForPlace(
  routeId: string,
  placeId: string,
  slingshot: Slingshot | undefined,
): string {
  if (slingshot) return slingshot.hint;
  const tonation = eventsFor(routeId, placeId).tonation;
  return tonation
    ? `Exit anytime — ${tonation.label} earns Tonation.`
    : "Pull a Frequency Band to launch — exit anytime.";
}

type JumpOpts = {
  skipStory?: boolean;
  enterBody?: Body;
};

type JumpFn = (
  id: string,
  nextRepair?: ShipRepair,
  opts?: JumpOpts,
) => void;

export function NoteheadApp() {
  const pageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SvgNoteheadView | null>(null);
  useIdleAttract(pageRef);
  const jumpRef = useRef<JumpFn | null>(null);
  const cutsceneOpenRef = useRef(false);
  const interruptQueueRef = useRef<StoryInterruptData[]>([]);
  const pendingAfterDismissRef = useRef<(() => void) | null>(null);
  const riseGateShownRef = useRef(false);
  /** The player has pulled a slingshot shot that has not landed yet. */
  const lessonShotRef = useRef(false);
  /** Level whose enter stories wait for the ship to finish arriving and seat. */
  const pendingEnterRef = useRef<string | null>(null);
  /** First Tonation bank GI — once per run (survives a Hard breach wipe). */
  const tonationTeachShownRef = useRef(false);
  const hullHitTeachShownRef = useRef(false);
  const hullBreachTeachShownRef = useRef(false);
  const openInterruptRef = useRef<(id: StoryEventId) => void>(() => {});
  const openEnterRef = useRef<(id: string) => void>(() => {});
  const gameRoute = getRoute("zig1perspective");
  const startBody = { ...gameRoute.scenes.get(gameRoute.origin)!.start };
  const placeRef = useRef<string>(gameRoute.origin);
  /** The slingshot lesson has been broken through (or left): the level is plain. */
  const slingshotDoneRef = useRef(false);
  const repairRef = useRef<ShipRepair>(emptyRepair());
  const difficultyRef = useRef<DifficultyId>("easy");
  const phaseRef = useRef<Phase>(startBody.restingOn ? "idle" : "flight");
  const aimRef = useRef<Aim>({ power: 0, angle: 0 });
  const bodyRef = useRef<Body>(startBody);
  const visitedRef = useRef<string[]>([]);
  const crossedRef = useRef<PitchName[]>([]);
  const apexRef = useRef(startBody.y);
  const crossedGoalRef = useRef(false);
  const brokeBandRef = useRef(false);
  const bandBreakRef = useRef<{ x: number; y: number } | null>(null);
  const shotPowerRef = useRef(0);
  const warpRef = useRef<Ledge | null>(null);
  const exitBandRef = useRef<Ledge | null>(null);
  const borealisRef = useRef<Borealis[]>([]);
  const noteTailRef = useRef<NoteTail | null>(null);
  const tonationRef = useRef<RouteTonation>(emptyRouteTonation());
  const attemptRef = useRef<IntervalAttempt>(emptyAttempt());
  const healedRef = useRef<string[]>([]);
  const memoryRef = useRef<RouteMemory>(emptyRouteMemory());
  const hpRef = useRef(maxHp("easy"));
  const stingRef = useRef(0);
  const timeScaleRef = useRef(1);
  const tRef = useRef(0);
  const originX = useRef(0);
  const originY = useRef(0);
  const [placeId, setPlaceId] = useState<string>(gameRoute.origin);
  const [, setRepair] = useState<ShipRepair>(emptyRepair());
  const [difficulty, setDifficulty] = useState<DifficultyId>("easy");
  const [hp, setHp] = useState(maxHp("easy"));
  const [tonationValue, setTonationValue] = useState(0);
  const [attemptTick, setAttemptTick] = useState(0);
  const [hint, setHint] = useState(() =>
    hintForPlace(
      gameRoute.id,
      gameRoute.origin,
      eventsFor(gameRoute.id, gameRoute.origin).slingshot,
    ),
  );
  const [phase, setPhase] = useState<Phase>(phaseRef.current);
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("start");
  const screenPhaseRef = useRef<ScreenPhase>("start");
  const [activeInterrupt, setActiveInterrupt] =
    useState<StoryInterruptData | null>(null);
  const music = useThemeMusic(THEME_SRC, false);

  const beginRun = (id: DifficultyId) => {
    difficultyRef.current = id;
    setDifficulty(id);
    const cap = maxHp(id);
    hpRef.current = cap;
    setHp(cap);
    tonationRef.current = emptyRouteTonation();
    healedRef.current = [];
    memoryRef.current = emptyRouteMemory();
    attemptRef.current = emptyAttempt();
    tonationTeachShownRef.current = false;
    setTonationValue(0);
    screenPhaseRef.current = "play";
    setScreenPhase("play");
    resume();
    music.start();
    // The enter animation plays first; the stories fire once the ship seats.
    memoryRef.current = markStorySeen(memoryRef.current, placeRef.current);
    pendingEnterRef.current = placeRef.current;
  };

  const promoteInterrupt = (batch: readonly StoryInterruptData[]) => {
    if (batch.length === 0) return;
    if (cutsceneOpenRef.current) {
      interruptQueueRef.current = [
        ...interruptQueueRef.current,
        ...batch,
      ];
      return;
    }
    const [first, ...rest] = batch;
    interruptQueueRef.current = rest;
    cutsceneOpenRef.current = true;
    setActiveInterrupt(first ?? null);
  };

  const openInterrupt = (eventId: StoryEventId) => {
    promoteInterrupt(interruptsForEvent(eventId));
  };
  openInterruptRef.current = openInterrupt;

  /** The slingshot lesson for the current level, while it is still live. */
  const slingshotNow = (): Slingshot | undefined =>
    slingshotDoneRef.current
      ? undefined
      : eventsFor(gameRoute.id, placeRef.current).slingshot;

  /** The first authored band: the slingshot's band and guide anchor. */
  const slingshotBand = (): Ledge | undefined =>
    gameRoute.scenes
      .get(placeRef.current)
      ?.ledges.find((ledge) => ledge.kind === "band");

  const enterStoriesFor = (id: string): readonly StoryEventId[] =>
    eventsFor(gameRoute.id, id).enter ?? [];

  const openEnterStory = (id: string) => {
    const batch = enterStoriesFor(id).flatMap((eventId) => [
      ...interruptsForEvent(eventId),
    ]);
    promoteInterrupt(batch);
  };
  openEnterRef.current = openEnterStory;

  const dismissInterrupt = () => {
    const next = interruptQueueRef.current[0];
    if (next) {
      interruptQueueRef.current = interruptQueueRef.current.slice(1);
      cutsceneOpenRef.current = true;
      setActiveInterrupt(next);
      return;
    }
    interruptQueueRef.current = [];
    cutsceneOpenRef.current = false;
    setActiveInterrupt(null);
    const pending = pendingAfterDismissRef.current;
    pendingAfterDismissRef.current = null;
    pending?.();
  };

  const intervalChallenge = eventsFor(gameRoute.id, placeId).tonation ?? null;
  // attemptTick forces HUD pair refresh when collects change inside the rAF loop.
  void attemptTick;
  const intervalPair = intervalChallenge
    ? intervalHudPair(intervalChallenge, attemptRef.current)
    : null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new SvgNoteheadView();
    view.mount(host);
    viewRef.current = view;

    const setHull = (next: number) => {
      const clamped = clampHp(next, difficultyRef.current);
      hpRef.current = clamped;
      setHp(clamped);
    };

    const syncTonationHud = () => {
      setTonationValue(tonationRef.current.value);
      setAttemptTick((n) => n + 1);
    };

    /** Hull tips — once per level visit, on first damage / first breach. */
    const teachHullDamage = (prev: number, next: number) => {
      const hull = eventsFor(gameRoute.id, placeRef.current).hull;
      if (!hull || next >= prev) return;
      if (hull.hit && !hullHitTeachShownRef.current) {
        hullHitTeachShownRef.current = true;
        openInterruptRef.current(hull.hit);
      }
      if (hull.breach && next <= 0 && !hullBreachTeachShownRef.current) {
        hullBreachTeachShownRef.current = true;
        openInterruptRef.current(hull.breach);
      }
    };

    /**
     * At 0 HP: shatter the ship, then teach GIs (empty hull) or restart.
     * Teach is deferred so the destroy anim reads before the tip text.
     */
    const handleHullBreach = (prevHp: number, nextHp: number) => {
      setHint("Hull breached");
      stopAnachWarp();
      timeScaleRef.current = 1;
      warpRef.current = null;
      phaseRef.current = "breach";
      setPhase("breach");

      const restart = () => {
        if (breachWipesTonation(difficultyRef.current)) {
          tonationRef.current = wipeTonation();
          healedRef.current = [];
          syncTonationHud();
        }
        jumpTo(placeRef.current, repairRef.current);
        setHull(maxHp(difficultyRef.current));
      };

      window.setTimeout(() => {
        teachHullDamage(prevHp, nextHp);
        if (
          eventsFor(gameRoute.id, placeRef.current).hull &&
          (cutsceneOpenRef.current || interruptQueueRef.current.length > 0)
        ) {
          // Keep 0 HP so the hull cue points at empty pips until dismiss.
          pendingAfterDismissRef.current = restart;
          return;
        }
        restart();
      }, HULL_BREACH_MS);
    };

    const jumpTo: JumpFn = (id, nextRepair, opts) => {
      const prevId = placeRef.current;
      const events = eventsFor(gameRoute.id, id);
      const scene = gameRoute.scenes.get(id) ?? null;
      let repair = nextRepair ?? repairForPlace(id, gameRoute.origin);
      if (events.grant?.anachrometer && !repair.anachrometer) {
        repair = { ...repair, anachrometer: true };
      }
      placeRef.current = id;
      repairRef.current = repair;
      bodyRef.current =
        opts?.enterBody ?? (scene ? { ...scene.start } : bodyRef.current);
      warpRef.current = null;
      exitBandRef.current = null;
      borealisRef.current = spawnBorealis(scene?.borealis ?? []);
      attemptRef.current = emptyAttempt();
      syncTonationHud();
      noteTailRef.current =
        events.noteTail && !repair.tails.includes("eighth")
          ? spawnNoteTail(events.noteTail)
          : null;
      timeScaleRef.current = 1;
      stopAnachWarp();
      aimRef.current = { power: 0, angle: 0 };
      visitedRef.current = [];
      crossedRef.current = [];
      apexRef.current = bodyRef.current.y;
      crossedGoalRef.current = false;
      brokeBandRef.current = false;
      bandBreakRef.current = null;
      lessonShotRef.current = false;
      shotPowerRef.current = 0;
      tRef.current = 0;
      setPlaceId(id);
      setRepair(repair);
      setHint(hintForPlace(gameRoute.id, id, slingshotNow()));
      setClimb(null);
      setAimTone(null);
      const nextPhase: Phase = bodyRef.current.restingOn ? "idle" : "flight";
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      // Same-level restart (hull breach) keeps teach flags and skips enter CM.
      if (id !== prevId) {
        riseGateShownRef.current = false;
        hullHitTeachShownRef.current = false;
        hullBreachTeachShownRef.current = false;
        // Drop any in-flight CM/GI from the previous level so sandbox jumps
        // (and soft returns) never leak dialogue into the next place.
        interruptQueueRef.current = [];
        cutsceneOpenRef.current = false;
        pendingAfterDismissRef.current = null;
        pendingEnterRef.current = null;
        setActiveInterrupt(null);
        const skip =
          opts?.skipStory || memoryRef.current.storySeen.includes(id);
        if (!skip) {
          memoryRef.current = markStorySeen(memoryRef.current, id);
          // After the arrival animation: see the loop.
          pendingEnterRef.current = id;
        }
      }
    };
    jumpRef.current = jumpTo;

    /** Soft reverse travel into a prior level (skip enter CM when revisited). */
    const takeReturnRoute = (
      to: string,
      enterBody: Body,
      hint: string,
      slowMo = false,
    ) => {
      setHint(hint);
      phaseRef.current = "flight";
      setPhase("flight");
      if (slowMo) timeScaleRef.current = BREAK_FALL_TIME_SCALE;
      jumpTo(to, repairRef.current, {
        skipStory: true,
        enterBody,
      });
      if (slowMo) {
        timeScaleRef.current = BREAK_FALL_TIME_SCALE;
        window.setTimeout(() => {
          if (placeRef.current === to) timeScaleRef.current = 1;
        }, 900);
      }
    };

    const seatLedges = () =>
      liveLedges(
        placeRef.current,
        warpRef.current,
        exitBandRef.current,
      );

    const slidingOnStep = () =>
      isSlopedStep(ledgeById(seatLedges(), bodyRef.current.restingOn));

    /** Idle rest on a Frequency Band — soft center dock (not Anachrometer warp). */
    const dockingOnBand = () => {
      if (phaseRef.current !== "idle") return false;
      if (warpRef.current) return false;
      return isDockableBand(
        ledgeById(seatLedges(), bodyRef.current.restingOn),
      );
    };

    /** The last Note-Tail is back: the tutorial route is done. */
    const finishRoute = (hint: string) => {
      phaseRef.current = "sparkle";
      setPhase("sparkle");
      setHint(hint);
      window.setTimeout(() => {
        phaseRef.current = "idle";
        setPhase("idle");
        setHint("Route clear");
      }, 720);
    };

    /**
     * The ship left through an exit. Forward exits celebrate, then carry the
     * ship on; back exits drop it straight in; a same-level exit re-enters.
     */
    const takeDeparture = (departure: Departure): boolean => {
      const scene = gameRoute.scenes.get(placeRef.current);
      if (!scene) return false;
      const lesson = slingshotNow();
      if (lesson) {
        const exit = scene.level.exits[departure.exit];
        const target = departure.to ? gameRoute.scenes.get(departure.to) : null;
        if (exit?.facing === "down") {
          if (brokeBandRef.current && target) {
            // Through the band and out the floor gap: crash into the target at
            // its authored Enter pose.
            slingshotDoneRef.current = true;
            jumpTo(target.id, repairRef.current, { enterBody: { ...target.start } });
            return true;
          }
          // Slid off the band without breaking it: start the lesson over.
          jumpTo(placeRef.current, repairRef.current);
          return true;
        }
        // Left upward or sideways instead: the lesson is over.
        slingshotDoneRef.current = true;
      }
      const arrival = arrive(gameRoute, scene, departure, bodyRef.current);
      if (arrival.kind === "error") {
        setHint(arrival.message);
        return false;
      }
      if (arrival.kind === "end") {
        finishRoute("Route clear");
        return true;
      }
      if (arrival.soft) {
        // Same level: keep Borealis and the Tonation attempt.
        bodyRef.current = arrival.body;
        warpRef.current = null;
        stopAnachWarp();
        timeScaleRef.current = 1;
        phaseRef.current = "flight";
        setPhase("flight");
        setHint("Looping back in…");
        return true;
      }
      if (!arrival.forward) {
        takeReturnRoute(
          arrival.levelId,
          arrival.body,
          arrival.fallIn ? "Falling back in…" : "Returning…",
          arrival.fallIn,
        );
        return true;
      }
      const events = eventsFor(gameRoute.id, placeRef.current);
      const firstIntervalClear =
        Boolean(events.tonation) && !healedRef.current.includes(placeRef.current);
      if (firstIntervalClear) {
        healedRef.current = [...healedRef.current, placeRef.current];
        setHull(applyRegionClearHeal(hpRef.current, difficultyRef.current));
      }
      setHint("Through the exit");
      phaseRef.current = "sparkle";
      setPhase("sparkle");
      window.setTimeout(() => {
        jumpTo(arrival.levelId, repairRef.current, { enterBody: arrival.body });
      }, events.departMs ?? 720);
      return true;
    };

    /**
     * The ship has settled (or landed on a sloping tread). During the
     * slingshot lesson this is where a flight is judged; elsewhere it rests.
     */
    const settle = () => {
      if (slingshotNow()) {
        setHint(
          evaluateSlingshot({
            crossedGoal: crossedGoalRef.current,
            brokeBand: brokeBandRef.current,
          }).hint,
        );
      }
      // Sloped treads keep simulating (land → slide → bounce); don't freeze.
      // An active pull (incl. after air-warp contact) also stays live.
      if (
        phaseRef.current !== "pulling" &&
        bodyRef.current.restingOn &&
        !slidingOnStep()
      ) {
        phaseRef.current = "idle";
        setPhase("idle");
      }
    };

    const paint = () => {
      const regionId = placeRef.current;
      const sample = {
        t: tRef.current,
        body: bodyRef.current,
        crossedUp: crossedRef.current,
        apexPitch: pitchAtHeight(apexRef.current),
      };
      const aiming =
        phaseRef.current === "pulling" && aimRef.current.power >= 0.08;
      const chartHome =
        bodyRef.current.restingOn ??
        (warpRef.current ? WARP_BAND_ID : null);
      const chart = aiming
        ? chartShotSolid(
            regionId,
            chartHome
              ? { ...bodyRef.current, restingOn: chartHome }
              : bodyRef.current,
            aimRef.current,
            PROFILES[difficultyRef.current].aimInset,
            aimModeFor(Boolean(slingshotNow())),
          )
        : null;
      // Decay the red hit flash between paints.
      stingRef.current = Math.max(0, stingRef.current - 0.018);
      const live = liveLedges(
        regionId,
        warpRef.current,
        exitBandRef.current,
      );
      const gesture: FrameGesture = {
        power: aimRef.current.power,
        angle: aimRef.current.angle,
        phase: phaseRef.current,
        visited: visitedRef.current,
        chart: chart?.points ?? [],
        chartApex: chart?.apex ?? null,
        warp: warpRef.current,
        exitBand: exitBandRef.current,
        borealis: borealisRef.current,
        noteTail: noteTailRef.current,
        bandBreak: bandBreakRef.current,
        guide: (() => {
          const lesson = slingshotNow();
          const band = slingshotBand();
          return lesson && band ? guideY(band, lesson.goal) : null;
        })(),
        clearance: clearanceBelow(bodyRef.current, live),
        sting: stingRef.current,
      };
      view.frame(sample, regionById(regionId), gesture);
    };

    const tickSim = () => {
      const place = placeRef.current;
      const lesson = slingshotNow();
      const lessonBand = slingshotBand();
      const regionId = place;
      const scene = gameRoute.scenes.get(place) ?? null;
      const events = eventsFor(gameRoute.id, place);
      const policy = stepPolicyFor(Boolean(lesson), crossedGoalRef.current);
      // Warp is visual + aim home only while the ship is still flying —
      // colliding with the transient band would kill mid-air aim.
      const ledges = liveLedges(
        regionId,
        phaseRef.current === "pulling" ? null : warpRef.current,
        exitBandRef.current,
      );
      const rising = bodyRef.current.vy > 0;
      const prevY = bodyRef.current.y;
      const prevBottom = bodyRef.current.y - SHIP_R;
      const result = step(
        bodyRef.current,
        ledges,
        FIXED_DT,
        undefined,
        policy,
      );
      bodyRef.current = result.body;
      // Flat ledge seats stay authoritative; sliding treads still need rock walls.
      const seat = ledgeById(ledges, bodyRef.current.restingOn);
      const solid =
        !bodyRef.current.restingOn || isSlopedStep(seat)
          ? resolveMasses(bodyRef.current, regionId)
          : { body: bodyRef.current, hit: false, massId: null, into: 0 };
      bodyRef.current = solid.body;
      const openings = scene?.openings ?? [];
      let exitBarrierHit = false;
      // Seal every edge except the level's exits.
      if (
        openings.length > 0 &&
        (!bodyRef.current.restingOn || isSlopedStep(seat))
      ) {
        const sealed = containAgainstOpenings(bodyRef.current, openings);
        bodyRef.current = sealed.body;
        exitBarrierHit = sealed.hit;
      }
      if (warpRef.current) {
        warpRef.current = followWarpBand(
          bodyRef.current,
          warpRef.current.pitch,
        );
      }
      tRef.current += FIXED_DT;
      if (bodyRef.current.y > apexRef.current) apexRef.current = bodyRef.current.y;

      if (lesson && lessonBand) {
        const goalY = guideY(lessonBand, lesson.goal);
        if (rising && prevY < goalY && bodyRef.current.y >= goalY) {
          crossedGoalRef.current = true;
        }
      }
      // Level GI: first rise past an authored height (e.g. the Anachrometer teach).
      if (
        events.riseGate &&
        !riseGateShownRef.current &&
        rising &&
        prevY < events.riseGate.y &&
        bodyRef.current.y >= events.riseGate.y
      ) {
        riseGateShownRef.current = true;
        openInterruptRef.current(events.riseGate.event);
      }
      // Climb ladder voice belongs to the slingshot lesson.
      if (rising && lesson && lessonBand) {
        for (let index = 0; index < C_MAJOR.pitches.length; index++) {
          const y = lessonBand.y + (index + 1) * LAUNCH_SPACING;
          const pitch = C_MAJOR.pitches[index];
          if (!pitch) continue;
          if (
            prevY < y &&
            bodyRef.current.y >= y &&
            !crossedRef.current.includes(pitch)
          ) {
            crossedRef.current = [...crossedRef.current, pitch];
            setClimb(pitch);
          }
        }
      }
      if (rising && bodyRef.current.vy <= 0) setClimb(null);

      if (
        lesson &&
        !result.landedId &&
        bodyRef.current.vy < 0 &&
        Math.abs(bodyRef.current.vy) > policy.breakSpeed
      ) {
        for (const ledge of ledges) {
          if (ledge.kind !== "band") continue;
          const withinX =
            bodyRef.current.x >= ledge.x0 && bodyRef.current.x <= ledge.x1;
          if (
            withinX &&
            prevBottom >= ledge.y &&
            bodyRef.current.y - SHIP_R < ledge.y
          ) {
            if (!brokeBandRef.current) {
              bandBreakRef.current = {
                x: bodyRef.current.x,
                y: ledge.y,
              };
              if (crossedGoalRef.current) {
                // Slo-mo fall while the band break plays, out through the floor gap.
                timeScaleRef.current = BREAK_FALL_TIME_SCALE;
                setHint(lesson.clearHint);
              }
            }
            brokeBandRef.current = true;
          }
        }
      }

      // Exits: out the top / right, or a falling hull touching the floor gap.
      if (scene) {
        const departure = matchDeparture(scene, bodyRef.current);
        if (departure && takeDeparture(departure)) return;
      }

      if (
        bodyRef.current.y < -240 ||
        bodyRef.current.y > WORLD_H + 240 ||
        bodyRef.current.x < -120 ||
        bodyRef.current.x > WORLD_W + 120
      ) {
        if (openings.length > 0) {
          // Sealed frame: bounce back instead of losing the Borealis run.
          const bounced = containAgainstOpenings(bodyRef.current, openings);
          bodyRef.current = bounced.body;
          if (bounced.hit) {
            const prev = hpRef.current;
            const next = applyExitBarrierHit(prev, difficultyRef.current);
            if (next !== prev) {
              stingRef.current = 1;
              playHullHit();
              setHull(next);
              if (next <= 0) {
                handleHullBreach(prev, next);
              } else {
                teachHullDamage(prev, next);
              }
            } else {
              playSoftLanding();
            }
          }
          return;
        }
        jumpTo(place, repairRef.current);
        return;
      }

      const landed = result.landedId
        ? ledgeById(ledges, result.landedId)
        : null;
      // Frequency Bands are always soft. Steps/blocks and rock walls share the
      // same hard-hit bar (LANDING_HIT_SPEED / MASS_HIT_SPEED). Exit barriers
      // use that gate too, and only deduct HP on Hard.
      const bandLand = landed?.kind === "band";
      const hardLand =
        Boolean(result.landedId) &&
        !bandLand &&
        isHardLanding(result.impactSpeed);
      const terrainHit = hardLand || solid.hit;
      const softMassBump = isSoftMassBump(solid.into);
      let hullDamaged = false;
      if (exitBarrierHit) {
        const prev = hpRef.current;
        const next = applyExitBarrierHit(prev, difficultyRef.current);
        if (next !== prev) {
          hullDamaged = true;
          stingRef.current = 1;
          playHullHit();
          setHull(next);
          if (next <= 0) {
            handleHullBreach(prev, next);
            return;
          }
          teachHullDamage(prev, next);
        }
      } else if (terrainHit && hullEnabled(difficultyRef.current)) {
        const prev = hpRef.current;
        const next = applyLandingHit(prev, difficultyRef.current);
        stingRef.current = 1;
        if (next !== prev) {
          hullDamaged = true;
          playHullHit();
        }
        setHull(next);
        if (next <= 0) {
          handleHullBreach(prev, next);
          return;
        }
        if (next !== prev) teachHullDamage(prev, next);
      } else if (terrainHit) {
        stingRef.current = 1;
      }

      // Soft Frequency Band seats, gentle ledge landings, and non-damaging
      // wall bumps — not the HP caution sting.
      if (
        !hullDamaged &&
        (Boolean(result.landedId) ||
          softMassBump ||
          solid.hit ||
          exitBarrierHit)
      ) {
        playSoftLanding();
      }

      if (!result.landedId) {
        // Rock bump only — stay in flight.
        return;
      }

      if (!visitedRef.current.includes(result.landedId)) {
        visitedRef.current = [...visitedRef.current, result.landedId];
      }
      if (result.landedId === exitBandRef.current?.id) {
        setHint("Fly out through the exit");
      }

      // Soft tread land: stay in flight so slide + lip bounce keep running.
      if (isSlopedStep(landed) && bodyRef.current.restingOn) {
        settle();
        return;
      }

      if (!bodyRef.current.restingOn) {
        settle();
        return;
      }

      warpRef.current = null;
      timeScaleRef.current = 1;
      stopAnachWarp();
      settle();
      // Only after the player's own short pull, not the arrival landing.
      if (lesson && landed?.kind === "band") {
        const shot = lessonShotRef.current;
        lessonShotRef.current = false;
        if (shot && !crossedGoalRef.current) openInterruptRef.current(lesson.miss);
      }
    };

    // Size the scene from its wrap so the SVG fills the playfield
    // instead of collapsing to the viewBox intrinsic size.
    const wrap = host.parentElement;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        view.resize(rect.width, rect.height);
      }
    });
    observer.observe(wrap ?? host);

    /** Borealis runs in real time — Anachrometer must not slow its magnet pull. */
    const tickBorealis = (dt: number) => {
      if (dt <= 0 || borealisRef.current.length === 0) return;
      if (borealisRef.current.every((gem) => gem.collected)) return;
      const borealisStep = stepBorealis(
        borealisRef.current,
        bodyRef.current,
        dt,
      );
      borealisRef.current = borealisStep.list;
      if (!borealisStep.collected.length) return;
      const place = placeRef.current;
      const challenge = eventsFor(gameRoute.id, place).tonation ?? null;
      for (const gem of borealisStep.collected) {
        playPitch(gem.pitch);
        if (!visitedRef.current.includes(gem.id)) {
          visitedRef.current = [...visitedRef.current, gem.id];
        }
        if (!challenge) continue;
        const result = applyCollect(challenge, attemptRef.current, gem.pitch);
        attemptRef.current = result.attempt;
        syncTonationHud();
        if (result.kind === "fail") {
          setHint(
            "Out of order — no Tonation this visit. Leave and return to regen.",
          );
          continue;
        }
        if (result.kind === "success") {
          const before = tonationRef.current.value;
          tonationRef.current = awardIfNew(
            tonationRef.current,
            place,
            challenge.payout,
          );
          syncTonationHud();
          if (
            !tonationTeachShownRef.current &&
            tonationRef.current.value > before
          ) {
            tonationTeachShownRef.current = true;
            openInterruptRef.current("tonation-first");
          }
          const scene = gameRoute.scenes.get(place);
          const planted = scene
            ? exitBandFor(gem, scene.logical, scene.ledges)
            : null;
          if (planted) exitBandRef.current = planted;
          setHint("Interval locked — fly out through the exit");
        }
      }
    };

    /** Note-Tail magnet / collect — gated by Tonation bank + hull. */
    const tickNoteTail = (dt: number) => {
      if (dt <= 0 || !noteTailRef.current || noteTailRef.current.collected) {
        return;
      }
      const gate = noteTailGateOk(
        tonationRef.current.value,
        hpRef.current,
        difficultyRef.current,
      );
      if (!gate.ok) {
        const dist = Math.hypot(
          bodyRef.current.x - noteTailRef.current.x,
          bodyRef.current.y - noteTailRef.current.y,
        );
        if (dist < COLLECT_RADIUS * 2 && gate.reason) {
          setHint(gate.reason);
        }
        return;
      }
      const stepped = stepNoteTail(noteTailRef.current, bodyRef.current, dt);
      noteTailRef.current = stepped.tail;
      if (!stepped.collected) return;
      playPitch("A4");
      if (!visitedRef.current.includes(TAIL_EIGHTH_ID)) {
        visitedRef.current = [...visitedRef.current, TAIL_EIGHTH_ID];
      }
      const repair = repairRef.current;
      if (!repair.tails.includes("eighth")) {
        repairRef.current = { ...repair, tails: [...repair.tails, "eighth"] };
        setRepair(repairRef.current);
      }
      finishRoute("Note-Tail recovered");
    };

    let raf = 0;
    let last = 0;
    let acc = 0;
    const loop = (ts: number) => {
      if (document.hidden) {
        last = 0;
        raf = window.requestAnimationFrame(loop);
        return;
      }
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (cutsceneOpenRef.current) {
        paint();
        raf = window.requestAnimationFrame(loop);
        return;
      }
      // Hold the world until the run begins, so the enter animation is seen.
      if (screenPhaseRef.current !== "play") {
        paint();
        raf = window.requestAnimationFrame(loop);
        return;
      }
      // Enter stories wait for the arrival to finish: the ship has seated.
      if (
        pendingEnterRef.current &&
        phaseRef.current === "idle" &&
        bodyRef.current.restingOn
      ) {
        const id = pendingEnterRef.current;
        pendingEnterRef.current = null;
        openEnterRef.current(id);
        if (cutsceneOpenRef.current) {
          paint();
          raf = window.requestAnimationFrame(loop);
          return;
        }
      }
      // Real-time magnet / collect — not scaled by warp timeScale.
      tickBorealis(dt);
      tickNoteTail(dt);
      const pulling = phaseRef.current === "pulling";
      const airWarp = pulling && warpRef.current !== null;
      // Keep physics while aiming in the air or on a sloping tread. Grounded
      // Frequency Band pulls stay visual-only so the ship doesn't fall through.
      const pullInMotion =
        pulling &&
        (airWarp ||
          !bodyRef.current.restingOn ||
          slidingOnStep());
      const sliding = slidingOnStep();
      const docking = dockingOnBand();
      if (
        phaseRef.current === "flight" ||
        pullInMotion ||
        sliding ||
        docking
      ) {
        acc += dt * timeScaleRef.current;
        let guard = 0;
        while (
          acc >= FIXED_DT &&
          guard < 8 &&
          (phaseRef.current === "flight" ||
            slidingOnStep() ||
            dockingOnBand() ||
            (phaseRef.current === "pulling" &&
              (warpRef.current !== null ||
                !bodyRef.current.restingOn ||
                slidingOnStep())))
        ) {
          acc -= FIXED_DT;
          guard += 1;
          if (dockingOnBand() && phaseRef.current === "idle") {
            // Idle dock only — no flight side effects.
            const ledges = seatLedges();
            const result = step(
              bodyRef.current,
              ledges,
              FIXED_DT,
              undefined,
              stepPolicyFor(Boolean(slingshotNow()), crossedGoalRef.current),
            );
            bodyRef.current = result.body;
          } else {
            tickSim();
          }
          // Touching a real surface while warping: drop the warp band / slow-mo
          // but keep the pull so aim, slide, and fall still apply.
          if (
            phaseRef.current === "pulling" &&
            warpRef.current &&
            bodyRef.current.restingOn &&
            bodyRef.current.restingOn !== WARP_BAND_ID
          ) {
            warpRef.current = null;
            timeScaleRef.current = 1;
            stopAnachWarp();
          }
        }
      }
      paint();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    const onHide = () => {
      if (document.hidden) {
        setClimb(null);
        setAimTone(null);
        stopAnachWarp();
      }
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      setClimb(null);
      setAimTone(null);
      stopAnachWarp();
      view.unmount();
      viewRef.current = null;
      jumpRef.current = null;
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (screenPhaseRef.current !== "play") return;
    if (cutsceneOpenRef.current) return;
    if (phaseRef.current === "sparkle" || phaseRef.current === "breach") return;
    resume();
    music.start();
    // Tap a Borealis orb to preview its pitch (does not collect).
    if (
      phaseRef.current !== "pulling" &&
      borealisRef.current.some((gem) => !gem.collected)
    ) {
      const rect = event.currentTarget.getBoundingClientRect();
      const regionId = placeRef.current;
      const view = svgViewFor(regionId);
      const svgX = ((event.clientX - rect.left) / rect.width) * view.w;
      const svgY = ((event.clientY - rect.top) / rect.height) * view.h;
      const logical = fromSvgPoint(svgX, svgY, regionId);
      const tapR = COLLECT_RADIUS * 1.8;
      const hit = borealisRef.current.find((gem) => {
        if (gem.collected) return false;
        return Math.hypot(gem.x - logical.x, gem.y - logical.y) <= tapR;
      });
      if (hit) {
        playPitch(hit.pitch);
        return;
      }
    }
    // Mid-flight press: warp a band under the ship and start the next pull
    // on this same gesture while the ship keeps moving.
    if (
      phaseRef.current === "flight" &&
      canWarp(
        repairRef.current.anachrometer,
        bodyRef.current.restingOn,
        warpRef.current !== null,
      )
    ) {
      const engaged = applyWarp(bodyRef.current);
      bodyRef.current = engaged.body;
      warpRef.current = engaged.warp;
      timeScaleRef.current = WARP_TIME_SCALE;
      startAnachWarp();
      event.currentTarget.setPointerCapture(event.pointerId);
      originX.current = event.clientX;
      originY.current = event.clientY;
      aimRef.current = { power: 0, angle: 0 };
      phaseRef.current = "pulling";
      setPhase("pulling");
      setHint("Aim the next shot");
      return;
    }
    if (phaseRef.current === "flight") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    originX.current = event.clientX;
    originY.current = event.clientY;
    aimRef.current = { power: 0, angle: 0 };
    phaseRef.current = "pulling";
    setPhase("pulling");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (cutsceneOpenRef.current) return;
    if (phaseRef.current !== "pulling") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pullX = (event.clientX - originX.current) * (WORLD_W / rect.width);
    const pullY = -(event.clientY - originY.current) * (WORLD_H / rect.height);
    const home =
      bodyRef.current.restingOn ??
      (warpRef.current ? WARP_BAND_ID : "");
    aimRef.current = aimFromPull(
      placeRef.current,
      home,
      pullX,
      pullY,
      PROFILES[difficultyRef.current].aimInset,
      aimModeFor(Boolean(slingshotNow())),
    );
    setAimTone(aimRef.current.power);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Still resolve an in-flight pull if the GI/CM opened mid-gesture.
    if (cutsceneOpenRef.current && phaseRef.current !== "pulling") return;
    if (phaseRef.current !== "pulling") return;
    const aim = aimRef.current;
    aimRef.current = { power: 0, angle: 0 };
    setAimTone(null);
    const airWarp = warpRef.current !== null;
    if (aim.power < 0.08) {
      if (airWarp) {
        // Cancel warp; keep current velocity and resume flight.
        warpRef.current = null;
        timeScaleRef.current = 1;
        stopAnachWarp();
        phaseRef.current = "flight";
        setPhase("flight");
        setHint(hintForPlace(gameRoute.id, placeRef.current, slingshotNow()));
        return;
      }
      phaseRef.current = "idle";
      setPhase("idle");
      setHint(hintForPlace(gameRoute.id, placeRef.current, slingshotNow()));
      return;
    }
    const home =
      bodyRef.current.restingOn ?? (airWarp ? WARP_BAND_ID : "");
    const velocity = launchVelocity(
      placeRef.current,
      home,
      aim,
      PROFILES[difficultyRef.current].aimInset,
      aimModeFor(Boolean(slingshotNow())),
    );
    // New shot replaces current velocity from the live pose.
    bodyRef.current = { ...bodyRef.current, ...velocity, restingOn: null };
    warpRef.current = null;
    timeScaleRef.current = 1;
    stopAnachWarp();
    shotPowerRef.current = aim.power;
    crossedRef.current = [];
    if (slingshotNow()) {
      lessonShotRef.current = true;
      visitedRef.current = [];
      crossedGoalRef.current = false;
      brokeBandRef.current = false;
      bandBreakRef.current = null;
    }
    apexRef.current = bodyRef.current.y;
    tRef.current = 0;
    phaseRef.current = "flight";
    setPhase("flight");
    setHint("Flying…");
  };

  return (
    <div
      ref={pageRef}
      className="notehead-page"
      data-testid="notehead-stage"
      data-orientation={
        isLandscapeRegion(placeId) ? "landscape" : "portrait"
      }
      data-place={placeId}
    >
      {SHOW_DEV_CHROME ? (
        <nav className="notehead-regions" aria-label="Levels">
          {gameRoute.levels.map((level) => level.id).map(
            (id) => (
              <button
                key={id}
                type="button"
                className={placeId === id ? "is-on" : ""}
                aria-pressed={placeId === id}
                data-testid={`place-${id}`}
                onClick={() => jumpRef.current?.(id)}
              >
                {id}
              </button>
            ),
          )}
        </nav>
      ) : null}
      <div className="notehead-stage" data-phase={phase} data-screen={screenPhase}>
        {screenPhase === "start" ? (
          <StartScreen
            difficulty={difficulty}
            onDifficulty={(id) => {
              difficultyRef.current = id;
              setDifficulty(id);
              const cap = maxHp(id);
              hpRef.current = cap;
              setHp(cap);
            }}
            onBegin={beginRun}
          />
        ) : null}
        <div className="notehead-hud">
          <div
            className="notehead-tonation"
            role="meter"
            aria-label="Tonation"
            aria-valuemin={0}
            aria-valuemax={TONATION_CAP}
            aria-valuenow={tonationValue}
            data-testid="tonation-bar"
            data-idle-flash=""
          >
            <span>tonation</span>
            <div className="notehead-tonation-track">
              <div
                className="notehead-tonation-fill"
                style={{
                  width: `${(tonationValue / TONATION_CAP) * 100}%`,
                }}
              />
            </div>
          </div>
          {hullEnabled(difficulty) && (
            <div
              className={`notehead-hull${activeInterrupt?.accent === "hull" ? " is-gi-pulse" : ""}`}
              role="meter"
              aria-label="Hull"
              aria-valuemin={0}
              aria-valuemax={maxHp(difficulty)}
              aria-valuenow={hp}
              data-testid="hull-bar"
              data-idle-flash=""
            >
              <span>hull</span>
              <div className="notehead-hull-pips">
                {Array.from({ length: maxHp(difficulty) }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index < hp
                        ? "notehead-hull-pip is-on"
                        : "notehead-hull-pip"
                    }
                  />
                ))}
              </div>
              <HullCueMark lit={activeInterrupt?.accent === "hull"} />
            </div>
          )}
          {intervalChallenge && intervalPair ? (
            <button
              type="button"
              className="notehead-interval-btn"
              data-testid="interval-hud"
              data-idle-flash=""
              aria-label={`Interval ${intervalChallenge.label} ${intervalPair.join(" ")}`}
              onClick={() => {
                resume();
                music.start();
                intervalPair.forEach((pitch, index) => {
                  window.setTimeout(() => playPitch(pitch), index * 280);
                });
              }}
            >
              <span>interval:</span>
              <strong>
                {intervalPair[0].replace(/\d+$/, "")}
                <sub>{intervalPair[0].match(/\d+$/)?.[0]}</sub>
              </strong>
              <span className="notehead-interval-sep">→</span>
              <strong>
                {intervalPair[1].replace(/\d+$/, "")}
                <sub>{intervalPair[1].match(/\d+$/)?.[0]}</sub>
              </strong>
            </button>
          ) : null}
        </div>
        <div className="notehead-scene-wrap">
          <div
            className="notehead-scene"
            ref={hostRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {activeInterrupt ? (
            <StoryInterrupt
              interrupt={activeInterrupt}
              onDismiss={dismissInterrupt}
            />
          ) : null}
        </div>
        {SHOW_DEV_CHROME ? (
          <p className="notehead-hint" data-testid="notehead-hint">
            {hint}
          </p>
        ) : null}
        <MusicTransport
          title="Cosmic Aether Soul"
          classPrefix="notehead-music"
          playing={music.playing}
          volume={music.volume}
          onToggle={music.toggle}
          onVolume={music.setVolume}
        />
      </div>
    </div>
  );
}
