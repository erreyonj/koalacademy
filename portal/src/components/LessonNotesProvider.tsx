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

interface LessonNotesValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  hasNotes: boolean;
  setHasNotes: (hasNotes: boolean) => void;
  slot: HTMLElement | null;
}

const LessonNotesContext = createContext<LessonNotesValue | null>(null);

export function useLessonNotes(): LessonNotesValue {
  const value = useContext(LessonNotesContext);
  if (!value) {
    throw new Error("useLessonNotes must be used inside LessonNotesProvider.");
  }
  return value;
}

/**
 * Holds the teacher-notes panel so MDX `<Notes>` can portal into it, and so the
 * lesson toolbar can open it. Closed on load — projected decks never start on
 * the script.
 */
export function LessonNotesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const slotRef = useCallback((node: HTMLDivElement | null) => {
    setSlot(node);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const value = useMemo(
    () => ({ open, setOpen, hasNotes, setHasNotes, slot }),
    [open, hasNotes, slot],
  );

  return (
    <LessonNotesContext.Provider value={value}>
      {children}
      {hasNotes ? (
        <>
          {open ? (
            <button
              type="button"
              className="k2-notes-overlay"
              aria-label="Close teacher notes"
              onClick={() => setOpen(false)}
            />
          ) : null}
          <aside
            className="k2-notes"
            hidden={!open}
            inert={!open ? true : undefined}
            aria-hidden={!open}
            aria-label="Teacher notes"
          >
            <header className="k2-notes-head">
              <p className="eyebrow">Teacher notes</p>
              <button
                type="button"
                className="k2-notes-close"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>
            <div ref={slotRef} className="k2-notes-body slide-body" />
          </aside>
        </>
      ) : null}
    </LessonNotesContext.Provider>
  );
}
