import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { isSeatKey, type SeatKey } from "./seating";

export interface SeatingStudent {
  id: string;
  first_name: string;
  preferred_name: string | null;
}

export type SeatAssignments = Record<SeatKey, string>;

function isStudent(value: unknown): value is SeatingStudent {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.first_name === "string" &&
    (row.preferred_name === null || typeof row.preferred_name === "string")
  );
}

function asAssignments(value: unknown): SeatAssignments {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: SeatAssignments = {};
  for (const [key, id] of Object.entries(value as Record<string, unknown>)) {
    if (isSeatKey(key) && typeof id === "string") next[key] = id;
  }
  return next;
}

function translate(message: string): Error {
  if (/invalid_code|42501|permission denied/i.test(message)) {
    return new Error("That code did not match.");
  }
  if (/unknown_student|invalid_student/i.test(message)) {
    return new Error("That student is no longer on this roster.");
  }
  if (/duplicate_student/i.test(message)) {
    return new Error("A student can only sit in one seat.");
  }
  if (/invalid_seat|invalid_seats|invalid_class/i.test(message)) {
    return new Error("That seating chart could not be saved.");
  }
  return new Error(message);
}

export async function fetchSeating(
  code: string,
  classId: string,
): Promise<{ seats: SeatAssignments; students: SeatingStudent[] }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await getSupabase().rpc("class_seating_get", {
    p_code: code,
    p_class: classId,
  });
  if (error) throw translate(error.message);
  const payload = data as { seats?: unknown; students?: unknown } | null;
  return {
    seats: asAssignments(payload?.seats),
    students: Array.isArray(payload?.students)
      ? payload.students.filter(isStudent)
      : [],
  };
}

export async function saveSeating(
  code: string,
  classId: string,
  seats: SeatAssignments,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const { error } = await getSupabase().rpc("class_seating_set", {
    p_code: code,
    p_class: classId,
    p_seats: seats,
  });
  if (error) throw translate(error.message);
}
