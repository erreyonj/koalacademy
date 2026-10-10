"use client";

import { useCallback, useEffect, useState } from "react";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import { fetchSeating, saveSeating, type SeatAssignments, type SeatingStudent } from "./api";

export type { SeatAssignments, SeatingStudent };

export type SeatingStatus = "locked" | "loading" | "ready" | "error";

export interface SeatingValue {
  status: SeatingStatus;
  error: string | null;
  students: SeatingStudent[];
  saved: SeatAssignments;
  save: (next: SeatAssignments) => Promise<void>;
  nameOf: (id: string) => string;
  dismissError: () => void;
}

/** The name the student goes by: preferred name when set, else first name. */
export function shownName(student: SeatingStudent): string {
  return student.preferred_name?.trim() || student.first_name;
}

/**
 * Seat assignments + this class's roster, keyed off the Teacher Mode code.
 * Locked until the code is entered — names never ship in the static bundle.
 */
export function useSeating(classId: string): SeatingValue {
  const { ready, code } = useTeacherMode();
  const [students, setStudents] = useState<SeatingStudent[]>([]);
  const [saved, setSaved] = useState<SeatAssignments>({});
  const [status, setStatus] = useState<SeatingStatus>("locked");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    setStatus((current) => (current === "ready" ? current : "loading"));
    try {
      const data = await fetchSeating(code, classId);
      setStudents(data.students);
      setSaved(data.seats);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not load seating.");
    }
  }, [code, classId]);

  useEffect(() => {
    if (!ready) return;
    if (!code) {
      setStudents([]);
      setSaved({});
      setStatus("locked");
      setError(null);
      return;
    }
    void load();
  }, [ready, code, load]);

  const save = useCallback(
    async (next: SeatAssignments) => {
      if (!code) return;
      setError(null);
      await saveSeating(code, classId, next);
      setSaved(next);
    },
    [code, classId],
  );

  const nameOf = useCallback(
    (id: string) => {
      const student = students.find((item) => item.id === id);
      return student ? shownName(student) : "?";
    },
    [students],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { status, error, students, saved, save, nameOf, dismissError };
}
