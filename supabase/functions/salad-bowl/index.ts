// Salad Bowl command gateway.
//
// The portal is a static export, so this Edge Function is the only write
// path: it verifies the caller's (anonymous) JWT, then invokes the
// service-role-only public.sb_command with the verified user id. The
// service-role key never reaches a browser.
//
// Deploy: supabase functions deploy salad-bowl
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by the platform.)

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: {
    type?: string;
    payload?: Record<string, unknown>;
    idempotencyKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  if (!body.type || typeof body.type !== "string") {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Client IP feeds the join-code / recovery-PIN throttle only.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const { data, error } = await admin.rpc("sb_command", {
    p_user: user.id,
    p_type: body.type,
    p_payload: body.payload ?? {},
    p_idem_key: body.idempotencyKey ?? null,
    p_ip: body.type === "join_game" || body.type === "recover_host" ? ip : null,
  });

  if (error) {
    console.error("sb_command failed", { type: body.type, error });
    return json({ ok: false, error: "server_error" }, 500);
  }
  return json(data);
});
