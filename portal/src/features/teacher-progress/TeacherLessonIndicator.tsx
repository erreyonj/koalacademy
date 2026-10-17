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
  SCHOLARS_SECTION,
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
  if (grade === SCHOLARS_SECTION) return SCHOLARS_SECTION;
  return `${grade}${house}` as TeacherSection;
}

function parseSection(section: TeacherSection): {
  grade: TeacherGrade;
  house: HousePick;
} {
  if (section === SCHOLARS_SECTION) {
    return { grade: SCHOLARS_SECTION, house: "g" };
  }
  return {
    grade: section[0] as TeacherGrade,
    house: section[1] as HousePick,
  };
}

function wrapIndex(index: number, length: number) {
  return (index + length) % length;
}

function gradeLabel(grade: TeacherGrade) {
  if (grade === "k") return "K";
  if (grade === SCHOLARS_SECTION) return "Scholars";
  return grade;
}

function Knob({
  label,
  valueText,
  angle,
  idle,
  onStep,
}: {
  label: string;
  valueText: string;
  angle: number;
  idle?: boolean;
  onStep: (dir: 1 | -1) => void;
}) {
  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (idle) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onStep(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onStep(-1);
    }
  }

  return (
    <label className={idle ? "teacher-knob-wrap is-idle" : "teacher-knob-wrap"}>
      <span className="teacher-knob-caption">{label}</span>
      <button
        type="button"
        className="teacher-knob"
        disabled={idle}
        aria-label={
          idle
            ? `${label} ignored while Scholars is selected.`
            : `${label}: ${valueText}. Click or use arrows to change.`
        }
        onClick={(event) => {
          if (idle) return;
          onStep(event.shiftKey ? -1 : 1);
        }}
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
  const { unlocked, ready, error, cell, lock, setPhase, setAllPhases, rows } =
    useTeacherMode();
  const [picked, setPicked] = useState<TeacherSection | null>(null);
  const [houseHold, setHouseHold] = useState<HousePick>("g");
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
  const scholarsOn = section === SCHOLARS_SECTION;
  const resumeHouse = scholarsOn ? houseHold : house;
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
    if (next === SCHOLARS_SECTION) {
      if (!scholarsOn) setHouseHold(house);
      setPicked(SCHOLARS_SECTION);
      return;
    }
    setPicked(asSection(next, resumeHouse));
  }

  function setHouse(next: HousePick) {
    setHouseHold(next);
    if (!scholarsOn) setPicked(asSection(grade, next));
  }

  const gradeCenter = (grades.length - 1) / 2;
  const gradeAngle = (grades.indexOf(grade) - gradeCenter) * 36;
  const houseAngle = resumeHouse === "g" ? -36 : 36;

  return (
    <div className="teacher-device-anchor">
      <aside
        className="teacher-device"
        aria-label={`Class progress for ${code}`}
      >
        <div className="teacher-device-head">
          <div className="teacher-device-lcd">
            <span className="lcd">{SECTION_LABEL[section].toUpperCase()}</span>
            <span className="lcd teacher-device-status">{status}</span>
          </div>
          <button
            type="button"
            className="teacher-device-close"
            aria-label="Lock teacher mode"
            onClick={lock}
          >
            X
          </button>
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
            valueText={resumeHouse === "g" ? "Gold" : "Blue"}
            angle={houseAngle}
            idle={scholarsOn}
            onStep={(dir) =>
              setHouse(
                HOUSES[
                  wrapIndex(HOUSES.indexOf(resumeHouse) + dir, HOUSES.length)
                ],
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
