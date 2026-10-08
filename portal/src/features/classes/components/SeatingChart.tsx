import type { CSSProperties } from "react";
import {
  ROOM,
  SEAT_SIDES,
  seatsFor,
  type RoomTable,
  type SeatingChart as SeatingChartData,
} from "../seating";

interface SeatingChartProps {
  chart: SeatingChartData | null;
  className: string;
}

/**
 * The room as seen from the TV. Furniture is a fixed size (in 1:2 table
 * units) and every seat slot is drawn, so open seats read as open. Classes
 * without a chart get the same room with every seat empty.
 */
export function SeatingChart({ chart, className }: SeatingChartProps) {
  return (
    <div
      className="seating-room"
      aria-label={chart ? `${className} seating chart` : `${className} room — choose a seat`}
    >
      {ROOM.map((table) => (
        <Table
          key={table.id}
          table={table}
          chart={chart}
          prompt={!chart && table.id === "middle" ? "Choose A Seat!" : null}
        />
      ))}
    </div>
  );
}

function Table({
  table,
  chart,
  prompt,
}: {
  table: RoomTable;
  chart: SeatingChartData | null;
  prompt: string | null;
}) {
  const sides = SEAT_SIDES.map((side) => ({ side, seats: seatsFor(chart, table, side) }));
  const names = sides.flatMap(({ seats }) => seats.filter((name): name is string => !!name));
  const style = { gridArea: table.id, "--cols": table.cols, "--rows": table.rows } as CSSProperties;

  return (
    <div
      className={`seating-table is-${table.id}`}
      style={style}
      role="group"
      aria-label={names.length ? `${table.id} table: ${names.join(", ")}` : `${table.id} table, open`}
    >
      {sides.map(({ side, seats }) =>
        seats.length ? (
          <ul key={side} className={`seating-side is-${side}`} role="list">
            {seats.map((name, i) => (
              <li key={i} className={`seating-seat${name ? "" : " is-empty"}`}>
                {name ?? <span className="sr-only">Open seat</span>}
              </li>
            ))}
          </ul>
        ) : null,
      )}
      <div className="seating-surface">
        {prompt ? <span className="seating-open">{prompt}</span> : null}
      </div>
    </div>
  );
}
