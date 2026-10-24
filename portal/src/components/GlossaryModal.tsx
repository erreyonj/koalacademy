"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import { addGlossaryTerm, fetchGlossaryTerms } from "@/lib/glossary-api";
import { termsForLesson, type GlossaryEntry } from "@/lib/glossary";
import { cn } from "@/lib/utils";

interface GlossaryModalProps {
  lessonCode: string;
}

export function GlossaryModal({ lessonCode }: GlossaryModalProps) {
  const { unlocked, code } = useTeacherMode();
  const titleId = useId();
  const termId = useId();
  const definitionId = useId();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setStatus("loading");
    setError(null);
    fetchGlossaryTerms(lessonCode)
      .then((rows) => {
        setEntries(termsForLesson(rows, lessonCode));
        setStatus("ready");
      })
      .catch(() => setStatus("unavailable"));
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!code || saving) return;
    setSaving(true);
    setError(null);
    try {
      const added = await addGlossaryTerm(code, lessonCode, term, definition);
      setEntries((current) => termsForLesson([...current, added], lessonCode));
      setTerm("");
      setDefinition("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that term.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <DialogPrimitive.Trigger asChild>
        <button type="button" className="glossary-hero-link">
          Glossary
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs",
            "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          aria-labelledby={titleId}
          className={cn(
            "glossary-modal fixed top-1/2 left-1/2 z-50 flex max-h-[min(32rem,80vh)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="skills-card-code">{lessonCode}</p>
              <DialogPrimitive.Title id={titleId} className="text-base font-semibold">
                <Link href={`/toolkit/glossary/?lesson=${encodeURIComponent(lessonCode)}`}>
                  Glossary
                </Link>
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="sm">
                Close
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="glossary-modal-list">
            {status === "loading" || status === "idle" ? (
              <p className="glossary-prompt">Loading terms…</p>
            ) : status === "unavailable" ? (
              <p className="glossary-prompt">Glossary isn&apos;t available.</p>
            ) : entries.length === 0 ? (
              <p className="glossary-prompt">No terms for this lesson yet.</p>
            ) : (
              <ul className="glossary-modal-terms">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <p className="glossary-modal-line">
                      <span className="glossary-modal-term">{entry.term}</span>
                      <span className="glossary-modal-dash"> — </span>
                      <span className="glossary-modal-definition">{entry.definition}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {unlocked && code ? (
            <form className="glossary-modal-add" onSubmit={onAdd}>
              <label className="glossary-modal-label" htmlFor={termId}>
                Term
              </label>
              <Input
                id={termId}
                value={term}
                maxLength={80}
                autoComplete="off"
                onChange={(event) => setTerm(event.target.value)}
              />
              <label className="glossary-modal-label" htmlFor={definitionId}>
                Definition
              </label>
              <Input
                id={definitionId}
                value={definition}
                maxLength={400}
                autoComplete="off"
                onChange={(event) => setDefinition(event.target.value)}
              />
              {error ? (
                <p className="glossary-modal-error" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="sm" disabled={saving || !term.trim() || !definition.trim()}>
                {saving ? "Adding…" : "Add term"}
              </Button>
            </form>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
