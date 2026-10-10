"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { saveCohort, saveReturnPath } from "@/features/behavior/storage";
import { classTotal, type Cohort } from "@/features/behavior/types";
import { useBehavior } from "@/features/behavior/useBehavior";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";

interface ClassMarblesProps {
  cohort: Cohort | null;
  unit: "marbles" | "points";
}

/**
 * Class total (students + pool), same maths as the bucket page.
 * Shows "?" when the class has no bucket yet or Teacher Mode is locked;
 * links to the class bucket once one exists.
 */
export function ClassMarbles({ cohort, unit }: ClassMarblesProps) {
  const pathname = usePathname();
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
        : "Open the class bucket";

  const className = `homeroom-marbles${total === null ? " is-unknown" : ""}`;
  const body = (
    <>
      <span className="homeroom-marble" aria-hidden="true" />
      <span className="homeroom-marbles-count" aria-live="polite">
        {shown}
      </span>
      <span className="homeroom-marbles-caption">class {unit}</span>
    </>
  );

  if (!cohort) {
    return (
      <div className={className} role="status" aria-label={`Class ${unit}: ${shown}`} title={hint}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href="/buckets/"
      className={`${className} is-link`}
      aria-label={`Class ${unit}: ${shown}. Open the class bucket`}
      title={hint}
      onClick={() => {
        saveCohort(cohort);
        saveReturnPath(pathname);
      }}
    >
      {body}
    </Link>
  );
}
