"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { saveCohort, saveReturnPath } from "@/features/behavior/storage";
import { classTotal, cohortGoal, type Cohort } from "@/features/behavior/types";
import { useBehavior } from "@/features/behavior/useBehavior";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";

interface ClassMarblesProps {
  cohort: Cohort;
}

/**
 * Class total (students + pool), same maths as the bucket page.
 * Shows "?" when Teacher Mode is locked; links to the class bucket.
 */
export function ClassMarbles({ cohort }: ClassMarblesProps) {
  const pathname = usePathname();
  const { unlocked } = useTeacherMode();
  const behavior = useBehavior();

  const total = useMemo(() => {
    if (behavior.status !== "ready") return null;
    const students = behavior.byCohort.get(cohort) ?? [];
    return classTotal(students) + (behavior.pools.get(cohort) ?? 0);
  }, [cohort, behavior.status, behavior.byCohort, behavior.pools]);

  const goal = cohortGoal(cohort);
  const shown = total === null ? "?" : String(total);
  const hint = !unlocked
    ? "Unlock Teacher Mode to see the count."
    : behavior.status === "loading"
      ? "Loading…"
      : "Open the class bucket";

  return (
    <Link
      href="/buckets/"
      className={`homeroom-marbles is-link${total === null ? " is-unknown" : ""}`}
      aria-label={`Class marbles: ${shown} of ${goal}. Open the class bucket`}
      title={hint}
      onClick={() => {
        saveCohort(cohort);
        saveReturnPath(pathname);
      }}
    >
      <span className="homeroom-marble" aria-hidden="true" />
      <span className="homeroom-marbles-score" aria-live="polite">
        <span className="homeroom-marbles-count">{shown}</span>
        <span className="homeroom-marbles-goal" aria-hidden="true">
          /{goal}
        </span>
      </span>
      <span className="homeroom-marbles-caption">class marbles</span>
    </Link>
  );
}
