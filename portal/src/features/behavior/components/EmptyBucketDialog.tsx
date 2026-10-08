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
import { COHORT_NAME, type Cohort } from "../types";

interface EmptyBucketDialogProps {
  cohort: Cohort | null;
  onClose: () => void;
  onEmpty: (cohort: Cohort) => Promise<void>;
}

export function EmptyBucketDialog({ cohort, onClose, onEmpty }: EmptyBucketDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!cohort) return;
    setPending(true);
    setError(null);
    try {
      await onEmpty(cohort);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not empty the bucket.");
    } finally {
      setPending(false);
    }
  }

  const name = cohort ? COHORT_NAME[cohort] : "";

  return (
    <AlertDialog open={Boolean(cohort)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="behavior-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Empty the {name} bucket?</AlertDialogTitle>
          <AlertDialogDescription>
            Every student counter in this class resets to 0.
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
            {pending ? "Emptying…" : "Empty bucket"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
