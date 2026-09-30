"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLessonNotes } from "./LessonNotesProvider";

interface NotesProps {
  children: ReactNode;
}

/**
 * Teacher script. Not a slide. Portals into the notes panel, which stays closed
 * until the lesson toolbar opens it.
 */
export function Notes({ children }: NotesProps) {
  const { slot, setHasNotes } = useLessonNotes();

  useLayoutEffect(() => {
    setHasNotes(true);
    return () => setHasNotes(false);
  }, [setHasNotes]);

  if (!slot) return null;
  return createPortal(children, slot);
}
