import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Difficulty } from "./pitches";
import {
  isScoreCohort,
  type Placement,
  type ScoreCohort,
  type StaffDecodeScore,
} from "./leaderboard";

const UNAVAILABLE = "Leaderboard isn't available.";

const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

interface ScoreRow {
  id: string;
  alias: string;
  cohort: string;
  difficulty: string;
  elapsed_sec: number;
  created_at: string;
}

function isScoreRow(value: unknown): value is ScoreRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.alias === "string" &&
    typeof row.cohort === "string" &&
    typeof row.difficulty === "string" &&
    typeof row.elapsed_sec === "number" &&
    typeof row.created_at === "string"
  );
}

function asScore(row: ScoreRow): StaffDecodeScore | null {
  if (!isScoreCohort(row.cohort) || !isDifficulty(row.difficulty)) return null;
  return {
    id: row.id,
    alias: row.alias,
    cohort: row.cohort,
    difficulty: row.difficulty,
    elapsedSec: row.elapsed_sec,
    createdAt: row.created_at,
  };
}

/** All logged scores, fastest first. Throws when Supabase is not configured. */
export async function fetchScores(): Promise<StaffDecodeScore[]> {
  if (!isSupabaseConfigured()) throw new Error(UNAVAILABLE);

  const { data, error } = await getSupabase()
    .from("staff_decode_scores")
    .select("id, alias, cohort, difficulty, elapsed_sec, created_at")
    .order("elapsed_sec", { ascending: true });

  if (error) throw new Error(UNAVAILABLE);
  return (data ?? [])
    .filter(isScoreRow)
    .map(asScore)
    .filter((score): score is StaffDecodeScore => score !== null);
}

export async function fetchPlacement(
  difficulty: Difficulty,
  elapsedSec: number,
): Promise<Placement> {
  if (!isSupabaseConfigured()) throw new Error(UNAVAILABLE);

  const { data, error } = await getSupabase().rpc("staff_decode_placement", {
    p_difficulty: difficulty,
    p_elapsed_sec: elapsedSec,
  });

  if (error) throw new Error(UNAVAILABLE);

  const row = Array.isArray(data) ? data[0] : data;
  if (
    !row ||
    typeof row !== "object" ||
    typeof (row as { beaten?: unknown }).beaten !== "number" ||
    typeof (row as { total?: unknown }).total !== "number"
  ) {
    throw new Error(UNAVAILABLE);
  }

  return {
    beaten: (row as { beaten: number }).beaten,
    total: (row as { total: number }).total,
  };
}

export async function logScore(input: {
  alias: string;
  cohort: ScoreCohort;
  difficulty: Difficulty;
  elapsedSec: number;
}): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error(UNAVAILABLE);

  const { data, error } = await getSupabase().rpc("staff_decode_log_score", {
    p_alias: input.alias,
    p_cohort: input.cohort,
    p_difficulty: input.difficulty,
    p_elapsed_sec: input.elapsedSec,
  });

  if (error) {
    if (/invalid_alias/i.test(error.message)) {
      throw new Error("Use exactly 3 letters (A–Z).");
    }
    if (/invalid_cohort/i.test(error.message)) {
      throw new Error("Pick your cohort.");
    }
    throw new Error(UNAVAILABLE);
  }

  if (typeof data !== "string" || !data) throw new Error(UNAVAILABLE);
  return data;
}
