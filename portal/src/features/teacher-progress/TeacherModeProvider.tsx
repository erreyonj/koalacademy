"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchTeacherProgress, setTeacherProgress } from "./api";
import { loadTeacherCode, saveTeacherCode } from "./storage";
import {
  cellComplete,
  emptyCell,
  progressKey,
  rowsToCellMap,
  sectionBand,
  type CellFlags,
  type TeacherPhase,
  type TeacherProgressRow,
  type TeacherSection,
} from "./types";

interface TeacherModeValue {
  ready: boolean;
  unlocked: boolean;
  code: string | null;
  rows: TeacherProgressRow[];
  error: string | null;
  cell: (section: string, slug: string) => CellFlags;
  unlock: (code: string) => Promise<void>;
  setPhase: (
    section: TeacherSection,
    slug: string,
    phase: TeacherPhase,
  ) => void;
  setAllPhases: (section: TeacherSection, slug: string) => void;
}

const TeacherModeContext = createContext<TeacherModeValue | null>(null);

function applyRowTo(
  rows: TeacherProgressRow[],
  row: TeacherProgressRow,
): TeacherProgressRow[] {
  const empty = !row.lesson && !row.review && !row.lab;
  const rest = rows.filter(
    (item) =>
      !(item.section === row.section && item.lesson_slug === row.lesson_slug),
  );
  return empty ? rest : [...rest, row];
}

export function TeacherModeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [rows, setRows] = useState<TeacherProgressRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadTeacherCode();
    if (!stored) {
      setReady(true);
      return;
    }
    void fetchTeacherProgress(stored)
      .then((data) => {
        setCode(stored);
        setRows(data);
      })
      .catch(() => {
        saveTeacherCode(null);
      })
      .finally(() => setReady(true));
  }, []);

  const map = useMemo(() => rowsToCellMap(rows), [rows]);

  const cell = useCallback(
    (section: string, slug: string) => {
      return map.get(progressKey(section, slug)) ?? emptyCell();
    },
    [map],
  );

  const unlock = useCallback(async (nextCode: string) => {
    const data = await fetchTeacherProgress(nextCode);
    saveTeacherCode(nextCode);
    setCode(nextCode);
    setRows(data);
    setError(null);
  }, []);

  const writeProgress = useCallback(
    (
      section: TeacherSection,
      slug: string,
      current: CellFlags,
      next: CellFlags,
      phase: TeacherPhase | "all",
      done: boolean,
    ) => {
      if (!code) return;
      const band = sectionBand(section);
      const optimistic: TeacherProgressRow = {
        band,
        section,
        lesson_slug: slug,
        ...next,
      };
      setRows((prev) => applyRowTo(prev, optimistic));
      setError(null);
      void setTeacherProgress({
        code,
        section,
        lesson: slug,
        phase,
        done,
      })
        .then((row) => setRows((prev) => applyRowTo(prev, row)))
        .catch((err: unknown) => {
          setRows((prev) =>
            applyRowTo(prev, {
              band,
              section,
              lesson_slug: slug,
              ...current,
            }),
          );
          setError(err instanceof Error ? err.message : "Could not save.");
        });
    },
    [code],
  );

  const setPhase = useCallback(
    (section: TeacherSection, slug: string, phase: TeacherPhase) => {
      const current = cell(section, slug);
      const done = !current[phase];
      writeProgress(
        section,
        slug,
        current,
        {
          lesson: phase === "lesson" ? done : current.lesson,
          review: phase === "review" ? done : current.review,
          lab: phase === "lab" ? done : current.lab,
        },
        phase,
        done,
      );
    },
    [cell, writeProgress],
  );

  const setAllPhases = useCallback(
    (section: TeacherSection, slug: string) => {
      const current = cell(section, slug);
      const done = !cellComplete(current);
      writeProgress(
        section,
        slug,
        current,
        { lesson: done, review: done, lab: done },
        "all",
        done,
      );
    },
    [cell, writeProgress],
  );

  const value = useMemo<TeacherModeValue>(
    () => ({
      ready,
      unlocked: Boolean(code),
      code,
      rows,
      error,
      cell,
      unlock,
      setPhase,
      setAllPhases,
    }),
    [ready, code, rows, error, cell, unlock, setPhase, setAllPhases],
  );

  return (
    <TeacherModeContext.Provider value={value}>
      {children}
    </TeacherModeContext.Provider>
  );
}

export function useTeacherMode(): TeacherModeValue {
  const ctx = useContext(TeacherModeContext);
  if (!ctx) {
    throw new Error("useTeacherMode must be used inside TeacherModeProvider.");
  }
  return ctx;
}
