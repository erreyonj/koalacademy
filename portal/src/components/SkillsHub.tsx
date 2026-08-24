"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { ListPlus, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  catalogSkills,
  matchLessons,
  skillLabel,
} from "@/lib/skills";
import type { Lesson } from "@/lib/types";

interface SkillsHubProps {
  lessons: Lesson[];
}

function skillsHref(q: string, skill: string) {
  const params = new URLSearchParams();
  const query = q.trim();
  const tag = skill.trim();
  if (query) params.set("q", query);
  if (tag) params.set("skill", tag);
  const qs = params.toString();
  return qs ? `/skills/?${qs}` : "/skills/";
}

export function SkillsHub({ lessons }: SkillsHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchId = useId();
  const qParam = searchParams.get("q") ?? "";
  const skillParam = searchParams.get("skill") ?? "";
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
      router.replace(skillsHref(draft, skillParam), { scroll: false });
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [draft, qParam, router, skillParam]);

  const tags = useMemo(() => catalogSkills(lessons), [lessons]);
  const results = useMemo(
    () => matchLessons(lessons, { q: qParam, skill: skillParam }),
    [lessons, qParam, skillParam]
  );

  const filtered = Boolean(qParam.trim() || skillParam);
  const showClear = Boolean(draft.trim() || skillParam);
  const summary = filtered
    ? `${results.length} of ${lessons.length} lessons`
    : `${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"}`;

  function setSkill(id: string) {
    const next = skillParam === id ? "" : id;
    router.replace(skillsHref(draft, next), { scroll: false });
  }

  function clearFilters() {
    setDraft("");
    router.replace("/skills/", { scroll: false });
  }

  if (!ready) return <SkillsHubFallback />;

  return (
    <div className="skills-page">
      <header className="skills-hero">
        <div className="skills-hero-inner">
          <p className="eyebrow">Skills</p>
          <h1 className="page-title">Find a topic</h1>
          <form
            className="skills-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              router.replace(skillsHref(draft, skillParam), { scroll: false });
            }}
          >
            <label className="sr-only" htmlFor={searchId}>
              Search skills and lessons
            </label>
            <Search className="skills-search-icon" aria-hidden="true" />
            <Input
              id={searchId}
              className="skills-search-input focus-visible:border-transparent focus-visible:ring-0"
              type="search"
              value={draft}
              placeholder="Search skills, titles, strands…"
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
          <ul className="skills-chips" aria-label="Skill filters">
            {tags.map((id) => {
              const selected = skillParam === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`skills-chip${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => setSkill(id)}
                  >
                    {skillLabel(id)}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="skills-count">{summary}</p>
        </div>
      </header>

      <div className="section skills-catalog">
        <div className="skills-wrap">
          {results.length === 0 ? (
            <div className="skills-empty" role="status">
              <p>No matching lessons</p>
              <p>
                Nothing in the catalog uses this filter yet. Clear it to see every
                lesson, or pick another skill.
              </p>
            </div>
          ) : (
            <ul className="skills-grid" role="list">
              {results.map((lesson) => (
                <li key={lesson.slug}>
                  <LessonCard lesson={lesson} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Card className="skills-card" size="sm">
      <CardHeader>
        <div className="skills-card-top">
          <p className="skills-card-code">{lesson.code}</p>
          <div className="skills-card-actions">
            <button
              type="button"
              className="skills-icon-btn"
              disabled
              title="Favorite — coming later"
              aria-label={`Favorite ${lesson.title} (coming later)`}
            >
              <Star />
            </button>
            <button
              type="button"
              className="skills-icon-btn"
              disabled
              title="Add to study playlist — coming later"
              aria-label={`Add ${lesson.title} to a study playlist (coming later)`}
            >
              <ListPlus />
            </button>
          </div>
        </div>
        <CardTitle>
          <Link href={`/lessons/${lesson.slug}/`}>{lesson.title}</Link>
        </CardTitle>
        <CardDescription>{lesson.focus}</CardDescription>
      </CardHeader>
      {lesson.skills.length > 0 || lesson.investigate.length > 0 ? (
        <CardContent className="skills-card-meta">
          {lesson.skills.length > 0 ? (
            <ul className="skills-card-tags" aria-label="Skills">
              {lesson.skills.map((id) => (
                <li key={id}>
                  <Link className="skills-card-tag" href={skillsHref("", id)}>
                    {skillLabel(id)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {lesson.investigate.length > 0 ? (
            <ul className="skills-card-links">
              {lesson.investigate.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function SkillsHubFallback() {
  return (
    <div className="skills-page">
      <header className="skills-hero">
        <div className="skills-hero-inner">
          <p className="eyebrow">Skills</p>
          <h1 className="page-title">Find a topic</h1>
          <p className="page-lede">Loading the catalog…</p>
        </div>
      </header>
    </div>
  );
}
