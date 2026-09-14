import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isTurnstileConfigured } from "@/lib/turnstile/config";
import type { Database } from "./database.types";

/**
 * Single browser Supabase client (the data-access seam portal-v1.md asked
 * for). The portal is a static export, so this module is only ever imported
 * from client components.
 */

let client: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see portal/.env.example).",
    );
  }
  client = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // One anonymous session per browser; games key everything off it.
      storageKey: "ka-portal-auth",
    },
  });
  return client;
}

/** True when this browser already holds a Supabase session (no CAPTCHA needed). */
export async function hasAnonSession(): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session?.user);
}

/**
 * Every game participant is an anonymous auth user. Reuse the stored session
 * when the browser has one; otherwise mint a new anonymous user.
 *
 * When Supabase CAPTCHA protection is enabled, `captchaToken` is required for
 * new sign-ins (Turnstile token from the invisible widget).
 */
export async function ensureAnonSession(captchaToken?: string): Promise<string> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  if (isTurnstileConfigured() && !captchaToken) {
    throw new Error("captcha_required");
  }

  const { data: signIn, error } = await supabase.auth.signInAnonymously({
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error || !signIn.user) {
    const msg = error?.message ?? "Could not start a session.";
    if (/captcha/i.test(msg)) {
      throw new Error("captcha_failed");
    }
    throw new Error(msg);
  }
  return signIn.user.id;
}
