"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TeacherCodeDialog } from "@/features/teacher-progress/TeacherCodeDialog";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import { dropMarble, playChime, playDing, throwMarble } from "../marbleFx";
import {
  COHORTS,
  COHORT_NAME,
  avatarHue,
  classTotal,
  isCohort,
  type BehaviorStudent,
  type Cohort,
} from "../types";
import { useBehavior } from "../useBehavior";
import { CohortBar } from "./CohortBar";
import { MarbleBucket } from "./MarbleBucket";
import { MoveStudentModal } from "./MoveStudentModal";
import { RemoveStudentDialog } from "./RemoveStudentDialog";
import { StudentGrid } from "./StudentGrid";

const COHORT_KEY = "ka-behavior-cohort";

function loadCohort(): Cohort {
  if (typeof window === "undefined") return COHORTS[0];
  try {
    const stored = window.localStorage.getItem(COHORT_KEY);
    if (stored && isCohort(stored)) return stored;
  } catch {
    // ignore
  }
  return COHORTS[0];
}

export function BehaviorPage() {
  const { ready, unlocked } = useTeacherMode();
  const behavior = useBehavior();
  const [promptOpen, setPromptOpen] = useState(false);
  const [cohort, setCohort] = useState<Cohort>(COHORTS[0]);
  const [moving, setMoving] = useState<BehaviorStudent | null>(null);
  const [removing, setRemoving] = useState<BehaviorStudent | null>(null);
  const [pulse, setPulse] = useState<"in" | "out" | null>(null);
  const bucketRef = useRef<HTMLDivElement>(null);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    setCohort(loadCohort());
  }, []);

  useEffect(() => {
    if (ready && !unlocked) setPromptOpen(true);
  }, [ready, unlocked]);

  const selectCohort = useCallback((next: Cohort) => {
    setCohort(next);
    try {
      window.localStorage.setItem(COHORT_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const students = behavior.byCohort.get(cohort) ?? [];
  const total = useMemo(() => classTotal(students), [students]);
  const counts = useMemo(() => {
    const map = new Map<Cohort, number>();
    for (const [key, list] of behavior.byCohort) map.set(key, list.length);
    return map;
  }, [behavior.byCohort]);

  const flashBucket = useCallback((kind: "in" | "out") => {
    setPulse(kind);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(null), 420);
  }, []);

  useEffect(
    () => () => {
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    },
    [],
  );

  const handleAdjust = useCallback(
    (student: BehaviorStudent, delta: 1 | -1, origin: Element) => {
      behavior.adjust(student.id, delta);
      const hue = avatarHue(student.avatar_seed, student.first_name);
      const bucket = bucketRef.current;
      if (delta === 1) {
        if (bucket) {
          void throwMarble(origin, bucket, hue).then(() => {
            playChime();
            flashBucket("in");
          });
        } else {
          playChime();
        }
      } else {
        playDing();
        flashBucket("out");
        if (bucket) void dropMarble(bucket, hue);
      }
    },
    [behavior, flashBucket],
  );

  if (!ready) {
    return <p className="teacher-grid-status">Opening teacher mode…</p>;
  }

  if (!unlocked) {
    return (
      <>
        <p className="teacher-grid-status">
          The marble tracker stays locked until the classroom code is entered.{" "}
          <button
            type="button"
            className="teacher-unlock-btn"
            onClick={() => setPromptOpen(true)}
          >
            Enter code
          </button>
        </p>
        <TeacherCodeDialog open={promptOpen} onOpenChange={setPromptOpen} />
      </>
    );
  }

  return (
    <div className="behavior">
      <CohortBar selected={cohort} counts={counts} onSelect={selectCohort} />

      <div className="behavior-head">
        <div className="behavior-head-text">
          <h2 className="behavior-cohort-name">{COHORT_NAME[cohort]}</h2>
          <p className="behavior-cohort-meta">
            {students.length} {students.length === 1 ? "student" : "students"}
            {behavior.status === "loading" ? " · loading…" : ""}
          </p>
        </div>
        <MarbleBucket
          ref={bucketRef}
          total={total}
          label={COHORT_NAME[cohort]}
          pulse={pulse}
        />
      </div>

      {behavior.error ? (
        <p className="teacher-grid-error" role="alert">
          {behavior.error}{" "}
          <button type="button" className="teacher-unlock-btn" onClick={behavior.dismissError}>
            Dismiss
          </button>
        </p>
      ) : null}

      {behavior.status === "loading" && students.length === 0 ? (
        <p className="teacher-grid-status">Loading the roster…</p>
      ) : (
        <StudentGrid
          students={students}
          cohortName={COHORT_NAME[cohort]}
          teacher={unlocked}
          onAdjust={handleAdjust}
          onMove={setMoving}
          onRemove={setRemoving}
          onPrize={(student) => behavior.togglePrize(student.id)}
        />
      )}

      <MoveStudentModal
        student={moving}
        onClose={() => setMoving(null)}
        onMove={(student, next) => behavior.move(student.id, next)}
      />
      <RemoveStudentDialog
        student={removing}
        onClose={() => setRemoving(null)}
        onRemove={(student) => behavior.remove(student.id)}
      />
    </div>
  );
}
