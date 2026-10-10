"use client";

import { useState, type FormEvent } from "react";
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
import { useTeacherMode } from "./TeacherModeProvider";

interface TeacherCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: (code: string) => void;
  description?: string;
}

export function TeacherCodeDialog({
  open,
  onOpenChange,
  onUnlocked,
  description = "Enter the classroom code to show class progress on 6–8 lessons.",
}: TeacherCodeDialogProps) {
  const { unlock } = useTeacherMode();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
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
      onUnlocked?.(trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCode("");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Teacher mode</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Checking…" : "Open"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
