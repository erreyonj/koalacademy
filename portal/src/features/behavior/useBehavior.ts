"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import {
  adjustMarbles,
  fetchRoster,
  moveStudent,
  removeStudent,
  setPrize,
} from "./api";
import { COHORTS, type BehaviorStudent, type Cohort } from "./types";

export type BehaviorStatus = "locked" | "loading" | "ready" | "error";

export interface BehaviorValue {
  status: BehaviorStatus;
  error: string | null;
  students: BehaviorStudent[];
  byCohort: Map<Cohort, BehaviorStudent[]>;
  refresh: () => Promise<void>;
  adjust: (id: string, delta: 1 | -1) => void;
  move: (id: string, cohort: Cohort) => Promise<void>;
  remove: (id: string) => Promise<void>;
  togglePrize: (id: string) => void;
  dismissError: () => void;
}

function replaceStudent(
  list: BehaviorStudent[],
  next: BehaviorStudent,
): BehaviorStudent[] {
  return list.map((item) => (item.id === next.id ? next : item));
}

/**
 * Roster + marble state for the tracker, keyed off the Teacher Mode code.
 * Every mutation is optimistic: the tile updates immediately, the RPC runs,
 * and the server row (or the pre-click row on failure) wins afterwards.
 */
export function useBehavior(): BehaviorValue {
  const { ready, code } = useTeacherMode();
  const [students, setStudents] = useState<BehaviorStudent[]>([]);
  const [status, setStatus] = useState<BehaviorStatus>("locked");
  const [error, setError] = useState<string | null>(null);
  // Serialises +/- taps per student so a quick double tap cannot land out of
  // order and resolve to the wrong server value.
  const queues = useRef(new Map<string, Promise<unknown>>());

  const refresh = useCallback(async () => {
    if (!code) return;
    setStatus((current) => (current === "ready" ? current : "loading"));
    try {
      const rows = await fetchRoster(code);
      setStudents(rows);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not load the roster.");
    }
  }, [code]);

  useEffect(() => {
    if (!ready) return;
    if (!code) {
      setStudents([]);
      setStatus("locked");
      setError(null);
      return;
    }
    void refresh();
  }, [ready, code, refresh]);

  const enqueue = useCallback(
    (id: string, task: () => Promise<void>) => {
      const prior = queues.current.get(id) ?? Promise.resolve();
      const next = prior.then(task, task);
      queues.current.set(id, next);
      void next.finally(() => {
        if (queues.current.get(id) === next) queues.current.delete(id);
      });
    },
    [],
  );

  const adjust = useCallback(
    (id: string, delta: 1 | -1) => {
      if (!code) return;
      let before: BehaviorStudent | undefined;
      setStudents((prev) => {
        before = prev.find((item) => item.id === id);
        if (!before) return prev;
        return replaceStudent(prev, { ...before, marbles: before.marbles + delta });
      });
      setError(null);
      enqueue(id, async () => {
        try {
          const row = await adjustMarbles(code, id, delta);
          setStudents((prev) => replaceStudent(prev, row));
        } catch (err) {
          if (before) {
            const snapshot = before;
            setStudents((prev) => replaceStudent(prev, snapshot));
          }
          setError(err instanceof Error ? err.message : "Could not save.");
        }
      });
    },
    [code, enqueue],
  );

  const move = useCallback(
    async (id: string, cohort: Cohort) => {
      if (!code) return;
      const before = students.find((item) => item.id === id);
      if (!before) return;
      setStudents((prev) => replaceStudent(prev, { ...before, cohort }));
      setError(null);
      try {
        const row = await moveStudent(code, id, cohort);
        setStudents((prev) => replaceStudent(prev, row));
      } catch (err) {
        setStudents((prev) => replaceStudent(prev, before));
        setError(err instanceof Error ? err.message : "Could not move.");
        throw err;
      }
    },
    [code, students],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!code) return;
      const before = students;
      setStudents((prev) => prev.filter((item) => item.id !== id));
      setError(null);
      try {
        await removeStudent(code, id);
      } catch (err) {
        setStudents(before);
        setError(err instanceof Error ? err.message : "Could not remove.");
        throw err;
      }
    },
    [code, students],
  );

  const togglePrize = useCallback(
    (id: string) => {
      if (!code) return;
      const before = students.find((item) => item.id === id);
      if (!before) return;
      const on = !before.prize;
      setStudents((prev) => replaceStudent(prev, { ...before, prize: on }));
      setError(null);
      void setPrize(code, id, on)
        .then((row) => setStudents((prev) => replaceStudent(prev, row)))
        .catch((err: unknown) => {
          setStudents((prev) => replaceStudent(prev, before));
          setError(err instanceof Error ? err.message : "Could not save.");
        });
    },
    [code, students],
  );

  const byCohort = useMemo(() => {
    const map = new Map<Cohort, BehaviorStudent[]>();
    for (const cohort of COHORTS) map.set(cohort, []);
    for (const student of students) map.get(student.cohort)?.push(student);
    return map;
  }, [students]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    status,
    error,
    students,
    byCohort,
    refresh,
    adjust,
    move,
    remove,
    togglePrize,
    dismissError,
  };
}
