"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COHORT_NAME, type Cohort } from "../types";

const MAX_TOTAL = 99999;

interface SetTotalDialogProps {
  cohort: Cohort | null;
  current: number;
  onClose: () => void;
  onSave: (cohort: Cohort, total: number) => Promise<void>;
}

export function SetTotalDialog({ cohort, current, onClose, onSave }: SetTotalDialogProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cohort) {
      setValue(String(current));
      setError(null);
    }
    // Pre-fill only when the dialog opens, not on every live total change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohort]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cohort) return;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError("Enter a whole number, 0 or more.");
      return;
    }
    const total = Number(trimmed);
    if (total > MAX_TOTAL) {
      setError(`The bucket holds at most ${MAX_TOTAL} marbles.`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSave(cohort, total);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the total.");
    } finally {
      setPending(false);
    }
  }

  const name = cohort ? COHORT_NAME[cohort] : "";

  return (
    <AlertDialog open={Boolean(cohort)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="behavior-dialog">
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Set {name} marbles</AlertDialogTitle>
            <AlertDialogDescription>
              The bucket shows exactly this number. Student counters stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_TOTAL}
              step={1}
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Class marbles"
              aria-invalid={Boolean(error)}
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
