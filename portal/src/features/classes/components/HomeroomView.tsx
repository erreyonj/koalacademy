"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TeacherCodeDialog } from "@/features/teacher-progress/TeacherCodeDialog";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import type { SeatAssignments } from "../api";
import type { ClassEntry } from "../registry";
import type { SeatKey } from "../seating";
import { shownName, useSeating } from "../useSeating";
import { ClassMarbles } from "./ClassMarbles";
import { HomeroomMenu } from "./HomeroomMenu";
import { LastLessonLink, type SequenceEntry } from "./LastLessonLink";
import { NowPlaying } from "./NowPlaying";
import { QuickInfoTicker } from "./QuickInfoTicker";
import { SeatingChart } from "./SeatingChart";
import { SeatingRoster } from "./SeatingRoster";

interface HomeroomViewProps {
  entry: ClassEntry;
  sequence: SequenceEntry[];
}

function sameSeats(a: SeatAssignments, b: SeatAssignments): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key as SeatKey] !== b[key as SeatKey]) return false;
  }
  return true;
}

/**
 * The screen that is up when a class walks in. Laid out like the sketch:
 * menu top-left, the player "screen" and ticker up top, tables in the middle,
 * marbles bottom-left and "Today's →" bottom-right.
 */
export function HomeroomView({ entry, sequence }: HomeroomViewProps) {
  const { unlocked } = useTeacherMode();
  const seating = useSeating(entry.id);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SeatAssignments>({});
  const [selected, setSelected] = useState<SeatKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = editing && !sameSeats(draft, seating.saved);

  const startEdit = useCallback((saved: SeatAssignments) => {
    setDraft({ ...saved });
    setSelected(null);
    setSaveError(null);
    setEditing(true);
  }, []);

  function handleEditSeating() {
    if (!unlocked) {
      setPendingEdit(true);
      setPromptOpen(true);
      return;
    }
    if (seating.status !== "ready") {
      setPendingEdit(true);
      return;
    }
    startEdit(seating.saved);
  }

  useEffect(() => {
    if (!pendingEdit || seating.status !== "ready") return;
    startEdit(seating.saved);
    setPendingEdit(false);
  }, [pendingEdit, seating.status, seating.saved, startEdit]);

  useEffect(() => {
    if (!editing || !dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link) return;
      if (!window.confirm("Discard seating changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [editing, dirty]);

  function handleSeatClick(key: SeatKey) {
    if (selected === key && draft[key]) {
      setDraft((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSelected(null);
      return;
    }
    setSelected(key);
  }

  function handlePick(id: string) {
    if (!selected) return;
    setDraft((prev) => {
      const next: SeatAssignments = {};
      for (const [key, studentId] of Object.entries(prev)) {
        if (studentId !== id) next[key as SeatKey] = studentId;
      }
      next[selected] = id;
      return next;
    });
    setSelected(null);
  }

  function handleCancel() {
    setDraft({ ...seating.saved });
    setSelected(null);
    setSaveError(null);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await seating.save(draft);
      setSelected(null);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const source = editing ? draft : seating.saved;
  const assignments = useMemo(() => {
    const names: Record<SeatKey, string> = {} as Record<SeatKey, string>;
    for (const [key, id] of Object.entries(source)) {
      names[key as SeatKey] = seating.nameOf(id);
    }
    return names;
  }, [source, seating]);

  const seatedIds = useMemo(() => new Set(Object.values(source)), [source]);
  const unseated = seating.students.filter((student) => !seatedIds.has(student.id));
  const locked = seating.status === "locked";
  const hasAssignments = Object.keys(source).length > 0;

  return (
    <div className="homeroom">
      <div className="homeroom-top">
        <HomeroomMenu className={entry.name} onEditSeating={handleEditSeating} />
        <div className="homeroom-top-center">
          <NowPlaying />
          <QuickInfoTicker />
        </div>
        <div className="homeroom-top-right">
          <span className="homeroom-class-pad" aria-label={entry.name}>
            {entry.label}
          </span>
        </div>
      </div>

      <div className={`homeroom-floor${editing ? " is-editing" : ""}`}>
        {editing ? (
          <SeatingRoster
            students={seating.students}
            seatedIds={seatedIds}
            waiting={selected !== null}
            onPick={handlePick}
          />
        ) : null}
        <div className="homeroom-floor-room">
          <SeatingChart
            className={entry.name}
            assignments={assignments}
            editing={editing}
            selectedKey={selected}
            onSeatClick={handleSeatClick}
          />
          {locked ? (
            <p className="homeroom-locked-hint">Unlock teacher mode to show seats</p>
          ) : null}
          {!locked && hasAssignments && unseated.length ? (
            <p className="homeroom-unseated">
              <span className="homeroom-unseated-label">Choose a seat:</span>{" "}
              {unseated.map((student) => shownName(student)).join(", ")}
            </p>
          ) : null}
          {seating.error && !editing ? (
            <p className="homeroom-locked-hint" role="alert">
              {seating.error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="homeroom-bottom">
        <ClassMarbles cohort={entry.marbleCohort} unit={entry.unit} />
        <div className="homeroom-bottom-right">
          {editing ? (
            <div className="homeroom-edit-actions">
              {saveError ? (
                <p className="homeroom-save-error" role="alert">
                  {saveError}
                </p>
              ) : null}
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!dirty || saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : null}
          <LastLessonLink band={entry.band} section={entry.section} sequence={sequence} />
        </div>
      </div>

      <TeacherCodeDialog
        open={promptOpen}
        onOpenChange={(open) => {
          setPromptOpen(open);
          if (!open) setPendingEdit(false);
        }}
        description="Enter the classroom code to edit this class's seating chart."
      />
    </div>
  );
}
