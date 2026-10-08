"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import { clearReturnPath, loadCohort, saveCohort } from "../storage";
import { COHORTS, COHORT_LABEL, COHORT_NAME, type Cohort } from "../types";

type Step = "code" | "cohort";

/**
 * Dashboard card for Class Buckets. Teacher-only: asks for the teacher code
 * (skipped when already unlocked), then which class to open.
 */
export function BucketsLauncher() {
  const router = useRouter();
  const { unlocked, unlock } = useTeacherMode();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [choice, setChoice] = useState<Cohort>(COHORTS[0]);

  function start() {
    setChoice(loadCohort());
    setStep(unlocked ? "cohort" : "code");
    setCode("");
    setError(null);
    setOpen(true);
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the teacher code.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await unlock(trimmed);
      setCode("");
      setStep("cohort");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock.");
    } finally {
      setPending(false);
    }
  }

  function openBucket() {
    saveCohort(choice);
    clearReturnPath();
    setOpen(false);
    router.push("/buckets/");
  }

  return (
    <>
      <button type="button" className="block h-full w-full text-left" onClick={start}>
        <Card className="h-full border-[3px] border-foreground shadow-[0_5px_0_var(--ka-ink)]">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Buckets</CardTitle>
            <CardDescription>Class marble buckets for Scholars and K–5.</CardDescription>
          </CardHeader>
        </Card>
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="behavior-dialog">
          {step === "code" ? (
            <form onSubmit={submitCode}>
              <AlertDialogHeader>
                <AlertDialogTitle>Teacher mode</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter the classroom code to open Class Buckets.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2 py-2">
                <Input
                  type="password"
                  autoComplete="off"
                  autoFocus
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  aria-label="Teacher code"
                  aria-invalid={Boolean(error)}
                />
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
              <AlertDialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Checking…" : "Next"}
                </Button>
              </AlertDialogFooter>
            </form>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Pick a class</AlertDialogTitle>
                <AlertDialogDescription>
                  The bucket opens on this class. You can switch classes on the page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="behavior-cohort-pick" role="radiogroup" aria-label="Class">
                {COHORTS.map((cohort) => {
                  const selected = choice === cohort;
                  return (
                    <button
                      key={cohort}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={COHORT_NAME[cohort]}
                      className={`behavior-cohort${selected ? " is-selected" : ""}`}
                      onClick={() => setChoice(cohort)}
                      onDoubleClick={() => {
                        setChoice(cohort);
                        saveCohort(cohort);
                        clearReturnPath();
                        setOpen(false);
                        router.push("/buckets/");
                      }}
                    >
                      <span className="led" aria-hidden="true" />
                      {COHORT_LABEL[cohort]}
                    </button>
                  );
                })}
              </div>
              <AlertDialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={openBucket}>
                  Open {COHORT_LABEL[choice]} bucket
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
