"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useCallback, useEffect, useRef } from "react";
import {
  TURNSTILE_ANON_ACTION,
  TURNSTILE_SITE_KEY,
} from "@/lib/turnstile/config";

/**
 * Invisible Turnstile gate for Supabase anonymous sign-in. Supabase Auth
 * verifies the token server-side (dashboard secret); the portal never calls
 * siteverify directly.
 *
 * Tokens are single-use — reset and re-execute after a failed sign-in so the
 * user can retry without reloading.
 */
export function AnonCaptchaGate({
  onToken,
  onError,
}: {
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const widgetRef = useRef<TurnstileInstance>(null);
  const handledRef = useRef(false);

  const execute = useCallback(() => {
    handledRef.current = false;
    widgetRef.current?.execute();
  }, []);

  useEffect(() => {
    execute();
  }, [execute]);

  return (
    <div className="sb-captcha-gate" aria-live="polite">
      <p className="sb-note" aria-busy="true">
        Checking you&apos;re not a bot…
      </p>
      <Turnstile
        ref={widgetRef}
        siteKey={TURNSTILE_SITE_KEY}
        options={{
          size: "invisible",
          action: TURNSTILE_ANON_ACTION,
        }}
        onSuccess={(token) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onToken(token);
        }}
        onError={() => {
          onError("Turnstile couldn't load. Check your connection and refresh.");
        }}
        onExpire={() => {
          handledRef.current = false;
          widgetRef.current?.reset();
          execute();
        }}
      />
    </div>
  );
}
