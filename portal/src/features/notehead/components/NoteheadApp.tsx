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
  seedVisited,
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
import {
  containAgainstOpenings,
  exitZoneFor,
  exitZoneReady,
} from "../modules/exit-zone";
import {
  type BeatFlight,
  type BeatId,
  PLAYABLE_BEATS,
  aimModeForBeat,
  applyWarp,
  bounceOffCrashBlock,
  createRoute,
  emptyRouteMemory,
  launchGoalY,
  liveLedges,
  markCrashSeen,
  markStorySeen,
  matchTravelRoute,
  matchZigCornerIntent,
  openingsForBeat,
  PROGRESSION,
  repairForBeat,
  stepPolicyFor,
  type RouteMemory,
  type TravelRoute,
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
  ANACH_TEACH_Y,
  LAUNCH_BAND,
  LAUNCH_SPACING,
  NOTCH_BLOCK,
  PROFILES,
  SHIP_R,
  WORLD_H,
  WORLD_W,
  aimFromPull,
  fromSvgPoint,
  isDockableBand,
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
  challengeFor,
  emptyAttempt,
  emptyRouteTonation,
  INTERVAL_BEATS,
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
  enterEventsForBeat,
  interruptsForEvent,
  type StoryEventId,
  type StoryInterrupt as StoryInterruptData,
} from "../modules/story";
import { HullCueMark } from "./ExitZone";
import { StartScreen } from "./StartScreen";
import { StoryInterrupt } from "./StoryInterrupt";
import { SvgNoteheadView } from "./SvgNoteheadView";
import "../notehead.css";

type Phase = GesturePhase;
type ScreenPhase = "start" | "play";

const THEME_SRC = "/assets/notehead/notehead-etheral-vibe.wav";
/** Slow-mo while the Launch band snaps and the ship falls out of frame. */
const BREAK_FALL_TIME_SCALE = 0.22;
/** Hull-breach shatter before GI / beat restart. */
const HULL_BREACH_MS = 880;
/**
 * Dev chrome (beat jump pills + under-stage helper text) — on in local/dev
 * by default; set NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT=1 to show in a production
 * build, or =0 to force-hide even in development.
 */
const SHOW_DEV_CHROME =
  process.env.NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT === "1" ||
  (process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT !== "0");

type JumpOpts = {
  skipStory?: boolean;
  enterBody?: Body;
};

type JumpFn = (
  id: BeatId,
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
  const anachTeachShownRef = useRef(false);
  const hullHitTeachShownRef = useRef(false);
  const hullBreachTeachShownRef = useRef(false);
  const openInterruptRef = useRef<(id: StoryEventId) => void>(() => {});
  const openEnterRef = useRef<(id: BeatId) => void>(() => {});
  const route = createRoute();
  const beatRef = useRef<BeatId>(route.beatId);
  const repairRef = useRef<ShipRepair>(route.repair);
  const difficultyRef = useRef<DifficultyId>("easy");
  const phaseRef = useRef<Phase>(route.body.restingOn ? "idle" : "flight");
  const aimRef = useRef<Aim>({ power: 0, angle: 0 });
  const bodyRef = useRef<Body>(route.body);
  const visitedRef = useRef<string[]>([]);
  const crossedRef = useRef<PitchName[]>([]);
  const apexRef = useRef(route.body.y);
  const crossedGoalRef = useRef(false);
  const brokeBandRef = useRef(false);
  const bandBreakRef = useRef<{ x: number; y: number } | null>(null);
  const crossedExitRef = useRef(false);
  const shotPowerRef = useRef(0);
  const warpRef = useRef<Ledge | null>(null);
  const exitBandRef = useRef<Ledge | null>(null);
  const borealisRef = useRef<Borealis[]>(spawnBorealis(route.beatId));
  const noteTailRef = useRef<NoteTail | null>(spawnNoteTail(route.beatId));
  const tonationRef = useRef<RouteTonation>(emptyRouteTonation());
  const attemptRef = useRef<IntervalAttempt>(emptyAttempt());
  const healedBeatsRef = useRef<BeatId[]>([]);
  const memoryRef = useRef<RouteMemory>(emptyRouteMemory());
  /** Launch Bridge: arm Notch-return exit only after seating on the band. */
  /** Arms Bridge/Tail lower-left return after seating on the launch band. */
  const returnArmedRef = useRef(false);
  const hpRef = useRef(maxHp("easy"));
  const stingRef = useRef(0);
  const timeScaleRef = useRef(1);
  const tRef = useRef(0);
  const originX = useRef(0);
  const originY = useRef(0);
  const [beatId, setBeatId] = useState<BeatId>(route.beatId);
  const [, setRepair] = useState<ShipRepair>(route.repair);
  const [difficulty, setDifficulty] = useState<DifficultyId>("easy");
  const [hp, setHp] = useState(maxHp("easy"));
  const [tonationValue, setTonationValue] = useState(0);
  const [attemptTick, setAttemptTick] = useState(0);
  const [hint, setHint] = useState(PROGRESSION[route.beatId].hint);
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
    healedBeatsRef.current = [];
    memoryRef.current = emptyRouteMemory();
    attemptRef.current = emptyAttempt();
    setTonationValue(0);
    screenPhaseRef.current = "play";
    setScreenPhase("play");
    resume();
    music.start();
    const batch = enterEventsForBeat(beatRef.current).flatMap((eventId) => [
      ...interruptsForEvent(eventId),
    ]);
    interruptQueueRef.current = batch.slice(1);
    cutsceneOpenRef.current = batch.length > 0;
    setActiveInterrupt(batch[0] ?? null);
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

  const openEnterStory = (id: BeatId) => {
    const batch = enterEventsForBeat(id).flatMap((eventId) => [
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

  const beat = PROGRESSION[beatId];
  const intervalChallenge = challengeFor(beatId);
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

    const flightSnapshot = (landedOn: string | null): BeatFlight => ({
      apexY: apexRef.current,
      crossedGoal: crossedGoalRef.current,
      brokeBand: brokeBandRef.current,
      crossedExit: crossedExitRef.current,
      visited: visitedRef.current,
      landedOn,
      restingOn: bodyRef.current.restingOn,
      power: shotPowerRef.current,
    });

    const setHull = (next: number) => {
      const clamped = clampHp(next, difficultyRef.current);
      hpRef.current = clamped;
      setHp(clamped);
    };

    const syncTonationHud = () => {
      setTonationValue(tonationRef.current.value);
      setAttemptTick((n) => n + 1);
    };

    /** Notch hull tips — once per beat visit, on first damage / first breach. */
    const teachHullDamage = (prev: number, next: number) => {
      if (beatRef.current !== "notch-calibrate" || next >= prev) return;
      if (!hullHitTeachShownRef.current) {
        hullHitTeachShownRef.current = true;
        openInterruptRef.current("notch-calibrate-hull-hit");
      }
      if (next <= 0 && !hullBreachTeachShownRef.current) {
        hullBreachTeachShownRef.current = true;
        openInterruptRef.current("notch-calibrate-hull-breach");
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
          healedBeatsRef.current = [];
          syncTonationHud();
        }
        jumpBeat(beatRef.current, repairRef.current);
        setHull(maxHp(difficultyRef.current));
      };

      window.setTimeout(() => {
        teachHullDamage(prevHp, nextHp);
        if (
          beatRef.current === "notch-calibrate" &&
          (cutsceneOpenRef.current || interruptQueueRef.current.length > 0)
        ) {
          // Keep 0 HP so the hull cue points at empty pips until dismiss.
          pendingAfterDismissRef.current = restart;
          return;
        }
        restart();
      }, HULL_BREACH_MS);
    };

    const jumpBeat: JumpFn = (id, nextRepair, opts) => {
      const prevId = beatRef.current;
      const repair = nextRepair ?? repairForBeat(id);
      const def = PROGRESSION[id];
      beatRef.current = id;
      repairRef.current = repair;
      bodyRef.current = opts?.enterBody ?? def.enter(repair);
      warpRef.current = null;
      exitBandRef.current = null;
      borealisRef.current = spawnBorealis(id);
      attemptRef.current = emptyAttempt();
      syncTonationHud();
      noteTailRef.current = spawnNoteTail(id);
      timeScaleRef.current = 1;
      stopAnachWarp();
      aimRef.current = { power: 0, angle: 0 };
      visitedRef.current = seedVisited(id);
      crossedRef.current = [];
      apexRef.current = bodyRef.current.y;
      crossedGoalRef.current = false;
      brokeBandRef.current = false;
      bandBreakRef.current = null;
      crossedExitRef.current = false;
      shotPowerRef.current = 0;
      returnArmedRef.current = false;
      tRef.current = 0;
      setBeatId(id);
      setRepair(repair);
      setHint(def.hint);
      setClimb(null);
      setAimTone(null);
      const nextPhase: Phase = bodyRef.current.restingOn ? "idle" : "flight";
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      // Same-beat restart (hull breach) keeps teach flags and skips enter CM.
      if (id !== prevId) {
        anachTeachShownRef.current = false;
        hullHitTeachShownRef.current = false;
        hullBreachTeachShownRef.current = false;
        // Drop any in-flight CM/GI from the previous beat so sandbox jumps
        // (and soft returns) never leak dialogue into the next place.
        interruptQueueRef.current = [];
        cutsceneOpenRef.current = false;
        pendingAfterDismissRef.current = null;
        setActiveInterrupt(null);
        const skip =
          opts?.skipStory || memoryRef.current.storySeen.includes(id);
        if (!skip) {
          memoryRef.current = markStorySeen(memoryRef.current, id);
          openEnterRef.current(id);
        }
      }
    };
    jumpRef.current = jumpBeat;

    /** Soft reverse travel into a prior region (skip enter CM when revisited). */
    const takeReturnRoute = (
      to: BeatId,
      enterBody: Body,
      hint: string,
      slowMo = false,
    ) => {
      setHint(hint);
      phaseRef.current = "flight";
      setPhase("flight");
      if (slowMo) timeScaleRef.current = BREAK_FALL_TIME_SCALE;
      jumpBeat(to, repairRef.current, {
        skipStory: true,
        enterBody,
      });
      if (slowMo) {
        timeScaleRef.current = BREAK_FALL_TIME_SCALE;
        window.setTimeout(() => {
          if (beatRef.current === to) timeScaleRef.current = 1;
        }, 900);
      }
    };

    const seatLedges = () => {
      const def = PROGRESSION[beatRef.current];
      return liveLedges(
        def.regionId,
        warpRef.current,
        exitBandRef.current,
      );
    };

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

    const advanceIfClear = (
      landedOn: string | null,
      enterBody?: Body,
    ): boolean => {
      const def = PROGRESSION[beatRef.current];
      const result = def.evaluate(flightSnapshot(landedOn), repairRef.current);
      setHint(result.hint);
      if (!result.cleared) {
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
        return false;
      }
      repairRef.current = result.repair;
      setRepair(result.repair);
      setHint(def.clearHint);
      const firstIntervalClear =
        (INTERVAL_BEATS as readonly string[]).includes(def.id) &&
        !healedBeatsRef.current.includes(def.id);
      if (firstIntervalClear) {
        healedBeatsRef.current = [...healedBeatsRef.current, def.id];
        setHull(
          applyRegionClearHeal(hpRef.current, difficultyRef.current),
        );
      }
      // Launch break-through and Notch crash are escapes/impacts, not wins —
      // skip the star burst. Launch already waited for the slo-mo fall OOB.
      const celebrate =
        def.id !== "launch-teach" && def.id !== "notch-crash";
      if (celebrate) {
        phaseRef.current = "sparkle";
        setPhase("sparkle");
      }
      const cut = () => {
        if (def.id === "notch-crash") {
          memoryRef.current = markCrashSeen(memoryRef.current);
        }
        let nextId = def.next;
        // First Launch break-through always plays the crash intro once.
        if (def.id === "launch-teach") {
          nextId = memoryRef.current.crashSeen
            ? "notch-calibrate"
            : "notch-crash";
        }
        // Warp / alternate exits may override the destination enter pose.
        if (nextId) {
          jumpBeat(
            nextId,
            result.repair,
            enterBody ? { enterBody } : undefined,
          );
        } else {
          phaseRef.current = "idle";
          setPhase("idle");
          setHint("Route clear");
        }
      };
      if (def.id === "launch-teach") {
        cut();
        return true;
      }
      if (def.id === "notch-calibrate") {
        // Exit tip only on the first clear — later trips travel freely.
        if (firstIntervalClear) {
          pendingAfterDismissRef.current = cut;
          openInterruptRef.current("notch-calibrate-exit");
          return true;
        }
        window.setTimeout(cut, 280);
        return true;
      }
      window.setTimeout(cut, celebrate ? 720 : 280);
      return true;
    };

    const paint = () => {
      const def = PROGRESSION[beatRef.current];
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
            def.regionId,
            chartHome
              ? { ...bodyRef.current, restingOn: chartHome }
              : bodyRef.current,
            aimRef.current,
            PROFILES[difficultyRef.current].aimInset,
            aimModeForBeat(beatRef.current),
          )
        : null;
      // Decay the red hit flash between paints.
      stingRef.current = Math.max(0, stingRef.current - 0.018);
      const live = liveLedges(
        def.regionId,
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
        borealisLocked: attemptRef.current.failed,
        noteTail: noteTailRef.current,
        exitZone: exitZoneFor(beatRef.current),
        exitLit: exitZoneReady(beatRef.current),
        bandBreak: bandBreakRef.current,
        clearance: clearanceBelow(bodyRef.current, live),
        sting: stingRef.current,
      };
      view.frame(sample, regionById(def.regionId), gesture);
    };

    const tickSim = () => {
      const def = PROGRESSION[beatRef.current];
      const policy = stepPolicyFor(
        def,
        repairRef.current,
        crossedGoalRef.current,
      );
      // Warp is visual + aim home only while the ship is still flying —
      // colliding with the transient band would kill mid-air aim.
      // Calibrate replaces the pocket wait-band with Borealis.
      let ledges = liveLedges(
        def.regionId,
        phaseRef.current === "pulling" ? null : warpRef.current,
        exitBandRef.current,
      );
      if (beatRef.current === "notch-calibrate") {
        ledges = ledges.filter((ledge) => ledge.id !== "pocket");
      }
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
          ? resolveMasses(bodyRef.current, def.regionId)
          : { body: bodyRef.current, hit: false, massId: null, into: 0 };
      bodyRef.current = solid.body;
      const openings = openingsForBeat(beatRef.current);
      let exitBarrierHit = false;
      // Seal every edge except forward + reverse travel openings.
      if (
        openings.length > 0 &&
        (!bodyRef.current.restingOn || isSlopedStep(seat))
      ) {
        const sealed = containAgainstOpenings(bodyRef.current, openings);
        bodyRef.current = sealed.body;
        exitBarrierHit = sealed.hit;
      }
      if (
        (beatRef.current === "launch-bridge" ||
          beatRef.current === "launch-tail") &&
        bodyRef.current.restingOn === LAUNCH_BAND.id
      ) {
        returnArmedRef.current = true;
      }
      if (warpRef.current) {
        warpRef.current = followWarpBand(
          bodyRef.current,
          warpRef.current.pitch,
        );
      }
      tRef.current += FIXED_DT;
      if (bodyRef.current.y > apexRef.current) apexRef.current = bodyRef.current.y;

      const goalY = launchGoalY();
      if (rising && prevY < goalY && bodyRef.current.y >= goalY) {
        crossedGoalRef.current = true;
      }
      // Anachrometer teach: first rise past the invisible pocket-height gate.
      if (
        beatRef.current === "notch-calibrate" &&
        !anachTeachShownRef.current &&
        rising &&
        prevY < ANACH_TEACH_Y &&
        bodyRef.current.y >= ANACH_TEACH_Y
      ) {
        anachTeachShownRef.current = true;
        openInterruptRef.current("notch-calibrate-first-warp");
      }
      // Climb ladder voice is launch-teach only (the slingshot lesson).
      if (rising && beatRef.current === "launch-teach") {
        for (let index = 0; index < C_MAJOR.pitches.length; index++) {
          const y = LAUNCH_BAND.y + (index + 1) * LAUNCH_SPACING;
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
              if (
                beatRef.current === "launch-teach" &&
                crossedGoalRef.current
              ) {
                // Slo-mo fall while the band break plays; advance on OOB.
                timeScaleRef.current = BREAK_FALL_TIME_SCALE;
                setHint(PROGRESSION["launch-teach"].clearHint);
              }
            }
            brokeBandRef.current = true;
          }
        }
      }

      const takeMatchedRoute = (route: TravelRoute): boolean => {
        if (route.mode === "forward") {
          crossedExitRef.current = true;
          const enter = route.enterBody?.();
          return advanceIfClear(null, enter);
        }
        if (route.softReentry && route.enterBody) {
          // Zig lower-right warp: same beat, keep Borealis / tonation.
          bodyRef.current = route.enterBody();
          phaseRef.current = "flight";
          setPhase("flight");
          setHint("Warping in from the left barrier…");
          return true;
        }
        if (
          (route.mode === "return" || route.mode === "warp") &&
          route.enterBody
        ) {
          const hints: Record<string, string> = {
            "bridge-return-notch": "Falling back into the Notch…",
            "stairs-return-bridge": "Falling back onto the Launch Bridge…",
            "zig-return-stairs-left": "Falling back into the Stairs…",
            "tail-return-zig": "Falling back into Zig…",
          };
          const fallReturns = new Set([
            "bridge-return-notch",
            "stairs-return-bridge",
            "zig-return-stairs-left",
            "tail-return-zig",
          ]);
          takeReturnRoute(
            route.to,
            route.enterBody(),
            hints[route.id] ?? "Returning…",
            fallReturns.has(route.id),
          );
          return true;
        }
        return false;
      };

      // Zig lower corners: cliffs can block true OOB — fire when pressed in.
      if (beatRef.current === "zig-1") {
        const corner = matchZigCornerIntent(bodyRef.current);
        if (corner && takeMatchedRoute(corner)) return;
      }

      if (
        bodyRef.current.y < -240 ||
        bodyRef.current.y > WORLD_H + 240 ||
        bodyRef.current.x < -120 ||
        bodyRef.current.x > WORLD_W + 120
      ) {
        const openings = openingsForBeat(beatRef.current);
        const route = matchTravelRoute(
          beatRef.current,
          bodyRef.current,
          returnArmedRef.current,
        );
        if (route && takeMatchedRoute(route)) return;
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
        if (beatRef.current === "launch-teach") {
          // After break-through, OOB ends the slo-mo fall into Notch.
          advanceIfClear(null);
          return;
        }
        jumpBeat(beatRef.current, repairRef.current);
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

      if (
        beatRef.current === "notch-crash" &&
        result.landedId === NOTCH_BLOCK.id &&
        bodyRef.current.restingOn
      ) {
        bodyRef.current = bounceOffCrashBlock(bodyRef.current);
        return;
      }

      // Soft tread land: stay in flight so slide + lip bounce keep running.
      if (isSlopedStep(landed) && bodyRef.current.restingOn) {
        advanceIfClear(result.landedId);
        return;
      }

      if (!bodyRef.current.restingOn) {
        advanceIfClear(result.landedId);
        return;
      }

      warpRef.current = null;
      timeScaleRef.current = 1;
      stopAnachWarp();
      const cleared = advanceIfClear(result.landedId);
      if (
        !cleared &&
        beatRef.current === "launch-teach" &&
        landed?.kind === "band" &&
        !crossedGoalRef.current
      ) {
        openInterruptRef.current("launch-guide-miss");
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
        attemptRef.current.failed,
      );
      borealisRef.current = borealisStep.list;
      if (!borealisStep.collected.length) return;
      const challenge = challengeFor(beatRef.current);
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
          setHint("Wrong order — exit or retry for Tonation");
          continue;
        }
        if (result.kind === "success") {
          tonationRef.current = awardIfNew(
            tonationRef.current,
            beatRef.current,
            challenge.payout,
          );
          syncTonationHud();
          const planted = exitBandFor(gem);
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
      setHint("Note-Tail recovered");
      advanceIfClear(null);
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
              stepPolicyFor(
                PROGRESSION[beatRef.current],
                repairRef.current,
                crossedGoalRef.current,
              ),
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
      const def = PROGRESSION[beatRef.current];
      const view = svgViewFor(def.regionId);
      const svgX = ((event.clientX - rect.left) / rect.width) * view.w;
      const svgY = ((event.clientY - rect.top) / rect.height) * view.h;
      const logical = fromSvgPoint(svgX, svgY, def.regionId);
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
    const def = PROGRESSION[beatRef.current];
    const home =
      bodyRef.current.restingOn ??
      (warpRef.current ? WARP_BAND_ID : "");
    aimRef.current = aimFromPull(
      def.regionId,
      home,
      pullX,
      pullY,
      PROFILES[difficultyRef.current].aimInset,
      aimModeForBeat(beatRef.current),
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
        setHint(PROGRESSION[beatRef.current].hint);
        return;
      }
      phaseRef.current = "idle";
      setPhase("idle");
      setHint(PROGRESSION[beatRef.current].hint);
      return;
    }
    const def = PROGRESSION[beatRef.current];
    const home =
      bodyRef.current.restingOn ?? (airWarp ? WARP_BAND_ID : "");
    const velocity = launchVelocity(
      def.regionId,
      home,
      aim,
      PROFILES[difficultyRef.current].aimInset,
      aimModeForBeat(beatRef.current),
    );
    // New shot replaces current velocity from the live pose.
    bodyRef.current = { ...bodyRef.current, ...velocity, restingOn: null };
    warpRef.current = null;
    timeScaleRef.current = 1;
    stopAnachWarp();
    shotPowerRef.current = aim.power;
    crossedExitRef.current = false;
    crossedRef.current = [];
    if (
      beatRef.current === "launch-teach" ||
      beatRef.current === "launch-bridge"
    ) {
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
      data-region={beat.regionId}
      data-beat={beatId}
      data-view="portrait"
    >
      {SHOW_DEV_CHROME ? (
        <nav className="notehead-regions" aria-label="Beats">
          {PLAYABLE_BEATS.map((id) => (
            <button
              key={id}
              type="button"
              className={beatId === id ? "is-on" : ""}
              aria-pressed={beatId === id}
              data-testid={`beat-${id}`}
              onClick={() => jumpRef.current?.(id)}
            >
              {PROGRESSION[id].label}
            </button>
          ))}
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
