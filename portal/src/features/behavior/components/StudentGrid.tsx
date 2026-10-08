"use client";

import { StudentTile, type StudentTileProps } from "./StudentTile";
import type { BehaviorStudent } from "../types";

interface StudentGridProps extends Omit<StudentTileProps, "student"> {
  students: BehaviorStudent[];
  cohortName: string;
}

export function StudentGrid({ students, cohortName, ...tile }: StudentGridProps) {
  if (students.length === 0) {
    return (
      <div className="empty-note">
        <p>
          No students on the {cohortName} roster yet. Run{" "}
          <code>npm run roster:import</code> in <code>portal/</code> to load the
          class list.
        </p>
      </div>
    );
  }
  return (
    <ul className="student-grid" aria-label={`${cohortName} students`}>
      {students.map((student) => (
        <StudentTile key={student.id} student={student} {...tile} />
      ))}
    </ul>
  );
}
