/**
 * Homeroom furniture. One table is a 1:2 rectangle; each piece is sized in
 * those units (short side = 1). The TV is at the top, so "top" seats face
 * away from the screen.
 *
 * Who sits where lives in Supabase (`class_seating`), keyed by `seatKey`.
 */
export type SeatSide = "top" | "right" | "bottom" | "left";

export const SEAT_SIDES: readonly SeatSide[] = ["top", "right", "bottom", "left"];

export type TableId = "left" | "middle" | "back" | "right";

export type SeatKey = `${TableId}:${SeatSide}:${number}`;

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

export function seatKey(table: TableId, side: SeatSide, index: number): SeatKey {
  return `${table}:${side}:${index}`;
}

export function isSeatKey(value: string): value is SeatKey {
  return /^(left|middle|back|right):(top|right|bottom|left):[0-3]$/.test(value);
}
