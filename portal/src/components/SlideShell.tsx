import Link from "next/link";
import type { ReactNode } from "react";
import { LedText } from "@/components/LedText";
import { GlossaryModal } from "./GlossaryModal";
import { LessonNav } from "./LessonNav";
import { LessonNotesProvider } from "./LessonNotesProvider";
import { LessonToolbar } from "./LessonToolbar";
import { glossaryCodeForLesson } from "@/lib/glossary";
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
  const glossaryCode = glossaryCodeForLesson(lesson);
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
          <LedText
            as="p"
            className="eyebrow"
            text={`${lesson.code} · ${bandsLabel(lesson.bands)}`}
          />
          <LedText as="h1" className="page-title" text={lesson.title} />
          <LedText as="p" className="page-lede" text={lesson.focus} />
          {glossaryCode ? <GlossaryModal lessonCode={glossaryCode} /> : null}
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
