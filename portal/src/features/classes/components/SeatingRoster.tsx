import { shownName, type SeatingStudent } from "../useSeating";

interface SeatingRosterProps {
  students: SeatingStudent[];
  seatedIds: ReadonlySet<string>;
  /** True when a seat is waiting for a name. */
  waiting: boolean;
  onPick: (id: string) => void;
}

/** Class roster for the seating editor. Seated names are dimmed. */
export function SeatingRoster({ students, seatedIds, waiting, onPick }: SeatingRosterProps) {
  return (
    <aside className="seating-roster" aria-label="Class roster">
      <h2 className="seating-roster-title">Roster</h2>
      <p className="seating-roster-hint">
        {waiting ? "Pick a name for the highlighted seat." : "Tap a seat, then a name."}
      </p>
      {students.length === 0 ? (
        <p className="seating-roster-empty">No students on this roster yet.</p>
      ) : (
        <ul className="seating-roster-list" role="list">
          {students.map((student) => {
            const seated = seatedIds.has(student.id);
            return (
              <li key={student.id}>
                <button
                  type="button"
                  className={`seating-roster-name${seated ? " is-seated" : ""}`}
                  disabled={!waiting}
                  onClick={() => onPick(student.id)}
                >
                  {shownName(student)}
                  {seated ? <span className="seating-roster-check" aria-hidden="true">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
