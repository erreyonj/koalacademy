# Salad Bowl V1 — setup, deployment, and rollout

The first live game under **Toolkit → Games** and the portal's first real Supabase use.
Classroom rules live in
[curriculum/k-8-pilot/playbook/games.md](../curriculum/k-8-pilot/playbook/games.md#salad-bowl);
the spec boundary (why this doesn't break "no accounts") is recorded in
[portal-v1.1.md](../curriculum/k-8-pilot/resources/portal-v1.1.md).

---

## How it's built

The portal stays a static export on Netlify — there is no app server. Everything live runs
on Supabase:

| Piece | Where | Job |
| --- | --- | --- |
| Schema, RLS, command function | [`supabase/migrations/20260913230950_salad_bowl_v1.sql`](../supabase/migrations/20260913230950_salad_bowl_v1.sql) | All tables (`sb_*`), row security, and `sb_command` — the single transactional write path |
| Edge Function | [`supabase/functions/salad-bowl/`](../supabase/functions/salad-bowl/) | Verifies the caller's JWT, then calls `sb_command` with the service-role key (which never reaches a browser) |
| Browser client | [`portal/src/lib/supabase/`](../portal/src/lib/supabase/) | Anonymous auth session + typed reads |
| Game feature | [`portal/src/features/salad-bowl/`](../portal/src/features/salad-bowl/) | Screens, timer/engine logic, realtime hook |

Key properties:

- **Clients can only read.** Every table grant is SELECT-only for `authenticated`, filtered by
  RLS to game members. All writes go browser → Edge Function → `sb_command` (service-role
  only), which row-locks the game so simultaneous taps can't double-score or double-draw.
  Retries carry idempotency keys.
- **Clue text is the secret.** RLS exposes a response's text only to its submitter, the host,
  and the player whose hand it is currently in. The private Realtime topic (`sb:game:<id>`)
  broadcasts only a version number; devices refetch state through `sb_state()`, where RLS
  decides what each role sees.
- **The server clock is the timer.** Turns store `ends_at` (and a frozen remainder while
  paused); devices render a countdown corrected for clock skew and refetch on
  visibility/focus/reconnect. If Realtime is blocked (school networks), the client falls back
  to polling automatically.
- **Host recovery** is a hashed 6-digit PIN shown once at creation (and behind the PIN button
  in the teacher bar on the host device), with attempt throttling and lockout.

## One-time hosted setup

Everything below happens in the hosted Supabase project (`qthafgqbfsnuomqqgyyc`):

1. **Enable anonymous sign-ins**: Dashboard → Authentication → Sign In / Up → Anonymous.
2. **Raise the anonymous rate limit**: Auth → Rate Limits → anonymous users → **90/hour**
   (a whole class joins from one school NAT address; local `config.toml` matches).
3. **Enable CAPTCHA (Cloudflare Turnstile)**: Dashboard → Authentication → Bot and Abuse
   Protection → Enable CAPTCHA protection → provider **Cloudflare Turnstile** → paste the
   widget **secret key** (not the site key). The portal already embeds the invisible widget
   and passes tokens to `signInAnonymously`. Widget site key:
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (see `portal/.env.example`).
4. **Push the migration**: `npx supabase link --project-ref qthafgqbfsnuomqqgyyc`, then
   `npx supabase db push`. The migration schedules an hourly `pg_cron` cleanup
   (`salad-bowl-cleanup`); confirm it appears under Integrations → Cron.
5. **Deploy the Edge Function**: `npx supabase functions deploy salad-bowl`. Platform env
   (URL, anon key, service-role key) is injected automatically — nothing to configure.
6. **Netlify env vars** (Site settings → Environment): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. These are
   publishable browser values. The site's CSP in [`portal/netlify.toml`](../portal/netlify.toml)
   already allows Supabase and `https://challenges.cloudflare.com`.

### Secrets hygiene (done in this slice, recorded here)

`portal/.env` had been committed to git history. It contained only the **publishable** URL
and `sb_publishable_…` key — safe to be public by design, so nothing needed rotation. The
file is untracked now and `.gitignore` blocks all env files. **Never** put `sb_secret_…` /
service-role keys in the repo or in Netlify env — they belong only in Supabase Edge Function
runtime (auto-injected).

## Local development

```bash
# 1. Local stack (needs Docker)
npx supabase start
npx supabase db reset --local           # applies the migration + seed

# 2. Edge function
npx supabase functions serve salad-bowl

# 3. Portal, pointed at the local stack (portal/.env):
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from `npx supabase status`>
#    NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAEzH4EaG49DArnDm
# 4. Supabase local CAPTCHA secret (supabase/.env — copy from supabase/.env.example):
#    SUPABASE_AUTH_CAPTCHA_SECRET=<Turnstile widget secret>
cd portal && npm run dev
```

## Tests

| Suite | Command | Covers |
| --- | --- | --- |
| Unit (no stack needed) | `cd portal && npm test` | Timer/pause math, clock skew, scores, turn ownership, quota, team helpers, normalization/leetspeak parity with SQL |
| Database | `./scripts/test-salad-bowl-db.sh` (needs Docker) | Full command flow, RLS (member/host/intruder/active-player card privacy, PIN column), moderation, duplicate/banned/near-dup handling, idempotent replay, undo, pause math, recovery + lockout, clear, expiry cleanup |
| Multi-device E2E | `SB_E2E=1 npm run test:e2e` in `portal/` (needs local stack + functions serve + dev server) | Teacher + 3 student contexts: join, cards, moderation, teams, a played turn, clue privacy, pause overlay, mid-turn refresh/rejoin, clear bowl |

Typecheck and static export: `npm run lint && npm run build` in `portal/` (both green as of
this slice — `/toolkit/games/` and `/toolkit/games/salad-bowl/` render in `out/`).

## Privacy and retention

- Players are **anonymous auth sessions** — no email, no password, no roster. Prompt copy asks
  for first name plus last initial only.
- A game stores: display names, game cards, teams, scores, and an action log for undo.
  Every command slides the game's expiry to **now + 6 hours**; an hourly cron deletes expired
  games (all child rows cascade). Anonymous auth users older than **7 days** are purged.
- The teacher can wipe everything immediately with **Clear bowl** (players stay joined,
  content and scores are deleted).
- Moderation: a versioned banned-term list (normalized against spacing/punctuation/leetspeak
  variants) plus per-game teacher additions; every free-for-all card requires explicit teacher
  approval before it can enter play. Flagged students get a neutral "try a different card"
  message.
- Before wider rollout, confirm the school is comfortable with temporary first-name +
  game-card storage. This is much narrower than accounts, but it is student data in transit.

## V1 boundaries (deliberately out)

Registered accounts, saved rosters, reusable deck libraries (Koala/Music decks are pasted per
game), grades/progress analytics, AI moderation, remote/cross-room matchmaking, spectator
links, offline play, custom round rule sets (the three rounds are fixed: Describe → Charades
→ One Word).

## Production smoke test (before first class)

Run once on the real Netlify site + hosted Supabase, ideally on two iPads plus a laptop:

1. Host a Free-For-All game (teacher device). Note the join code **and the recovery PIN**.
2. Join from two other devices with different names; confirm both appear in the lobby live.
   Try a duplicate name — it should be refused politely.
3. Open the bowl. Submit a normal card, a duplicate ("67" then "6 7" — second refused), and a
   blocked word (should return the neutral replacement message, and appear flagged on the
   teacher device).
4. Lock, review (approve all), draw teams, reshuffle once, move one player, lock teams.
5. Play one full turn: confirm the clue shows **only** on the active iPad, the timers agree
   across devices, Got It scores, Pass disables after one use, and time-up returns the card.
6. Mid-turn: press **Pause** — student buttons freeze and the overlay appears; **Resume** —
   the clock continues from where it stopped. Tap **Undo** after a Got It and watch the point
   come back off.
7. Refresh the active player's iPad mid-turn: it should land back in the same turn with the
   clue restored. Lock one iPad for 30 seconds and wake it: the timer must re-sync, not drift.
8. On a fresh browser, use **Recover host** with the game code + PIN; confirm the teacher bar
   moves to that device.
9. **Clear bowl** and confirm every device lands back in the lobby with players intact.
10. Check Supabase → Table Editor a few hours later: the expired game should be gone after
    the cleanup cron runs.

If the school Wi-Fi blocks WebSockets, the connection badge will show **Syncing** instead of
**Live** — the game still works on the polling fallback, with a couple seconds more lag.
