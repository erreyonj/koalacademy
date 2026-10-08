"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTeacherMode } from "@/features/teacher-progress/TeacherModeProvider";
import { nextUnfinishedSlug, type TeacherSection } from "@/features/teacher-progress/types";
import type { BandId } from "@/lib/types";

export interface SequenceEntry {
  slug: string;
  code: string;
  title: string;
}

interface LastLessonLinkProps {
  band: BandId;
  section: TeacherSection | null;
  /** Band running order, computed at build time. */
  sequence: SequenceEntry[];
}

/**
 * "Today's →" — the earliest lesson in the band order that this class has
 * not fully finished (any of Lesson / Review / Lab still open). Falls back to
 * the band's lesson list when Teacher Mode is locked or nothing is tracked.
 */
export function LastLessonLink({ band, section, sequence }: LastLessonLinkProps) {
  const { unlocked, rows } = useTeacherMode();

  const target = useMemo(() => {
    if (!unlocked || !section) return null;
    const slug = nextUnfinishedSlug(
      rows,
      section,
      sequence.map((item) => item.slug),
    );
    return sequence.find((item) => item.slug === slug) ?? null;
  }, [unlocked, section, rows, sequence]);

  const href = target ? `/lessons/${target.slug}/` : `/grades/${band}/`;
  const label = target ? target.code : unlocked ? "All lessons" : "Lessons";

  return (
    <Link
      href={href}
      className="homeroom-today"
      title={target ? target.title : "Open the band's lesson list"}
    >
      <span className="homeroom-today-eyebrow">Today&apos;s</span>
      <span className="homeroom-today-code">
        {label}
        <ArrowRight aria-hidden="true" />
      </span>
    </Link>
  );
}
