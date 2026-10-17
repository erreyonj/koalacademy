"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BandComponentToolbar } from "@/components/BandComponentToolbar";
import {
  COHORT_LABEL,
  COHORT_NAME,
  type Cohort,
} from "@/features/behavior/types";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import {
  BAND_SECTIONS,
  lastTaughtSlug,
  type TeacherSection,
} from "@/features/teacher-progress/types";
import {
  filterLessonsByComponent,
  getComponentFilter,
} from "@/lib/components";
import type { BandId, Lesson } from "@/lib/types";

interface BandLessonListProps {
  bandId: BandId;
  lessons: Lesson[];
}

function bandHref(bandId: BandId, component: string) {
  const base = `/grades/${bandId}/`;
  if (!component) return base;
  return `${base}?component=${encodeURIComponent(component)}`;
}

function houseOf(section: TeacherSection): "g" | "b" | "scholars" {
  if (section === "scholars") return "scholars";
  return section.endsWith("b") ? "b" : "g";
}

function LessonRows({
  lessons,
  marksBySlug,
}: {
  lessons: Lesson[];
  marksBySlug?: ReadonlyMap<string, readonly TeacherSection[]>;
}) {
  return (
    <ul className="lesson-list" role="list">
      {lessons.map((lesson) => {
        const marks = marksBySlug?.get(lesson.slug) ?? [];
        return (
          <li key={lesson.slug}>
            <Link className="lesson-row" href={`/lessons/${lesson.slug}/`}>
              <span className="lesson-row-code">{lesson.code}</span>
              <span className="lesson-row-title">{lesson.title}</span>
              <span className="lesson-row-focus">{lesson.focus}</span>
              {marks.length > 0 ? (
                <span className="lesson-row-marks">
                  {marks.map((section) => {
                    const cohort = section as Cohort;
                    return (
                      <span
                        key={section}
                        className="lesson-row-mark"
                        data-house={houseOf(section)}
                        title={COHORT_NAME[cohort]}
                      >
                        <span className="sr-only">{COHORT_NAME[cohort]} last lesson. </span>
                        <span aria-hidden="true">{COHORT_LABEL[cohort]}</span>
                      </span>
                    );
                  })}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function BandLessonList({ bandId, lessons }: BandLessonListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const componentParam = searchParams.get("component") ?? "";
  const selectedId = getComponentFilter(componentParam)?.id ?? "";
  const { unlocked, rows } = useTeacherMode();
  const results = useMemo(
    () => filterLessonsByComponent(lessons, selectedId),
    [lessons, selectedId]
  );
  const marksBySlug = useMemo(() => {
    const map = new Map<string, TeacherSection[]>();
    if (!unlocked) return map;
    const sequence = lessons.map((lesson) => lesson.slug);
    for (const section of BAND_SECTIONS[bandId]) {
      const slug = lastTaughtSlug(rows, section, sequence);
      if (!slug) continue;
      const list = map.get(slug);
      if (list) list.push(section);
      else map.set(slug, [section]);
    }
    return map;
  }, [unlocked, rows, lessons, bandId]);

  function setComponent(id: string) {
    router.replace(bandHref(bandId, id), { scroll: false });
  }

  return (
    <>
      <BandComponentToolbar selectedId={selectedId} onSelect={setComponent} />

      {results.length === 0 ? (
        <div className="empty-note" role="status">
          <p>Nothing in this band uses this filter yet.</p>
        </div>
      ) : (
        <LessonRows lessons={results} marksBySlug={marksBySlug} />
      )}
    </>
  );
}

export function BandLessonListFallback({ lessons }: { lessons: Lesson[] }) {
  return <LessonRows lessons={lessons} />;
}
