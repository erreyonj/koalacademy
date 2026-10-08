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
import type { BehaviorStudent } from "../types";

const MAX_NAME = 60;

interface PreferredNameDialogProps {
  student: BehaviorStudent | null;
  onClose: () => void;
  onSave: (student: BehaviorStudent, name: string) => Promise<void>;
}

export function PreferredNameDialog({ student, onClose, onSave }: PreferredNameDialogProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setValue(student.preferred_name ?? "");
      setError(null);
    }
  }, [student]);

  async function save(name: string) {
    if (!student) return;
    const trimmed = name.trim();
    if (trimmed.length > MAX_NAME) {
      setError(`Preferred names can be up to ${MAX_NAME} characters.`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSave(student, trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the name.");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void save(value);
  }

  const legal = student
    ? `${student.first_name}${student.last_initial ? ` ${student.last_initial}.` : ""}`
    : "";

  return (
    <AlertDialog open={Boolean(student)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="behavior-dialog">
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Preferred name</AlertDialogTitle>
            <AlertDialogDescription>
              What {legal} goes by. Tiles show this instead of the roster name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2">
            <Input
              type="text"
              autoComplete="off"
              autoFocus
              maxLength={MAX_NAME}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={student?.first_name ?? ""}
              aria-label="Preferred name"
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
            {student?.preferred_name ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void save("")}
              >
                Clear
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
