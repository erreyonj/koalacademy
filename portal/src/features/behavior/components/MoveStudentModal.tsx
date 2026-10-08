"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  COHORTS,
  COHORT_LABEL,
  COHORT_NAME,
  displayName,
  type BehaviorStudent,
  type Cohort,
} from "../types";

interface MoveStudentModalProps {
  student: BehaviorStudent | null;
  onClose: () => void;
  onMove: (student: BehaviorStudent, cohort: Cohort) => Promise<void>;
}

export function MoveStudentModal({ student, onClose, onMove }: MoveStudentModalProps) {
  const [choice, setChoice] = useState<Cohort | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChoice(null);
    setError(null);
    setPending(false);
  }, [student?.id]);

  async function confirm() {
    if (!student || !choice) return;
    setPending(true);
    setError(null);
    try {
      await onMove(student, choice);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={Boolean(student)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="behavior-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Move {student ? displayName(student) : "student"}</AlertDialogTitle>
          <AlertDialogDescription>
            Pick the class this student now belongs to. Their marbles come with
            them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="behavior-cohort-pick" role="radiogroup" aria-label="New class">
          {COHORTS.map((cohort) => {
            const current = student?.cohort === cohort;
            const selected = choice === cohort;
            return (
              <button
                key={cohort}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={COHORT_NAME[cohort] + (current ? " (current)" : "")}
                disabled={current}
                className={`behavior-cohort${selected ? " is-selected" : ""}${current ? " is-current" : ""}`}
                onClick={() => setChoice(cohort)}
              >
                <span className="led" aria-hidden="true" />
                {COHORT_LABEL[cohort]}
              </button>
            );
          })}
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!choice || pending} onClick={confirm}>
            {pending ? "Moving…" : choice ? `Move to ${COHORT_LABEL[choice]}` : "Move"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
