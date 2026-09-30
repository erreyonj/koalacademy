import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  sectionBand,
  type TeacherProgressRow,
  type TeacherWritePhase,
} from "./types";

function isProgressRow(value: unknown): value is TeacherProgressRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.band === "string" &&
    typeof row.section === "string" &&
    typeof row.lesson_slug === "string" &&
    typeof row.lesson === "boolean" &&
    typeof row.review === "boolean" &&
    typeof row.lab === "boolean"
  );
}

function asRows(data: unknown): TeacherProgressRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isProgressRow);
}

export async function fetchTeacherProgress(
  code: string,
): Promise<TeacherProgressRow[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await getSupabase().rpc("teacher_progress", {
    p_code: code,
  });
  if (error) {
    if (/invalid_code|42501|permission denied/i.test(error.message)) {
      throw new Error("That code did not match.");
    }
    throw new Error(error.message);
  }
  return asRows(data);
}

export async function setTeacherProgress(args: {
  code: string;
  section: string;
  lesson: string;
  phase: TeacherWritePhase;
  done: boolean;
}): Promise<TeacherProgressRow> {
  const band = sectionBand(args.section);
  const { data, error } = await getSupabase().rpc("teacher_set_progress", {
    p_code: args.code,
    p_band: band,
    p_section: args.section,
    p_lesson: args.lesson,
    p_phase: args.phase,
    p_done: args.done,
  });
  if (error) {
    if (/invalid_code|42501|permission denied/i.test(error.message)) {
      throw new Error("That code did not match.");
    }
    throw new Error(error.message);
  }
  const rows = asRows(data);
  if (rows[0]) return rows[0];
  return {
    band,
    section: args.section,
    lesson_slug: args.lesson,
    lesson: false,
    review: false,
    lab: false,
  };
}
