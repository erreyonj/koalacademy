import type { ClassId } from "./registry";

/**
 * Homeroom seating, transcribed from the chart photos dropped in `/rosters`.
 *
 * `ROOM` is the physical room and is shared by every class: one table is a
 * 1:2 rectangle, and each piece of furniture is sized in those units (short
 * side = 1). The TV is at the top, so "top" seats face away from the screen.
 *
 * `SEATING` only says who sits where. Each side lists names in order
 * (top→bottom for left/right, left→right for top/bottom); `null` or a short
 * list leaves the rest of the slots as empty seats. Keep first names only,
 * as they appear on the 26-27 roster.
 */
export type SeatSide = "top" | "right" | "bottom" | "left";

export const SEAT_SIDES: readonly SeatSide[] = ["top", "right", "bottom", "left"];

export type TableId = "left" | "middle" | "back" | "right";

export interface RoomTable {
  id: TableId;
  /** Width and height in table units. */
  cols: number;
  rows: number;
  /** Seat slots on each side. */
  seats: Record<SeatSide, number>;
}

export const ROOM: readonly RoomTable[] = [
  // Two tables end to end along the left wall.
  { id: "left", cols: 1, rows: 4, seats: { top: 1, right: 0, bottom: 1, left: 4 } },
  // One table, long side facing the screen.
  { id: "middle", cols: 2, rows: 1, seats: { top: 0, right: 1, bottom: 2, left: 1 } },
  // Two tables side by side, furthest from the screen.
  { id: "back", cols: 2, rows: 2, seats: { top: 0, right: 2, bottom: 2, left: 2 } },
  // Two tables end to end along the right wall.
  { id: "right", cols: 1, rows: 4, seats: { top: 1, right: 4, bottom: 1, left: 0 } },
];

export type SeatRow = readonly (string | null)[];

export interface SeatingChart {
  tables: Partial<Record<TableId, Partial<Record<SeatSide, SeatRow>>>>;
  /** Students on the roster who have no seat on the chart yet. */
  unseated?: readonly string[];
}

export const SEATING: Partial<Record<ClassId, SeatingChart>> = {
  // rosters/3g-homeroom-seating — 2026-10-08
  "3g": {
    tables: {
      left: {
        top: ["Russell"],
        bottom: ["Yara"],
        left: [null, "Ameela", "Iveyah", "Emmy"],
      },
      middle: {
        left: ["Majesty"],
        right: ["Ari"],
        bottom: ["Naliyah", "Leo"],
      },
      back: {
        left: ["Torrion", null],
        bottom: ["Kalel", null],
      },
      right: {
        right: ["Ella", "Jhenea", "Teagan", "Atalyah"],
        bottom: ["Dai'Vion"],
      },
    },
    unseated: ["Arriana", "Yanis"],
  },
};

export function getSeating(id: ClassId): SeatingChart | undefined {
  return SEATING[id];
}

/** Names for one side, padded with empty seats to the room's slot count. */
export function seatsFor(
  chart: SeatingChart | null,
  table: RoomTable,
  side: SeatSide,
): (string | null)[] {
  const names = chart?.tables[table.id]?.[side] ?? [];
  return Array.from({ length: table.seats[side] }, (_, i) => names[i] ?? null);
}
