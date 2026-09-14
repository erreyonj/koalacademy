/** Cloudflare Turnstile site key (publishable — safe in the browser bundle). */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** Stable action name validated by Supabase Auth when CAPTCHA is enabled. */
export const TURNSTILE_ANON_ACTION = "anonymous_sign_in";

export function isTurnstileConfigured(): boolean {
  return TURNSTILE_SITE_KEY.length > 0;
}
