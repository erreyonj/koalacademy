#!/usr/bin/env node
/**
 * Import the Scholars + K–5 roster into behavior_students for the marble
 * tracker.
 *
 * Reads a school-export CSV (First Name, Last Name, Homeroom, …) and writes
 * ONLY the minimal fields the tracker needs: first name, last initial, cohort,
 * an avatar seed, and (if the CSV has a "Preferred Name" column) the name the
 * student goes by. Every other column (DOB, gender, phones, emails, guardian
 * contacts) is dropped in memory and never leaves this process.
 *
 * Needs the service-role key because the table is locked to anon/authenticated.
 * That key must never ship in the portal build — run this from your machine.
 *
 *   node scripts/import-behavior-roster.mjs --file ../rosters/2026-27.csv
 *   node scripts/import-behavior-roster.mjs --file ../rosters/2026-27.csv --prune
 *   node scripts/import-behavior-roster.mjs --file ../rosters/2026-27.csv --reset
 *
 * Env / flags:
 *   SUPABASE_URL              (default http://127.0.0.1:54321, the local stack)
 *   SUPABASE_SERVICE_ROLE_KEY (auto-read from `supabase status` when local)
 *   --url / --key             override either value
 *   --prune                   deactivate students no longer in the CSV
 *   --reset                   delete every row first (wipes marble counts)
 *   --dry-run                 parse + report, write nothing
 *
 * Default behaviour is additive and idempotent: existing students keep their
 * marbles and prize flag, new students are inserted, nothing is removed.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function flag(name) {
  return args.includes(`--${name}`);
}
function option(name) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

const file = option("file");
if (!file) {
  console.error("import-behavior-roster: --file <path-to-csv> is required.");
  process.exit(1);
}
const csvPath = path.resolve(process.cwd(), file);
if (!fs.existsSync(csvPath)) {
  console.error(`import-behavior-roster: no file at ${csvPath}`);
  process.exit(1);
}

const dryRun = flag("dry-run");
const prune = flag("prune");
const reset = flag("reset");

const url =
  option("url") ?? process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
let serviceKey = option("key") ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const isLocal = /^(http:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
if (!serviceKey && isLocal && !dryRun) {
  try {
    const out = execSync("npx supabase status -o env", {
      cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const match =
      out.match(/^SERVICE_ROLE_KEY="?([^"\n]+)"?/m) ??
      out.match(/^SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)"?/m) ??
      out.match(/^SECRET_KEY="?([^"\n]+)"?/m);
    if (match) serviceKey = match[1];
  } catch {
    // fall through to the error below
  }
}
if (!serviceKey && !dryRun) {
  console.error(
    "import-behavior-roster: set SUPABASE_SERVICE_ROLE_KEY (or --key). For the local stack, `npx supabase status` prints it.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180-ish: quoted fields, doubled quotes, CRLF)
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  return rows;
}

const raw = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const table = parseCsv(raw);
if (table.length < 2) {
  console.error("import-behavior-roster: CSV has no data rows.");
  process.exit(1);
}

const header = table[0].map((h) => h.trim().toLowerCase());
function col(name) {
  const index = header.indexOf(name.toLowerCase());
  if (index === -1) {
    console.error(`import-behavior-roster: CSV is missing a "${name}" column.`);
    process.exit(1);
  }
  return index;
}
const FIRST = col("First Name");
const LAST = col("Last Name");
const HOMEROOM = col("Homeroom");
// Optional: only used when the export has it.
const PREFERRED = header.indexOf("preferred name");

// ---------------------------------------------------------------------------
// Homeroom → cohort. Anything not matched (4K, 6th–8th, blanks) is skipped.
// ---------------------------------------------------------------------------

const GRADE_WORD = { "1st": "1", "2nd": "2", "3rd": "3", "4th": "4", "5th": "5" };

function toCohort(homeroom) {
  const value = homeroom.trim().toLowerCase().replace(/\s+/g, " ");
  if (value === "scholars") return "scholars";
  const m = value.match(/^(kg|1st|2nd|3rd|4th|5th) (blue|gold)$/);
  if (!m) return null;
  const grade = m[1] === "kg" ? "k" : GRADE_WORD[m[1]];
  const colour = m[2] === "blue" ? "b" : "g";
  return `${grade}${colour}`;
}

function hashSeed(input) {
  // djb2 → short hex. Only drives avatar hue; not reversible to a name.
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function cleanName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 60);
}

const wanted = [];
const skipped = new Map();
for (const row of table.slice(1)) {
  const firstName = cleanName(row[FIRST] ?? "");
  const lastName = cleanName(row[LAST] ?? "");
  const homeroom = (row[HOMEROOM] ?? "").trim();
  const cohort = toCohort(homeroom);
  if (!cohort || !firstName) {
    const key = homeroom || "(blank homeroom)";
    skipped.set(key, (skipped.get(key) ?? 0) + 1);
    continue;
  }
  const preferred = PREFERRED === -1 ? "" : cleanName(row[PREFERRED] ?? "");
  wanted.push({
    cohort,
    first_name: firstName,
    last_initial: (lastName[0] ?? "").toUpperCase(),
    preferred_name:
      preferred && preferred.toLowerCase() !== firstName.toLowerCase() ? preferred : null,
    last_name_full: lastName, // used for disambiguation only, never written
  });
}

// Two "Ava B" in one cohort → second gets "Br" so tiles stay tellable apart.
const seen = new Map();
for (const student of wanted) {
  const key = `${student.cohort}|${student.first_name.toLowerCase()}|${student.last_initial}`;
  const prior = seen.get(key);
  if (prior) {
    const extend = (s) =>
      (s.last_initial = (s.last_name_full.slice(0, 2) || s.last_initial)
        .replace(/^./, (c) => c.toUpperCase()));
    extend(prior);
    extend(student);
  } else {
    seen.set(key, student);
  }
}

for (const student of wanted) {
  student.avatar_seed = hashSeed(
    `${student.cohort}|${student.first_name}|${student.last_name_full}`,
  );
  delete student.last_name_full;
}

wanted.sort((a, b) =>
  a.cohort.localeCompare(b.cohort) || a.first_name.localeCompare(b.first_name),
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const perCohort = new Map();
for (const s of wanted) perCohort.set(s.cohort, (perCohort.get(s.cohort) ?? 0) + 1);
console.log(`import-behavior-roster: ${wanted.length} students across ${perCohort.size} cohorts`);
for (const [cohort, n] of [...perCohort.entries()].sort()) {
  console.log(`  ${cohort.padEnd(9)} ${n}`);
}
if (skipped.size) {
  console.log("skipped (outside Scholars/K–5):");
  for (const [k, n] of [...skipped.entries()].sort()) console.log(`  ${k.padEnd(12)} ${n}`);
}

if (dryRun) {
  console.log("dry run — nothing written.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (reset) {
  const { error } = await supabase
    .from("behavior_students")
    .delete()
    .not("id", "is", null);
  if (error) throw new Error(`reset failed: ${error.message}`);
  console.log("reset: cleared behavior_students");
}

const { data: existing, error: readError } = await supabase
  .from("behavior_students")
  .select("id, cohort, first_name, last_initial, preferred_name, active");
if (readError) throw new Error(`read failed: ${readError.message}`);

const keyOf = (s) =>
  `${s.cohort}|${s.first_name.toLowerCase()}|${s.last_initial.toUpperCase()}`;
const existingByKey = new Map();
for (const row of existing ?? []) existingByKey.set(keyOf(row), row);

const toInsert = [];
const toReactivate = [];
// Names typed in the app win: only fill preferred_name where it is still null.
const toName = [];
const incomingKeys = new Set();
for (const student of wanted) {
  const key = keyOf(student);
  incomingKeys.add(key);
  const row = existingByKey.get(key);
  if (!row) {
    toInsert.push(student);
    continue;
  }
  if (!row.active) toReactivate.push(row.id);
  if (student.preferred_name && row.preferred_name == null) {
    toName.push({ id: row.id, preferred_name: student.preferred_name });
  }
}

if (toInsert.length) {
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error } = await supabase.from("behavior_students").insert(chunk);
    if (error) throw new Error(`insert failed: ${error.message}`);
  }
}
if (toReactivate.length) {
  const { error } = await supabase
    .from("behavior_students")
    .update({ active: true })
    .in("id", toReactivate);
  if (error) throw new Error(`reactivate failed: ${error.message}`);
}
for (const { id, preferred_name } of toName) {
  const { error } = await supabase
    .from("behavior_students")
    .update({ preferred_name })
    .eq("id", id)
    .is("preferred_name", null);
  if (error) throw new Error(`preferred name failed: ${error.message}`);
}

let pruned = 0;
if (prune) {
  const stale = (existing ?? [])
    .filter((row) => row.active && !incomingKeys.has(keyOf(row)))
    .map((row) => row.id);
  if (stale.length) {
    const { error } = await supabase
      .from("behavior_students")
      .update({ active: false })
      .in("id", stale);
    if (error) throw new Error(`prune failed: ${error.message}`);
    pruned = stale.length;
  }
}

console.log(
  `done: inserted ${toInsert.length}, reactivated ${toReactivate.length}, preferred names filled ${toName.length}, unchanged ${wanted.length - toInsert.length - toReactivate.length}${prune ? `, pruned ${pruned}` : ""}`,
);
