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
  resume,
  setAimTone,
  setClimb,
} from "../modules/audio";
import {
  type Borealis,
  exitBandFor,
  seedVisited,
  spawnBorealis,
  stepBorealis,
  tonationPitches,
} from "../modules/borealis";
import {
  type NoteTail,
  spawnNoteTail,
  stepNoteTail,
  TAIL_EIGHTH_ID,
} from "../modules/note-tail";
import { chartShotSolid, resolveMasses } from "../modules/collide";
import {
  allBorealisCollected,
  applyBorealisHeal,
  applyExitBarrierHit,
  applyLandingHit,
  clampHp,
  hullEnabled,
  isHardLanding,
  maxHp,
} from "../modules/health";
import { clearanceBelow } from "../modules/momentum";
import {
  containAgainstExitFrame,
  exitZoneFor,
  exitZoneReady,
  leftFrameThroughExit,
} from "../modules/exit-zone";
import {
  type BeatFlight,
  type BeatId,
  BEAT_ORDER,
  applyWarp,
  bounceOffCrashBlock,
  createRoute,
  launchGoalY,
  liveLedges,
  PROGRESSION,
  repairForBeat,
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
  ANACH_TEACH_Y,
  LAUNCH_BAND,
  LAUNCH_SPACING,
  NOTCH_BLOCK,
  PROFILES,
  SHIP_R,
  WORLD_H,
  WORLD_W,
  aimFromPull,
  isDockableBand,
  isSlopedStep,
  launchVelocity,
  ledgeById,
  pitchAtHeight,
  regionById,
  step,
} from "../modules/sim";
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
import { StoryInterrupt } from "./StoryInterrupt";
import { SvgNoteheadView } from "./SvgNoteheadView";
import "../notehead.css";

type Phase = GesturePhase;

const DIFFICULTIES: DifficultyId[] = ["easy", "medium", "hard"];
const THEME_SRC = "/assets/notehead/notehead-etheral-vibe.wav";
/** Slow-mo while the Launch band snaps and the ship falls out of frame. */
const BREAK_FALL_TIME_SCALE = 0.22;
/**
 * Dev chrome (beat jump pills + under-stage helper text) — on in local/dev
 * by default; set NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT=1 to show in a production
 * build, or =0 to force-hide even in development.
 */
const SHOW_DEV_CHROME =
  process.env.NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT === "1" ||
  (process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_NOTEHEAD_LEVEL_SELECT !== "0");

type JumpFn = (id: BeatId, nextRepair?: ShipRepair) => void;

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
  const [hint, setHint] = useState(PROGRESSION[route.beatId].hint);
  const [phase, setPhase] = useState<Phase>(phaseRef.current);
  const [activeInterrupt, setActiveInterrupt] =
    useState<StoryInterruptData | null>(() => {
      const batch = enterEventsForBeat(route.beatId).flatMap((eventId) => [
        ...interruptsForEvent(eventId),
      ]);
      interruptQueueRef.current = batch.slice(1);
      cutsceneOpenRef.current = batch.length > 0;
      return batch[0] ?? null;
    });
  const music = useThemeMusic(THEME_SRC, false);

  // Start the theme as soon as Launch mounts (boot splash already finished).
  useEffect(() => {
    resume();
    music.start();
  }, [music.start]);

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
  const region = regionById(beat.regionId);
  const tonation = tonationPitches(beatId, region.goalPitch);

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

    const jumpBeat: JumpFn = (id, nextRepair) => {
      const prevId = beatRef.current;
      const repair = nextRepair ?? repairForBeat(id);
      const def = PROGRESSION[id];
      beatRef.current = id;
      repairRef.current = repair;
      bodyRef.current = def.enter(repair);
      warpRef.current = null;
      exitBandRef.current = null;
      borealisRef.current = spawnBorealis(id);
      noteTailRef.current = spawnNoteTail(id);
      timeScaleRef.current = 1;
      aimRef.current = { power: 0, angle: 0 };
      visitedRef.current = seedVisited(id);
      crossedRef.current = [];
      apexRef.current = bodyRef.current.y;
      crossedGoalRef.current = false;
      brokeBandRef.current = false;
      bandBreakRef.current = null;
      crossedExitRef.current = false;
      shotPowerRef.current = 0;
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
        openEnterRef.current(id);
      }
    };
    jumpRef.current = jumpBeat;

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

    const advanceIfClear = (landedOn: string | null): boolean => {
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
      // Launch break-through and Notch crash are escapes/impacts, not wins —
      // skip the star burst. Launch already waited for the slo-mo fall OOB.
      const celebrate =
        def.id !== "launch-teach" && def.id !== "notch-crash";
      if (celebrate) {
        phaseRef.current = "sparkle";
        setPhase("sparkle");
      }
      const cut = () => {
        if (def.next) jumpBeat(def.next, result.repair);
        else {
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
        // Exit tip before Launch Bridge — advance only after the GI dismisses.
        pendingAfterDismissRef.current = cut;
        openInterruptRef.current("notch-calibrate-exit");
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
        noteTail: noteTailRef.current,
        exitZone: exitZoneFor(beatRef.current),
        exitLit: exitZoneReady(beatRef.current, borealisRef.current),
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
          : { body: bodyRef.current, hit: false, massId: null };
      bodyRef.current = solid.body;
      const liveExit = exitZoneFor(beatRef.current);
      let exitBarrierHit = false;
      if (
        liveExit &&
        exitZoneReady(beatRef.current, borealisRef.current) &&
        (!bodyRef.current.restingOn || isSlopedStep(seat))
      ) {
        // Seal the frame except the exit gap once Borealis is gathered.
        const sealed = containAgainstExitFrame(bodyRef.current, liveExit);
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

      if (
        bodyRef.current.y < -240 ||
        bodyRef.current.y > WORLD_H + 240 ||
        bodyRef.current.x < -120 ||
        bodyRef.current.x > WORLD_W + 120
      ) {
        const zone = exitZoneFor(beatRef.current);
        const sealed =
          zone && exitZoneReady(beatRef.current, borealisRef.current);
        if (sealed && leftFrameThroughExit(zone, bodyRef.current)) {
          crossedExitRef.current = true;
          if (advanceIfClear(null)) return;
        }
        if (sealed) {
          // Sealed frame: bounce back instead of losing the Borealis run.
          const bounced = containAgainstExitFrame(bodyRef.current, zone);
          bodyRef.current = bounced.body;
          if (bounced.hit) {
            const prev = hpRef.current;
            const next = applyExitBarrierHit(prev, difficultyRef.current);
            if (next !== prev) {
              stingRef.current = 1;
              playHullHit();
              setHull(next);
              teachHullDamage(prev, next);
              if (next <= 0) {
                setHint("Hull breached");
                jumpBeat(beatRef.current, repairRef.current);
                setHull(maxHp(difficultyRef.current));
              }
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
      // Frequency Bands are always soft. Steps/blocks only tax hull above
      // LANDING_HIT_SPEED. Rock + exit-barrier hits are already speed-gated;
      // exit barriers only deduct on Hard.
      const bandLand = landed?.kind === "band";
      const hardLand =
        Boolean(result.landedId) &&
        !bandLand &&
        isHardLanding(result.impactSpeed);
      const terrainHit = hardLand || solid.hit;
      if (exitBarrierHit) {
        const prev = hpRef.current;
        const next = applyExitBarrierHit(prev, difficultyRef.current);
        if (next !== prev) {
          stingRef.current = 1;
          playHullHit();
          setHull(next);
          teachHullDamage(prev, next);
          if (next <= 0) {
            setHint("Hull breached");
            jumpBeat(beatRef.current, repairRef.current);
            setHull(maxHp(difficultyRef.current));
            return;
          }
        }
      } else if (terrainHit && hullEnabled(difficultyRef.current)) {
        const prev = hpRef.current;
        const next = applyLandingHit(prev, difficultyRef.current);
        stingRef.current = 1;
        if (next !== prev) playHullHit();
        setHull(next);
        teachHullDamage(prev, next);
        if (next <= 0) {
          setHint("Hull breached");
          jumpBeat(beatRef.current, repairRef.current);
          setHull(maxHp(difficultyRef.current));
          return;
        }
      } else if (terrainHit) {
        stingRef.current = 1;
      }

      if (!result.landedId) {
        // Rock bump only — stay in flight.
        return;
      }

      // Landings stay silent — Borealis (and the launch climb ladder) carry pitch.
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
      );
      borealisRef.current = borealisStep.list;
      if (!borealisStep.collected.length) return;
      for (const gem of borealisStep.collected) {
        // After launch-teach, pitched notes come from Borealis only.
        playPitch(gem.pitch);
        if (!visitedRef.current.includes(gem.id)) {
          visitedRef.current = [...visitedRef.current, gem.id];
        }
      }
      if (allBorealisCollected(borealisRef.current)) {
        setHull(applyBorealisHeal(hpRef.current, difficultyRef.current));
        const last = borealisStep.collected[borealisStep.collected.length - 1];
        const planted = last ? exitBandFor(last) : null;
        if (planted) {
          exitBandRef.current = planted;
        }
        if (exitZoneFor(beatRef.current)) {
          setHint("Fly out through the exit");
        }
      }
    };

    /** Note-Tail magnet / collect — same real-time clock as Borealis. */
    const tickNoteTail = (dt: number) => {
      if (dt <= 0 || !noteTailRef.current || noteTailRef.current.collected) {
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
      }
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      setClimb(null);
      setAimTone(null);
      view.unmount();
      viewRef.current = null;
      jumpRef.current = null;
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (cutsceneOpenRef.current) return;
    if (phaseRef.current === "sparkle") return;
    resume();
    music.start();
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
    );
    // New shot replaces current velocity from the live pose.
    bodyRef.current = { ...bodyRef.current, ...velocity, restingOn: null };
    warpRef.current = null;
    timeScaleRef.current = 1;
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
          {BEAT_ORDER.map((id) => (
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
      <div className="notehead-stage" data-phase={phase}>
        <div className="notehead-hud">
          <button
            type="button"
            className="notehead-goal-btn"
            data-testid="goal-pitch"
            data-idle-flash=""
            aria-label={`Play tonation ${tonation.join(" ")}`}
            onClick={() => {
              resume();
              music.start();
              tonation.forEach((pitch, index) => {
                window.setTimeout(() => playPitch(pitch), index * 280);
              });
            }}
          >
            tonation:
            {tonation.map((pitch, index) => (
              <strong key={`${pitch}-${index}`}>
                {pitch.replace(/\d+$/, "")}
                <sub>{pitch.match(/\d+$/)?.[0]}</sub>
              </strong>
            ))}
          </button>
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
            </div>
          )}
          <div
            className="notehead-difficulty"
            role="group"
            aria-label="Difficulty"
          >
            {DIFFICULTIES.map((id) => (
              <button
                key={id}
                type="button"
                className={difficulty === id ? "is-on" : ""}
                aria-pressed={difficulty === id}
                data-testid={`difficulty-${id}`}
                data-idle-flash=""
                onClick={() => {
                  const prevCap = maxHp(difficultyRef.current);
                  difficultyRef.current = id;
                  setDifficulty(id);
                  const cap = maxHp(id);
                  const next =
                    cap === 0 ? 0 : prevCap === 0 ? cap : clampHp(hpRef.current, id);
                  hpRef.current = next;
                  setHp(next);
                }}
              >
                {id}
              </button>
            ))}
          </div>
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
