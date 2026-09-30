import Link from "next/link";
import type { ReactNode } from "react";
import { LessonNav } from "./LessonNav";
import { LessonNotesProvider } from "./LessonNotesProvider";
import { LessonToolbar } from "./LessonToolbar";
import { bandsLabel, getLessonsForBand } from "@/lib/lessons";
import { TeacherLessonIndicator } from "@/features/teacher-progress/TeacherLessonIndicator";
import { BAND_IDS, type LessonWithNeighbours } from "@/lib/types";

interface SlideShellProps extends LessonWithNeighbours {
  children: ReactNode;
}

/**
 * Lesson chrome around MDX. Article lessons stay a scrolling page. Deck
 * lessons (`presentation: deck`) get a compact bar so the stage can fill the
 * projector.
 */
export function SlideShell({ lesson, band, prev, next, children }: SlideShellProps) {
  const isDeck = lesson.presentation === "deck";
  const teacherBand = BAND_IDS.find((id) => lesson.bands.includes(id));
  const context = lesson.component
    ? lesson.unit != null
      ? `Unit ${lesson.unit} · ${lesson.component}`
      : lesson.component
    : lesson.strand
      ? `Strand · ${lesson.strand}`
      : bandsLabel(lesson.bands);

  return (
    <LessonNotesProvider>
      <LessonToolbar slug={lesson.slug} skills={lesson.skills} />

      <header className={isDeck ? "page-hero page-hero-deck" : "page-hero"}>
        <div className="page-hero-inner">
          <p className="eyebrow">
            {lesson.code} · {bandsLabel(lesson.bands)}
          </p>
          <h1 className="page-title">{lesson.title}</h1>
          <p className="page-lede">{lesson.focus}</p>
        </div>
      </header>

      <div className={isDeck ? "section section-lesson section-lesson-deck" : "section section-lesson"}>
        <div className="wrap">
          {teacherBand ? (
            <TeacherLessonIndicator
              band={teacherBand}
              slug={lesson.slug}
              code={lesson.code}
              sequence={getLessonsForBand(teacherBand).map((item) => item.slug)}
            />
          ) : null}
          {isDeck ? null : (
            <div className="deck-screen">
              <span className="lcd">{context}</span>
            </div>
          )}

          <article className={isDeck ? "slide-body slide-body-deck" : "slide-body"}>
            {children}
          </article>

          <LessonNav prev={prev} next={next} />

          <p>
            <Link className="back-link" href={`/grades/${band.id}/`}>
              ← All {band.short} lessons
            </Link>
          </p>
        </div>
      </div>
    </LessonNotesProvider>
  );
}
