"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { COHORT_NAME, displayName, type BehaviorStudent } from "../types";

interface RemoveStudentDialogProps {
  student: BehaviorStudent | null;
  onClose: () => void;
  onRemove: (student: BehaviorStudent) => Promise<void>;
}

/** One confirm step so a stray tap on the menu cannot drop a student. */
export function RemoveStudentDialog({ student, onClose, onRemove }: RemoveStudentDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!student) return;
    setPending(true);
    setError(null);
    try {
      await onRemove(student);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={Boolean(student)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="behavior-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {student ? displayName(student) : "student"}?</AlertDialogTitle>
          <AlertDialogDescription>
            Use this when a student has left the school. They come off the{" "}
            {student ? COHORT_NAME[student.cohort] : ""} roster right away.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? "Removing…" : "Remove"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
