import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { GlossaryEntry } from "./glossary";

const UNAVAILABLE = "Glossary isn't available.";

interface GlossaryRow {
  id: string;
  lesson_code: string;
  term: string;
  definition: string;
  position: number;
}

function asEntry(row: GlossaryRow): GlossaryEntry {
  return {
    id: row.id,
    term: row.term,
    definition: row.definition,
    lessonCode: row.lesson_code,
    position: row.position,
  };
}

function isRow(value: unknown): value is GlossaryRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.lesson_code === "string" &&
    typeof row.term === "string" &&
    typeof row.definition === "string" &&
    typeof row.position === "number"
  );
}

/** All glossary rows, in lesson order. Throws when Supabase is not configured. */
export async function fetchGlossaryTerms(lessonCode?: string): Promise<GlossaryEntry[]> {
  if (!isSupabaseConfigured()) throw new Error(UNAVAILABLE);

  let query = getSupabase()
    .from("glossary_terms")
    .select("id, lesson_code, term, definition, position")
    .order("position", { ascending: true });
  if (lessonCode) query = query.eq("lesson_code", lessonCode);

  const { data, error } = await query;
  if (error) throw new Error(UNAVAILABLE);
  return (data ?? []).filter(isRow).map(asEntry);
}

function throwGlossaryError(error: { message: string }): never {
  if (/duplicate_term|23505/i.test(error.message)) {
    throw new Error("That term is already in this lesson.");
  }
  if (/invalid_code|42501|permission denied/i.test(error.message)) {
    throw new Error("That code did not match.");
  }
  if (/invalid_term/i.test(error.message)) {
    throw new Error("Add a term and a short definition.");
  }
  if (/invalid_lesson/i.test(error.message)) {
    throw new Error("This lesson can't take a glossary term.");
  }
  if (/missing_term/i.test(error.message)) {
    throw new Error("That term is no longer in the glossary.");
  }
  throw new Error(error.message);
}

function firstRow(data: unknown): GlossaryEntry {
  const rows = Array.isArray(data) ? data : [];
  const row = rows.find(isRow);
  if (!row) throw new Error("Could not save that term.");
  return asEntry(row);
}

/** Teacher-gated insert. The passphrase is the stored Teacher Mode code. */
export async function addGlossaryTerm(
  code: string,
  lessonCode: string,
  term: string,
  definition: string
): Promise<GlossaryEntry> {
  if (!isSupabaseConfigured()) throw new Error(UNAVAILABLE);

  const { data, error } = await getSupabase().rpc("glossary_add_term", {
    p_code: code,
    p_lesson_code: lessonCode,
    p_term: term,
    p_definition: definition,
  });

  if (error) throwGlossaryError(error);
  return firstRow(data);
}

/** Teacher-gated edit of one term's wording. */
export async function updateGlossaryTerm(
  code: string,
  id: string,
  term: string,
  definition: string
): Promise<GlossaryEntry> {
  if (!isSupabaseConfigured()) throw new Error(UNAVAILABLE);

  const { data, error } = await getSupabase().rpc("glossary_update_term", {
    p_code: code,
    p_id: id,
    p_term: term,
    p_definition: definition,
  });

  if (error) throwGlossaryError(error);
  return firstRow(data);
}

/** Teacher-gated delete of one term. */
export async function deleteGlossaryTerm(code: string, id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error(UNAVAILABLE);

  const { error } = await getSupabase().rpc("glossary_delete_term", {
    p_code: code,
    p_id: id,
  });

  if (error) throwGlossaryError(error);
}
