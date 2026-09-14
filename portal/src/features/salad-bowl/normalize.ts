/**
 * Client mirror of sb_private.norm() — used only for instant feedback
 * (duplicate hints, empty-after-normalisation checks) before the server,
 * which is authoritative, re-runs the same canonicalisation.
 *
 * Keep in lockstep with the SQL: lowercase, fold common leetspeak, strip
 * everything but a-z0-9.
 */

const LEET_FROM = "0134578@$!";
const LEET_TO = "oieastbasi";

export function normKey(input: string): string {
  let out = "";
  for (const ch of (input ?? "").toLowerCase()) {
    const idx = LEET_FROM.indexOf(ch);
    const mapped = idx >= 0 ? LEET_TO[idx] : ch;
    if (/[a-z0-9]/.test(mapped)) out += mapped;
  }
  return out;
}

/** Collapse whitespace the way the server does before storing display text. */
export function cleanText(input: string): string {
  return (input ?? "").trim().replace(/\s+/g, " ");
}

export function isSubmittable(input: string): boolean {
  const text = cleanText(input);
  return text.length >= 1 && text.length <= 60 && normKey(text).length >= 1;
}
