"use client";

import { COHORTS, COHORT_LABEL, COHORT_NAME, type Cohort } from "../types";

interface CohortBarProps {
  selected: Cohort;
  counts: ReadonlyMap<Cohort, number>;
  onSelect: (cohort: Cohort) => void;
}

/** Top row of class pads: Scholars, KB, KG, 1G, 1B … 5G, 5B. */
export function CohortBar({ selected, counts, onSelect }: CohortBarProps) {
  return (
    <nav className="behavior-cohorts" aria-label="Choose a class">
      {COHORTS.map((cohort) => {
        const active = cohort === selected;
        return (
          <button
            key={cohort}
            type="button"
            className={`behavior-cohort${active ? " is-selected" : ""}`}
            aria-pressed={active}
            aria-label={`${COHORT_NAME[cohort]}, ${counts.get(cohort) ?? 0} students`}
            onClick={() => onSelect(cohort)}
          >
            <span className="led" aria-hidden="true" />
            {COHORT_LABEL[cohort]}
          </button>
        );
      })}
    </nav>
  );
}
