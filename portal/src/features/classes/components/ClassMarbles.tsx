"use client";

import { useMemo } from "react";
import { classTotal, type Cohort } from "@/features/behavior/types";
import { useBehavior } from "@/features/behavior/useBehavior";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";

interface ClassMarblesProps {
  cohort: Cohort | null;
  unit: "marbles" | "points";
}

/**
 * Read-only class total (students + pool), same maths as the bucket page.
 * Shows "?" when the class has no bucket yet or Teacher Mode is locked.
 */
export function ClassMarbles({ cohort, unit }: ClassMarblesProps) {
  const { unlocked } = useTeacherMode();
  const behavior = useBehavior();

  const total = useMemo(() => {
    if (!cohort || behavior.status !== "ready") return null;
    const students = behavior.byCohort.get(cohort) ?? [];
    return classTotal(students) + (behavior.pools.get(cohort) ?? 0);
  }, [cohort, behavior.status, behavior.byCohort, behavior.pools]);

  const shown = total === null ? "?" : String(total);
  const hint = !cohort
    ? "Class points are coming soon."
    : !unlocked
      ? "Unlock Teacher Mode to see the count."
      : behavior.status === "loading"
        ? "Loading…"
        : undefined;

  return (
    <div
      className={`homeroom-marbles${total === null ? " is-unknown" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`Class ${unit}: ${shown}`}
      title={hint}
    >
      <span className="homeroom-marble" aria-hidden="true" />
      <span className="homeroom-marbles-count">{shown}</span>
      <span className="homeroom-marbles-caption">class {unit}</span>
    </div>
  );
}
