"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import {
  addGlossaryTerm,
  deleteGlossaryTerm,
  fetchGlossaryTerms,
  updateGlossaryTerm,
} from "@/lib/glossary-api";
import {
  entryMatches,
  termsByLetter,
  termsForLesson,
  type GlossaryEntry,
  type GlossaryLesson,
} from "@/lib/glossary";

interface GlossaryHubProps {
  /** 6–8 lessons, in catalog order. */
  catalog: GlossaryLesson[];
}

function glossaryHref(q: string, lesson: string, view: string) {
  const params = new URLSearchParams();
  const query = q.trim();
  const code = lesson.trim();
  if (query) params.set("q", query);
  if (code) params.set("lesson", code);
  if (view === "az") params.set("view", "az");
  const qs = params.toString();
  return qs ? `/tools/glossary/?${qs}` : "/tools/glossary/";
}

export function GlossaryHub({ catalog }: GlossaryHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { unlocked, code: teacherCode } = useTeacherMode();
  const searchId = useId();
  const menuId = useId();
  const qParam = searchParams.get("q") ?? "";
  const lessonParam = searchParams.get("lesson") ?? "";
  const view = searchParams.get("view") === "az" ? "az" : "lesson";
  const [draft, setDraft] = useState(qParam);
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const teacher = unlocked && teacherCode ? teacherCode : null;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchGlossaryTerms()
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraft(qParam);
  }, [qParam]);

  useEffect(() => {
    if (draft === qParam) return;
    const timeout = window.setTimeout(() => {
      router.replace(glossaryHref(draft, lessonParam, view), { scroll: false });
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [draft, lessonParam, qParam, router, view]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  const selected = useMemo(
    () => catalog.find((lesson) => lesson.code === lessonParam) ?? catalog[0] ?? null,
    [catalog, lessonParam]
  );

  const otherLessons = useMemo(
    () => catalog.filter((lesson) => lesson.code !== selected?.code),
    [catalog, selected]
  );

  const selectedTerms = useMemo(() => {
    if (!selected) return [];
    return termsForLesson(entries, selected.code).filter((entry) =>
      entryMatches(entry, qParam)
    );
  }, [entries, qParam, selected]);

  const letterGroups = useMemo(
    () => termsByLetter(entries.filter((entry) => entryMatches(entry, qParam))),
    [entries, qParam]
  );

  const showClear = Boolean(draft.trim() || lessonParam || view === "az");
  const azCount = letterGroups.reduce((sum, group) => sum + group.entries.length, 0);

  function setView(next: "lesson" | "az") {
    setMenuOpen(false);
    router.replace(glossaryHref(draft, selected?.code ?? lessonParam, next), { scroll: false });
  }

  function setLesson(code: string) {
    setMenuOpen(false);
    setAdding(false);
    router.replace(glossaryHref(draft, code, "lesson"), { scroll: false });
  }

  function clearFilters() {
    setDraft("");
    setMenuOpen(false);
    setAdding(false);
    router.replace("/tools/glossary/", { scroll: false });
  }

  function replaceEntry(next: GlossaryEntry) {
    setEntries((current) => current.map((entry) => (entry.id === next.id ? next : entry)));
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  if (!ready) return <GlossaryHubFallback />;

  const azEmpty = status === "ready" && view === "az" && letterGroups.length === 0;

  return (
    <div className="skills-page">
      <header className="skills-hero">
        <div className="skills-hero-inner">
          <p className="eyebrow">Toolkit</p>
          <h1 className="page-title">Glossary</h1>
          <form
            className="skills-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              router.replace(glossaryHref(draft, lessonParam, view), { scroll: false });
            }}
          >
            <label className="sr-only" htmlFor={searchId}>
              Search glossary terms
            </label>
            <Search className="skills-search-icon" aria-hidden="true" />
            <Input
              id={searchId}
              className="skills-search-input focus-visible:border-transparent focus-visible:ring-0"
              type="search"
              value={draft}
              placeholder="Search terms and definitions…"
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
            />
            {showClear ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="skills-clear"
                onClick={clearFilters}
              >
                <X />
                Clear
              </Button>
            ) : null}
          </form>
          <ul className="skills-chips" aria-label="Glossary view">
            <li>
              <button
                type="button"
                className={`skills-chip${view === "lesson" ? " is-selected" : ""}`}
                aria-pressed={view === "lesson"}
                onClick={() => setView("lesson")}
              >
                By lesson
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`skills-chip${view === "az" ? " is-selected" : ""}`}
                aria-pressed={view === "az"}
                onClick={() => setView("az")}
              >
                A–Z
              </button>
            </li>
          </ul>
          {view === "az" ? (
            <p className="skills-count">
              {azCount} {azCount === 1 ? "term" : "terms"}
            </p>
          ) : null}
        </div>
      </header>

      <div className="section skills-catalog">
        <div className="skills-wrap">
          {status === "loading" ? (
            <p className="glossary-prompt">Loading terms…</p>
          ) : status === "unavailable" ? (
            <div className="skills-empty" role="status">
              <p>Glossary isn&apos;t available</p>
              <p>The term list could not be loaded. Try again in a moment.</p>
            </div>
          ) : view === "az" ? (
            azEmpty ? (
              <div className="skills-empty" role="status">
                <p>No matching terms</p>
                <p>Nothing in the glossary uses this filter yet. Clear it, or try another word.</p>
              </div>
            ) : (
              <div className="glossary-letters">
                {letterGroups.map((group) => (
                  <section key={group.letter} aria-labelledby={`glossary-${group.letter}`}>
                    <h2 className="glossary-letter" id={`glossary-${group.letter}`}>
                      {group.letter}
                    </h2>
                    <ul className="glossary-dict">
                      {group.entries.map((entry) => (
                        <DictionaryRow
                          key={entry.id}
                          entry={entry}
                          showLesson
                          teacherCode={teacher}
                          onSaved={replaceEntry}
                          onDeleted={removeEntry}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )
          ) : selected ? (
            <section aria-labelledby="glossary-lesson-heading">
              <div className="glossary-lesson-head" ref={menuRef}>
                <div className="glossary-lesson-title-row">
                  <Link
                    href={`/lessons/${selected.slug}/`}
                    className="glossary-lesson-code"
                    title={`Open ${selected.title}`}
                  >
                    {selected.code}
                  </Link>
                  <button
                    type="button"
                    id="glossary-lesson-heading"
                    className="glossary-pad glossary-lesson-title"
                    aria-expanded={menuOpen}
                    aria-controls={menuId}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    {selected.title}
                  </button>
                </div>
                {menuOpen ? (
                  <ul className="glossary-lesson-menu" id={menuId} role="listbox">
                    {otherLessons.map((lesson) => (
                      <li key={lesson.code}>
                        <button
                          type="button"
                          className="glossary-lesson-option"
                          role="option"
                          onClick={() => setLesson(lesson.code)}
                        >
                          <span className="skills-card-code">{lesson.code}</span>
                          <span>{lesson.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="glossary-lesson-meta">
                  <p className="glossary-lesson-count">
                    {selectedTerms.length} {selectedTerms.length === 1 ? "term" : "terms"}
                  </p>
                  {teacher ? (
                    <button
                      type="button"
                      className="glossary-pad"
                      onClick={() => setAdding((open) => !open)}
                    >
                      Add a definition
                    </button>
                  ) : null}
                </div>
                {teacher && adding ? (
                  <AddTermForm
                    teacherCode={teacher}
                    lessonCode={selected.code}
                    onAdded={(entry) => {
                      setEntries((current) => [...current, entry]);
                      setAdding(false);
                    }}
                    onCancel={() => setAdding(false)}
                  />
                ) : null}
              </div>
              {selectedTerms.length > 0 ? (
                <ul className="glossary-dict">
                  {selectedTerms.map((entry) => (
                    <DictionaryRow
                      key={entry.id}
                      entry={entry}
                      teacherCode={teacher}
                      onSaved={replaceEntry}
                      onDeleted={removeEntry}
                    />
                  ))}
                </ul>
              ) : (
                <p className="glossary-prompt">
                  {qParam.trim()
                    ? "No matching terms in this lesson."
                    : "No terms for this lesson yet."}
                </p>
              )}
            </section>
          ) : (
            <p className="glossary-prompt">No lessons in the catalog yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddTermForm({
  teacherCode,
  lessonCode,
  onAdded,
  onCancel,
}: {
  teacherCode: string;
  lessonCode: string;
  onAdded: (entry: GlossaryEntry) => void;
  onCancel: () => void;
}) {
  const termId = useId();
  const definitionId = useId();
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const added = await addGlossaryTerm(teacherCode, lessonCode, term, definition);
      onAdded(added);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that term.");
      setSaving(false);
    }
  }

  return (
    <form className="glossary-dict-form" onSubmit={onSubmit}>
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
      <div className="glossary-dict-form-actions">
        <Button type="submit" size="sm" disabled={saving || !term.trim() || !definition.trim()}>
          {saving ? "Adding…" : "Add"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DictionaryRow({
  entry,
  showLesson = false,
  teacherCode,
  onSaved,
  onDeleted,
}: {
  entry: GlossaryEntry;
  showLesson?: boolean;
  teacherCode: string | null;
  onSaved: (entry: GlossaryEntry) => void;
  onDeleted: (id: string) => void;
}) {
  const termId = useId();
  const definitionId = useId();
  const [confirming, setConfirming] = useState(false);
  const [term, setTerm] = useState(entry.term);
  const [definition, setDefinition] = useState(entry.definition);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipSave = useRef(false);
  const termRef = useRef(term);
  const definitionRef = useRef(definition);
  termRef.current = term;
  definitionRef.current = definition;

  useEffect(() => {
    setTerm(entry.term);
    setDefinition(entry.definition);
  }, [entry.term, entry.definition]);

  async function persist() {
    if (!teacherCode || busy) return;
    const nextTerm = termRef.current.trim();
    const nextDefinition = definitionRef.current.trim();
    if (nextTerm === entry.term && nextDefinition === entry.definition) {
      setError(null);
      return;
    }
    if (!nextTerm || !nextDefinition) {
      setError("Add a term and a short definition.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await updateGlossaryTerm(teacherCode, entry.id, nextTerm, nextDefinition);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that term.");
    } finally {
      setBusy(false);
    }
  }

  function onBlur() {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    void persist();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    skipSave.current = true;
    setTerm(entry.term);
    setDefinition(entry.definition);
    setError(null);
    event.currentTarget.blur();
  }

  async function onDelete() {
    if (!teacherCode || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteGlossaryTerm(teacherCode, entry.id);
      onDeleted(entry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that term.");
      setBusy(false);
    }
  }

  return (
    <li className="glossary-dict-row">
      {teacherCode ? (
        confirming ? (
          <span className="glossary-dict-confirm">
            <button type="button" onClick={onDelete} disabled={busy}>
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy}>
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="glossary-dict-delete"
            aria-label={`Delete ${entry.term}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 />
          </button>
        )
      ) : null}
      {showLesson ? <span className="glossary-dict-code">{entry.lessonCode}</span> : null}
      {teacherCode ? (
        <>
          <input
            id={termId}
            className="glossary-dict-field is-term"
            aria-label={`Term, ${entry.term}`}
            value={term}
            maxLength={80}
            autoComplete="off"
            disabled={busy}
            onChange={(event) => setTerm(event.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
          <span className="glossary-dict-dash" aria-hidden="true">
            —
          </span>
          <input
            id={definitionId}
            className="glossary-dict-field"
            aria-label={`Definition of ${entry.term}`}
            value={definition}
            maxLength={400}
            autoComplete="off"
            disabled={busy}
            onChange={(event) => setDefinition(event.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        </>
      ) : (
        <p className="glossary-dict-text">
          <span className="glossary-dict-term">{entry.term}</span>
          <span className="glossary-dict-dash"> — </span>
          <span>{entry.definition}</span>
        </p>
      )}
      {error ? (
        <p className="glossary-modal-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function GlossaryHubFallback() {
  return (
    <div className="skills-page">
      <header className="skills-hero">
        <div className="skills-hero-inner">
          <p className="eyebrow">Toolkit</p>
          <h1 className="page-title">Glossary</h1>
          <p className="page-lede">Loading terms…</p>
        </div>
      </header>
    </div>
  );
}
