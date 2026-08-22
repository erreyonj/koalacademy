import Link from "next/link";
import type { ReactNode } from "react";
import { LessonNav } from "./LessonNav";
import { LessonToolbar } from "./LessonToolbar";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { bandsLabel } from "@/lib/lessons";
import type { LessonWithNeighbours } from "@/lib/types";

interface SlideShellProps extends LessonWithNeighbours {
  children: ReactNode;
}

/**
 * One lesson, one scrolling page. Not a deck you arrow through: a single page
 * is easier to deep-link and far better on a phone.
 */
export function SlideShell({ lesson, band, prev, next, children }: SlideShellProps) {
  const context = lesson.component
    ? lesson.unit != null
      ? `Unit ${lesson.unit} · ${lesson.component}`
      : lesson.component
    : lesson.strand
      ? `Strand · ${lesson.strand}`
      : bandsLabel(lesson.bands);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <LessonToolbar />
      <SiteHeader activeBand={band.id} />

      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">
            {lesson.code} · {bandsLabel(lesson.bands)}
          </p>
          <h1 className="page-title">{lesson.title}</h1>
          <p className="page-lede">{lesson.focus}</p>
        </div>
      </header>

      <main id="main" className="section section-lesson">
        <div className="wrap">
          <div className="deck-screen">
            <span className="lcd">{context}</span>
          </div>

          <article className="slide-body">{children}</article>

          <LessonNav prev={prev} next={next} />

          <p>
            <Link className="back-link" href={`/grades/${band.id}/`}>
              ← All {band.short} lessons
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
