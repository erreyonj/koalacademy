import type { CSSProperties } from "react";
import {
  ROOM,
  SEAT_SIDES,
  seatKey,
  type RoomTable,
  type SeatKey,
} from "../seating";

interface SeatingChartProps {
  className: string;
  /** Seat key → display name. Missing keys are empty. */
  assignments: Partial<Record<SeatKey, string>>;
  editing?: boolean;
  selectedKey?: SeatKey | null;
  onSeatClick?: (key: SeatKey) => void;
}

/**
 * The room as seen from the TV. Furniture is a fixed size (in 1:2 table
 * units) and every seat slot is drawn, so open seats read as open.
 */
export function SeatingChart({
  className,
  assignments,
  editing = false,
  selectedKey = null,
  onSeatClick,
}: SeatingChartProps) {
  const filled = Object.keys(assignments).length;
  return (
    <div
      className="seating-room"
      aria-label={filled ? `${className} seating chart` : `${className} room — choose a seat`}
    >
      {ROOM.map((table) => (
        <Table
          key={table.id}
          table={table}
          assignments={assignments}
          editing={editing}
          selectedKey={selectedKey}
          onSeatClick={onSeatClick}
          prompt={!filled && table.id === "middle" ? "Choose A Seat!" : null}
        />
      ))}
    </div>
  );
}

function Table({
  table,
  assignments,
  editing,
  selectedKey,
  onSeatClick,
  prompt,
}: {
  table: RoomTable;
  assignments: Partial<Record<SeatKey, string>>;
  editing: boolean;
  selectedKey: SeatKey | null;
  onSeatClick?: (key: SeatKey) => void;
  prompt: string | null;
}) {
  const sides = SEAT_SIDES.map((side) => ({
    side,
    slots: Array.from({ length: table.seats[side] }, (_, i) => {
      const key = seatKey(table.id, side, i);
      return { key, name: assignments[key] ?? null };
    }),
  }));
  const names = sides.flatMap(({ slots }) =>
    slots.map((slot) => slot.name).filter((name): name is string => !!name),
  );
  const style = { gridArea: table.id, "--cols": table.cols, "--rows": table.rows } as CSSProperties;

  return (
    <div
      className={`seating-table is-${table.id}`}
      style={style}
      role="group"
      aria-label={names.length ? `${table.id} table: ${names.join(", ")}` : `${table.id} table, open`}
    >
      {sides.map(({ side, slots }) =>
        slots.length ? (
          <ul key={side} className={`seating-side is-${side}`} role="list">
            {slots.map(({ key, name }) => {
              const selected = selectedKey === key;
              const className = `seating-seat${name ? "" : " is-empty"}${selected ? " is-selected" : ""}`;
              const label = name ?? "Open seat";
              return (
                <li key={key}>
                  {editing ? (
                    <button
                      type="button"
                      className={className}
                      aria-label={label}
                      aria-pressed={selected}
                      onClick={() => onSeatClick?.(key)}
                    >
                      {name ?? <span className="sr-only">Open seat</span>}
                    </button>
                  ) : (
                    <span className={className}>
                      {name ?? <span className="sr-only">Open seat</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null,
      )}
      <div className="seating-surface">
        {prompt ? <span className="seating-open">{prompt}</span> : null}
      </div>
    </div>
  );
}
