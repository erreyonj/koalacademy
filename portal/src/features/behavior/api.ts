import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { isCohort, type BehaviorStudent, type Cohort } from "./types";

function isStudent(value: unknown): value is BehaviorStudent {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.cohort === "string" &&
    isCohort(row.cohort) &&
    typeof row.first_name === "string" &&
    typeof row.last_initial === "string" &&
    typeof row.marbles === "number" &&
    typeof row.prize === "boolean" &&
    typeof row.avatar_seed === "string"
  );
}

function asStudents(data: unknown): BehaviorStudent[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isStudent);
}

function translate(message: string): Error {
  if (/invalid_code|42501|permission denied/i.test(message)) {
    return new Error("That code did not match.");
  }
  if (/unknown_student/i.test(message)) {
    return new Error("That student is no longer on a roster.");
  }
  return new Error(message);
}

export async function fetchRoster(code: string): Promise<BehaviorStudent[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await getSupabase().rpc("behavior_roster", {
    p_code: code,
  });
  if (error) throw translate(error.message);
  return asStudents(data);
}

/** The Postgrest builder is a thenable, not a Promise, hence PromiseLike. */
async function single(
  promise: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<BehaviorStudent> {
  const { data, error } = await promise;
  if (error) throw translate(error.message);
  const row = asStudents(data)[0];
  if (!row) throw new Error("The server returned no student row.");
  return row;
}

export function adjustMarbles(
  code: string,
  studentId: string,
  delta: number,
): Promise<BehaviorStudent> {
  return single(
    getSupabase().rpc("behavior_adjust", {
      p_code: code,
      p_student: studentId,
      p_delta: delta,
    }),
  );
}

export function moveStudent(
  code: string,
  studentId: string,
  cohort: Cohort,
): Promise<BehaviorStudent> {
  return single(
    getSupabase().rpc("behavior_move", {
      p_code: code,
      p_student: studentId,
      p_cohort: cohort,
    }),
  );
}

export async function removeStudent(
  code: string,
  studentId: string,
): Promise<void> {
  const { error } = await getSupabase().rpc("behavior_remove", {
    p_code: code,
    p_student: studentId,
  });
  if (error) throw translate(error.message);
}

export function setPrize(
  code: string,
  studentId: string,
  on: boolean,
): Promise<BehaviorStudent> {
  return single(
    getSupabase().rpc("behavior_prize", {
      p_code: code,
      p_student: studentId,
      p_on: on,
    }),
  );
}
