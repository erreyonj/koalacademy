"use client";

import { useMemo } from "react";
import { useTeacherMode } from "./TeacherModeProvider";
import {
  BAND_GRADE_COLS,
  BAND_SECTIONS,
  PHASE_LABEL,
  PHASE_MARK,
  SECTION_LABEL,
  TEACHER_PHASES,
  cellComplete,
  nextUnfinishedSlug,
  type TeacherBandScan,
} from "./types";

interface TeacherProgressGridProps {
  scan: TeacherBandScan;
}

export function TeacherProgressGrid({ scan }: TeacherProgressGridProps) {
  const { cell, setPhase, rows } = useTeacherMode();
  const grades = BAND_GRADE_COLS[scan.band];
  const sections = BAND_SECTIONS[scan.band];
  const sequence = useMemo(
    () => scan.lessons.map((lesson) => lesson.slug),
    [scan.lessons],
  );

  const nextBySection = useMemo(() => {
    return Object.fromEntries(
      sections.map((section) => [
        section,
        nextUnfinishedSlug(rows, section, sequence),
      ]),
    );
  }, [rows, sections, sequence]);

  return (
    <div className="teacher-grid-wrap">
      <h2 className="teacher-grid-band">{scan.label}</h2>
      <p className="teacher-grid-legend">
        {TEACHER_PHASES.map((phase) => (
          <span key={phase}>
            <strong>{PHASE_MARK[phase]}</strong> {PHASE_LABEL[phase]}
          </span>
        ))}
        <span>All three marks a lesson finished for that class.</span>
      </p>
      <table className="teacher-grid">
        <thead>
          <tr>
            <th className="lesson-col" rowSpan={2} scope="col">
              Lesson
            </th>
            {grades.map((grade) => (
              <th key={grade.label} colSpan={2} scope="colgroup">
                {grade.label}
              </th>
            ))}
          </tr>
          <tr>
            {grades.flatMap((grade) => [
              <th key={grade.gold} scope="col">
                G
              </th>,
              <th key={grade.blue} scope="col">
                B
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {scan.lessons.map((lesson) => (
            <tr key={lesson.slug}>
              <th className="lesson-col" scope="row">
                <span className="teacher-grid-code">{lesson.code}</span>
                <span className="teacher-grid-title">{lesson.title}</span>
              </th>
              {sections.map((section) => {
                const flags = cell(section, lesson.slug);
                const done = cellComplete(flags);
                const isNext = nextBySection[section] === lesson.slug;
                return (
                  <td
                    key={section}
                    className={
                      done ? "is-done" : isNext ? "is-next" : undefined
                    }
                  >
                    <div className="teacher-phases">
                      {TEACHER_PHASES.map((phase) => {
                        const pressed = flags[phase];
                        return (
                          <button
                            key={phase}
                            type="button"
                            className="phase-btn"
                            aria-pressed={pressed}
                            aria-label={`${lesson.code} ${SECTION_LABEL[section]} ${PHASE_LABEL[phase]}`}
                            onClick={() =>
                              setPhase(section, lesson.slug, phase)
                            }
                          >
                            {PHASE_MARK[phase]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
