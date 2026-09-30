"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useLessonNotes } from "./LessonNotesProvider";

export interface SlideProps {
  /** Small label above the idea, e.g. "Mindfulness" or "Listen". */
  kicker?: string;
  /** The one big sentence on the projector. */
  line?: string;
  /** Two or three large prompts instead of one line (Mini Crew, Closing Crew). */
  lines?: string[];
  /** One or two short lines under the idea or under the media. */
  sub?: string | string[];
  /** Rules slide the class can skip once it knows the game. */
  optional?: boolean;
  /** Block name shown in the counter. Set by Section. */
  section?: string;
  /** Optional media — a YouTube embed or Break, not a paragraph. */
  children?: ReactNode;
}

/** One idea. Deck reads these as markers and shows one at a time. */
export function Slide({ kicker, line, lines, sub, children }: SlideProps) {
  const subLines = sub == null ? [] : Array.isArray(sub) ? sub : [sub];

  return (
    <div className="k2-slide">
      {kicker ? <p className="k2-slide-kicker">{kicker}</p> : null}
      {line ? <p className="k2-slide-line">{line}</p> : null}
      {lines && lines.length > 0 ? (
        <ul className="k2-slide-lines">
          {lines.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {children ? <div className="k2-slide-media">{children}</div> : null}
      {subLines.length > 0 ? (
        <div className="k2-slide-sub">
          {subLines.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Flattens Deck children into slides. Section and the shared opening slides
 * are server components, so by the time they reach this client component they
 * are already plain Slide elements (possibly inside a fragment or array).
 */
function collectSlides(children: ReactNode): ReactElement<SlideProps>[] {
  const out: ReactElement<SlideProps>[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type === Fragment) {
      out.push(...collectSlides((child.props as { children?: ReactNode }).children));
      continue;
    }
    if (typeof child.type === "string") continue;
    out.push(child as ReactElement<SlideProps>);
  }
  return out;
}

function readSlideIndex(count: number): number {
  if (typeof window === "undefined" || count < 1) return 0;
  const raw = Number(new URLSearchParams(window.location.search).get("s"));
  if (!Number.isInteger(raw) || raw < 1) return 0;
  return Math.min(count, raw) - 1;
}

function writeSlideParam(index: number) {
  const url = new URL(window.location.href);
  if (index <= 0) url.searchParams.delete("s");
  else url.searchParams.set("s", String(index + 1));
  window.history.replaceState(null, "", url);
}

interface DeckProps {
  children: ReactNode;
}

/** One-idea-per-screen player for K-2, grouped by class block. */
export function Deck({ children }: DeckProps) {
  const slides = collectSlides(children);
  const count = slides.length;
  const { open: notesOpen } = useLessonNotes();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(readSlideIndex(count));
  }, [count]);

  const go = useCallback(
    (next: number) => {
      if (count < 1) return;
      const clamped = Math.max(0, Math.min(count - 1, next));
      setIndex(clamped);
      writeSlideParam(clamped);
    },
    [count],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || notesOpen) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, a, input, textarea, select, [contenteditable=true]")
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, notesOpen]);

  if (count === 0) return null;

  const current = slides[index];
  const { section, optional } = current.props;
  const atStart = index === 0;
  const atEnd = index === count - 1;

  const sectionIndexes = section
    ? slides.flatMap((slide, i) => (slide.props.section === section ? [i] : []))
    : [];
  const sectionPos = sectionIndexes.indexOf(index) + 1;

  let skipTo = -1;
  if (optional) {
    skipTo = slides.findIndex((slide, i) => i > index && !slide.props.optional);
  }

  const visibleCount = section
    ? sectionIndexes.length > 1
      ? `${section} · ${sectionPos} / ${sectionIndexes.length}`
      : section
    : `${index + 1} / ${count}`;

  return (
    <div className="k2-deck">
      <div
        className="k2-deck-stage"
        role="group"
        aria-roledescription="slide"
        aria-label={`Slide ${index + 1} of ${count}${section ? `, ${section}` : ""}`}
      >
        {current}
      </div>
      <nav className="k2-deck-controls" aria-label="Slides">
        <button
          type="button"
          className="k2-deck-btn"
          disabled={atStart}
          onClick={() => go(index - 1)}
        >
          Back
        </button>
        <p className="k2-deck-count" aria-live="polite">
          <span className="sr-only">
            Slide {index + 1} of {count}
            {section ? `, ${section}` : ""}
          </span>
          <span aria-hidden="true">{visibleCount}</span>
        </p>
        <div className="k2-deck-forward">
          {skipTo > 0 ? (
            <button
              type="button"
              className="k2-deck-btn k2-deck-btn-skip"
              onClick={() => go(skipTo)}
            >
              Skip rules
            </button>
          ) : null}
          <button
            type="button"
            className="k2-deck-btn k2-deck-btn-next"
            disabled={atEnd}
            onClick={() => go(index + 1)}
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
}
