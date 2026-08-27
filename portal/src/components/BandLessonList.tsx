"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BandComponentToolbar } from "@/components/BandComponentToolbar";
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

function LessonRows({ lessons }: { lessons: Lesson[] }) {
  return (
    <ul className="lesson-list" role="list">
      {lessons.map((lesson) => (
        <li key={lesson.slug}>
          <Link className="lesson-row" href={`/lessons/${lesson.slug}/`}>
            <span className="lesson-row-code">{lesson.code}</span>
            <span className="lesson-row-title">{lesson.title}</span>
            <span className="lesson-row-focus">{lesson.focus}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function BandLessonList({ bandId, lessons }: BandLessonListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const componentParam = searchParams.get("component") ?? "";
  const selectedId = getComponentFilter(componentParam)?.id ?? "";
  const results = useMemo(
    () => filterLessonsByComponent(lessons, selectedId),
    [lessons, selectedId]
  );

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
        <LessonRows lessons={results} />
      )}
    </>
  );
}

export function BandLessonListFallback({ lessons }: { lessons: Lesson[] }) {
  return <LessonRows lessons={lessons} />;
}
