"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { BandId } from "@/lib/types";
import { useTeacherMode } from "./TeacherModeProvider";
import {
  BAND_DEFAULT_SECTION,
  BAND_GRADES,
  BAND_SECTIONS,
  PHASE_LABEL,
  PHASE_MARK,
  SECTION_LABEL,
  TEACHER_PHASES,
  cellComplete,
  nextUnfinishedSlug,
  type TeacherGrade,
  type TeacherSection,
} from "./types";

interface TeacherLessonIndicatorProps {
  band: BandId;
  slug: string;
  code: string;
  sequence: readonly string[];
}

type HousePick = "g" | "b";

const HOUSES: readonly HousePick[] = ["g", "b"];

function asSection(grade: TeacherGrade, house: HousePick): TeacherSection {
  return `${grade}${house}` as TeacherSection;
}

function parseSection(section: TeacherSection): {
  grade: TeacherGrade;
  house: HousePick;
} {
  return {
    grade: section[0] as TeacherGrade,
    house: section[1] as HousePick,
  };
}

function wrapIndex(index: number, length: number) {
  return (index + length) % length;
}

function gradeLabel(grade: TeacherGrade) {
  return grade === "k" ? "K" : grade;
}

function Knob({
  label,
  valueText,
  angle,
  onStep,
}: {
  label: string;
  valueText: string;
  angle: number;
  onStep: (dir: 1 | -1) => void;
}) {
  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onStep(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onStep(-1);
    }
  }

  return (
    <label className="teacher-knob-wrap">
      <span className="teacher-knob-caption">{label}</span>
      <button
        type="button"
        className="teacher-knob"
        aria-label={`${label}: ${valueText}. Click or use arrows to change.`}
        onClick={(event) => onStep(event.shiftKey ? -1 : 1)}
        onKeyDown={onKey}
      >
        <span className="teacher-knob-face" aria-hidden="true">
          <span
            className="teacher-knob-pointer"
            style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
          />
        </span>
      </button>
    </label>
  );
}

export function TeacherLessonIndicator({
  band,
  slug,
  code,
  sequence,
}: TeacherLessonIndicatorProps) {
  const { unlocked, ready, error, cell, setPhase, setAllPhases, rows } =
    useTeacherMode();
  const [picked, setPicked] = useState<TeacherSection | null>(null);
  const grades = BAND_GRADES[band] as readonly TeacherGrade[];
  const sections = BAND_SECTIONS[band];

  const suggested = useMemo(() => {
    return (
      sections.find(
        (section) => nextUnfinishedSlug(rows, section, sequence) === slug,
      ) ?? BAND_DEFAULT_SECTION[band]
    );
  }, [band, rows, sections, sequence, slug]);

  if (!ready || !unlocked) return null;

  const section =
    picked && (sections as readonly string[]).includes(picked)
      ? picked
      : suggested;
  const { grade, house } = parseSection(section);
  const flags = cell(section, slug);
  const done = cellComplete(flags);
  const noneMarked = !flags.lesson && !flags.review && !flags.lab;
  const nextSlug = nextUnfinishedSlug(rows, section, sequence);
  const isHere = nextSlug === slug;
  const nextPhase = TEACHER_PHASES.find((phase) => !flags[phase]);
  const allDue = isHere && noneMarked;

  let status = "THIS";
  if (done) status = "DONE";
  else if (!isHere && nextSlug) status = nextSlug.replace(/-/g, " ").toUpperCase();
  else if (!isHere) status = "CLEAR";

  function setGrade(next: TeacherGrade) {
    setPicked(asSection(next, house));
  }

  function setHouse(next: HousePick) {
    setPicked(asSection(grade, next));
  }

  const gradeAngle = (grades.indexOf(grade) - 1) * 48;
  const houseAngle = house === "g" ? -36 : 36;

  return (
    <div className="teacher-device-anchor">
      <aside
        className="teacher-device"
        aria-label={`Class progress for ${code}`}
      >
        <div className="teacher-device-lcd">
          <span className="lcd">{SECTION_LABEL[section].toUpperCase()}</span>
          <span className="lcd teacher-device-status">{status}</span>
        </div>
        {error ? (
          <p className="teacher-grid-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="teacher-knobs">
          <Knob
            label="Grade"
            valueText={gradeLabel(grade)}
            angle={gradeAngle}
            onStep={(dir) =>
              setGrade(
                grades[wrapIndex(grades.indexOf(grade) + dir, grades.length)],
              )
            }
          />
          <Knob
            label="House"
            valueText={house === "g" ? "Gold" : "Blue"}
            angle={houseAngle}
            onStep={(dir) =>
              setHouse(
                HOUSES[wrapIndex(HOUSES.indexOf(house) + dir, HOUSES.length)],
              )
            }
          />
        </div>
        <div className="teacher-device-pads">
          {TEACHER_PHASES.map((phase) => {
            const pressed = flags[phase];
            const isDue = isHere && !done && phase === nextPhase;
            return (
              <button
                key={phase}
                type="button"
                className={
                  isDue ? "teacher-device-pad is-due" : "teacher-device-pad"
                }
                aria-pressed={pressed}
                aria-label={`${code} ${SECTION_LABEL[section]} ${PHASE_LABEL[phase]}`}
                onClick={() => setPhase(section, slug, phase)}
              >
                {PHASE_MARK[phase]}
              </button>
            );
          })}
          <button
            type="button"
            className={
              allDue
                ? "teacher-device-pad is-all is-due"
                : "teacher-device-pad is-all"
            }
            aria-pressed={done}
            aria-label={`${code} ${SECTION_LABEL[section]} all phases`}
            onClick={() => setAllPhases(section, slug)}
          >
            ALL
          </button>
        </div>
      </aside>
    </div>
  );
}
