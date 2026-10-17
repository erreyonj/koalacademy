"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  entryMatches,
  glossaryLessons,
  termsByLetter,
  termsForLesson,
  type GlossaryEntry,
} from "@/lib/glossary";

interface GlossaryHubProps {
  /** Curriculum code → lesson title. Missing codes fall back to the code. */
  titles: Record<string, string>;
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

export function GlossaryHub({ titles }: GlossaryHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchId = useId();
  const qParam = searchParams.get("q") ?? "";
  const lessonParam = searchParams.get("lesson") ?? "";
  const view = searchParams.get("view") === "az" ? "az" : "lesson";
  const [draft, setDraft] = useState(qParam);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
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

  const lessons = useMemo(() => glossaryLessons(), []);
  const visibleLessons = useMemo(
    () =>
      lessons.filter((lesson) =>
        termsForLesson(lesson.code).some((entry) => entryMatches(entry, qParam))
      ),
    [lessons, qParam]
  );
  const selectedTerms = useMemo(() => {
    if (!lessonParam) return [];
    if (!visibleLessons.some((lesson) => lesson.code === lessonParam)) return [];
    return termsForLesson(lessonParam).filter((entry) => entryMatches(entry, qParam));
  }, [lessonParam, qParam, visibleLessons]);
  const letterGroups = useMemo(() => termsByLetter(qParam), [qParam]);

  const filtered = Boolean(qParam.trim());
  const showClear = Boolean(draft.trim() || lessonParam || view === "az");
  const summary =
    view === "az"
      ? `${letterGroups.reduce((sum, group) => sum + group.entries.length, 0)} ${
          letterGroups.reduce((sum, group) => sum + group.entries.length, 0) === 1
            ? "term"
            : "terms"
        }`
      : filtered
        ? `${visibleLessons.length} of ${lessons.length} lessons`
        : `${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"}`;

  function setView(next: "lesson" | "az") {
    router.replace(glossaryHref(draft, lessonParam, next), { scroll: false });
  }

  function setLesson(code: string) {
    const next = lessonParam === code ? "" : code;
    router.replace(glossaryHref(draft, next, "lesson"), { scroll: false });
  }

  function clearFilters() {
    setDraft("");
    router.replace("/tools/glossary/", { scroll: false });
  }

  function titleFor(code: string) {
    return titles[code] || code;
  }

  if (!ready) return <GlossaryHubFallback />;

  const azEmpty = view === "az" && letterGroups.length === 0;
  const lessonEmpty = view === "lesson" && visibleLessons.length === 0;

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
          <p className="skills-count">{summary}</p>
        </div>
      </header>

      <div className="section skills-catalog">
        <div className="skills-wrap">
          {azEmpty || lessonEmpty ? (
            <div className="skills-empty" role="status">
              <p>No matching terms</p>
              <p>
                Nothing in the glossary uses this filter yet. Clear it to see every
                lesson, or try another word.
              </p>
            </div>
          ) : view === "az" ? (
            <div className="glossary-letters">
              {letterGroups.map((group) => (
                <section key={group.letter} aria-labelledby={`glossary-${group.letter}`}>
                  <h2 className="glossary-letter" id={`glossary-${group.letter}`}>
                    {group.letter}
                  </h2>
                  <ul className="skills-grid">
                    {group.entries.map((entry) => (
                      <li key={entry.id}>
                        <TermCard entry={entry} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <>
              <ul className="skills-grid" role="list">
                {visibleLessons.map((lesson) => {
                  const selected = lessonParam === lesson.code;
                  const count = termsForLesson(lesson.code).filter((entry) =>
                    entryMatches(entry, qParam)
                  ).length;
                  return (
                    <li key={lesson.code}>
                      <button
                        type="button"
                        className={`glossary-tile${selected ? " is-selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => setLesson(lesson.code)}
                      >
                        <p className="skills-card-code">{lesson.code}</p>
                        <p className="glossary-tile-title">{titleFor(lesson.code)}</p>
                        <p className="glossary-tile-count">
                          {count} {count === 1 ? "term" : "terms"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {lessonParam && selectedTerms.length > 0 ? (
                <section className="glossary-lesson-terms" aria-labelledby="glossary-lesson-heading">
                  <h2 className="glossary-lesson-heading" id="glossary-lesson-heading">
                    <span className="skills-card-code">{lessonParam}</span>
                    {titleFor(lessonParam)}
                  </h2>
                  <ul className="skills-grid">
                    {selectedTerms.map((entry) => (
                      <li key={entry.id}>
                        <TermCard entry={entry} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="glossary-prompt">Pick a lesson to see its terms.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TermCard({ entry }: { entry: GlossaryEntry }) {
  return (
    <Card className="skills-card" size="sm">
      <CardHeader>
        <p className="skills-card-code">{entry.lessonCode}</p>
        <CardTitle>{entry.term}</CardTitle>
        <CardDescription>{entry.definition}</CardDescription>
      </CardHeader>
    </Card>
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
