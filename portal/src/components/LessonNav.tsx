import Link from "next/link";
import type { Lesson } from "@/lib/types";

interface LessonNavProps {
  prev: Lesson | null;
  next: Lesson | null;
}

export function LessonNav({ prev, next }: LessonNavProps) {
  if (!prev && !next) return null;

  return (
    <nav className="lesson-nav" aria-label="Lesson sequence">
      {prev ? (
        <Link className="lesson-nav-link" href={`/lessons/${prev.slug}/`}>
          <span className="lesson-nav-dir">← Previous</span>
          <span className="lesson-nav-title">{prev.title}</span>
        </Link>
      ) : (
        <span className="lesson-nav-link lesson-nav-spacer" aria-hidden="true" />
      )}
      {next ? (
        <Link className="lesson-nav-link lesson-nav-next" href={`/lessons/${next.slug}/`}>
          <span className="lesson-nav-dir">Next →</span>
          <span className="lesson-nav-title">{next.title}</span>
        </Link>
      ) : (
        <span className="lesson-nav-link lesson-nav-spacer" aria-hidden="true" />
      )}
    </nav>
  );
}
