"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { playPitch, resume, setClimb } from "../audio";
import {
  type Aim,
  type DifficultyId,
  C_MAJOR,
  FIXED_DT,
  LAUNCH_BAND,
  LAUNCH_SPACING,
  type PitchName,
  PROFILES,
  type RegionId,
  type ShotSample,
  WORLD_H,
  WORLD_W,
  afterLanding,
  aimFromPull,
  chartShot,
  launchVelocity,
  ledgeById,
  ledgesFor,
  pitchAtHeight,
  regionById,
  REGIONS,
  resolveShot,
  restBody,
  step,
} from "../sim";
import type { FrameGesture, GesturePhase } from "../view";
import { SvgNoteheadView } from "./SvgNoteheadView";
import "../notehead.css";

type Phase = GesturePhase;

const DIFFICULTIES: DifficultyId[] = ["easy", "medium", "hard"];

function idleHint(regionId: RegionId): string {
  if (regionId === "stairs") {
    return "Pull back and aim up the stack. More pull reaches the top.";
  }
  if (regionId === "notch") {
    return "Pull back to aim. Toward the pocket, or straight up for the block.";
  }
  return "Pull the band straight down. Match the guide at the apex.";
}

function resultHint(
  regionId: RegionId,
  cleared: boolean,
  pitchOk: boolean,
  landingOk: boolean,
  splitSkills: boolean,
): string {
  if (cleared) {
    if (regionId === "stairs") return "Every step";
    if (regionId === "notch") return "High block";
    return "Locked";
  }
  if (splitSkills && landingOk && !pitchOk) return "Right landing, wrong pitch";
  if (splitSkills && pitchOk && !landingOk) return "Right pitch, missed the landing";
  return "Try again";
}

export function NoteheadApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SvgNoteheadView | null>(null);
  const regionRef = useRef<RegionId>("launch");
  const difficultyRef = useRef<DifficultyId>("easy");
  const phaseRef = useRef<Phase>("idle");
  const aimRef = useRef<Aim>({ power: 0, angle: 0 });
  const bodyRef = useRef(restBody("launch"));
  const visitedRef = useRef<string[]>([]);
  const crossedRef = useRef<PitchName[]>([]);
  const apexRef = useRef(bodyRef.current.y);
  const tRef = useRef(0);
  const originX = useRef(0);
  const originY = useRef(0);

  const [regionId, setRegionId] = useState<RegionId>("launch");
  const [difficulty, setDifficulty] = useState<DifficultyId>("easy");
  const [hint, setHint] = useState(idleHint("launch"));
  const [phase, setPhase] = useState<Phase>("idle");

  const region = regionById(regionId);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new SvgNoteheadView();
    view.mount(host);
    viewRef.current = view;

    const paint = () => {
      const sample: ShotSample = {
        t: tRef.current,
        body: bodyRef.current,
        crossedUp: crossedRef.current,
        apexPitch: pitchAtHeight(apexRef.current),
      };
      const aiming =
        phaseRef.current === "pulling" && aimRef.current.power >= 0.08;
      const chart = aiming
        ? chartShot(
            regionRef.current,
            bodyRef.current,
            aimRef.current,
            PROFILES[difficultyRef.current].aimInset,
          )
        : null;
      const gesture: FrameGesture = {
        power: aimRef.current.power,
        angle: aimRef.current.angle,
        phase: phaseRef.current,
        visited: visitedRef.current,
        chart: chart?.points ?? [],
        chartApex: chart?.apex ?? null,
      };
      view.frame(sample, regionById(regionRef.current), gesture);
    };

    const finish = (landedOn: string | null) => {
      setClimb(null);
      const profile = PROFILES[difficultyRef.current];
      const resolved = resolveShot(regionById(regionRef.current), profile, {
        apexPitch: pitchAtHeight(apexRef.current),
        landedOn,
        visited: visitedRef.current,
      });
      const nextPhase: Phase = resolved.cleared ? "sparkle" : "idle";
      if (!landedOn) bodyRef.current = restBody(regionRef.current);
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      setHint(
        resultHint(
          regionRef.current,
          resolved.cleared,
          resolved.pitchOk,
          resolved.landingOk,
          profile.splitSkills,
        ),
      );
      if (resolved.cleared) {
        window.setTimeout(() => {
          if (phaseRef.current === "sparkle") {
            phaseRef.current = "idle";
            setPhase("idle");
          }
        }, 720);
      }
    };

    const tickSim = () => {
      const regionNow = regionRef.current;
      const ledges = ledgesFor(regionNow);
      const rising = bodyRef.current.vy > 0;
      const prevY = bodyRef.current.y;
      const result = step(bodyRef.current, ledges, FIXED_DT);
      bodyRef.current = result.body;
      tRef.current += FIXED_DT;
      if (bodyRef.current.y > apexRef.current) apexRef.current = bodyRef.current.y;
      if (rising) {
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
        bodyRef.current.y < -240 ||
        bodyRef.current.y > WORLD_H + 240 ||
        bodyRef.current.x < -120 ||
        bodyRef.current.x > WORLD_W + 120
      ) {
        finish(null);
        return;
      }
      if (!result.landedId) return;
      const ledge = ledgeById(ledges, result.landedId);
      const sounds =
        ledge &&
        (ledge.kind === "step" ||
          result.landedId === "pocket" ||
          result.landedId === "block");
      if (sounds && ledge) playPitch(ledge.pitch);
      visitedRef.current = [...visitedRef.current, result.landedId];
      const follow = afterLanding(regionNow, bodyRef.current, result.landedId);
      if (follow) {
        bodyRef.current = follow;
        return;
      }
      finish(result.landedId);
    };

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) view.resize(rect.width, rect.height);
    });
    observer.observe(host);

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
      if (phaseRef.current === "flight") {
        acc += dt;
        let guard = 0;
        while (acc >= FIXED_DT && guard < 8 && phaseRef.current === "flight") {
          acc -= FIXED_DT;
          guard += 1;
          tickSim();
        }
      }
      paint();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    const onHide = () => {
      if (document.hidden) setClimb(null);
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      setClimb(null);
      view.unmount();
      viewRef.current = null;
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current === "flight") return;
    resume();
    event.currentTarget.setPointerCapture(event.pointerId);
    originX.current = event.clientX;
    originY.current = event.clientY;
    aimRef.current = { power: 0, angle: 0 };
    phaseRef.current = "pulling";
    setPhase("pulling");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "pulling") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pullX = (event.clientX - originX.current) * (WORLD_W / rect.width);
    const pullY = -(event.clientY - originY.current) * (WORLD_H / rect.height);
    aimRef.current = aimFromPull(
      regionRef.current,
      bodyRef.current.restingOn ?? "",
      pullX,
      pullY,
      PROFILES[difficultyRef.current].aimInset,
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "pulling") return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const aim = aimRef.current;
    aimRef.current = { power: 0, angle: 0 };
    if (aim.power < 0.08) {
      phaseRef.current = "idle";
      setPhase("idle");
      setHint(idleHint(regionRef.current));
      return;
    }
    const resting = bodyRef.current.restingOn ?? "";
    const velocity = launchVelocity(
      regionRef.current,
      resting,
      aim,
      PROFILES[difficultyRef.current].aimInset,
    );
    bodyRef.current = { ...bodyRef.current, ...velocity, restingOn: null };
    crossedRef.current = [];
    visitedRef.current = [];
    apexRef.current = bodyRef.current.y;
    tRef.current = 0;
    phaseRef.current = "flight";
    setPhase("flight");
    setHint("Flying…");
  };

  const selectRegion = (id: RegionId) => {
    regionRef.current = id;
    bodyRef.current = restBody(id);
    aimRef.current = { power: 0, angle: 0 };
    visitedRef.current = [];
    crossedRef.current = [];
    phaseRef.current = "idle";
    setRegionId(id);
    setPhase("idle");
    setHint(idleHint(id));
    setClimb(null);
  };

  const selectDifficulty = (id: DifficultyId) => {
    difficultyRef.current = id;
    setDifficulty(id);
  };

  return (
    <div className="notehead-page" data-testid="notehead-stage" data-region={regionId}>
      <nav className="notehead-regions" aria-label="Regions">
        {REGIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={regionId === entry.id ? "is-on" : ""}
            aria-pressed={regionId === entry.id}
            data-testid={`region-${entry.id}`}
            onClick={() => selectRegion(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>
      <div className="notehead-stage" data-phase={phase}>
        <div className="notehead-hud">
          <button
            type="button"
            className="notehead-goal-btn"
            data-testid="goal-pitch"
            aria-label={`Play goal pitch ${region.goalPitch}`}
            onClick={() => {
              resume();
              playPitch(region.goalPitch);
            }}
          >
            Goal <strong>{region.goalPitch}</strong>
          </button>
          <div className="notehead-difficulty" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((id) => (
              <button
                key={id}
                type="button"
                className={difficulty === id ? "is-on" : ""}
                aria-pressed={difficulty === id}
                data-testid={`difficulty-${id}`}
                onClick={() => selectDifficulty(id)}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
        <div
          className="notehead-scene"
          ref={hostRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <p className="notehead-hint" data-testid="notehead-hint">
          {hint}
        </p>
      </div>
    </div>
  );
}
