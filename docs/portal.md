# Course Portal

The live classroom app. Source lives on `portalv1-dev`; the stable ref is `portalv1`.
Do not merge `portalv1-dev` into `main`.

Live: [https://koalacademy-portal.netlify.app/](https://koalacademy-portal.netlify.app/).
Marketing bridge: [site/portal.html](../site/portal.html) on `webv1-dev`.
Product history: [curriculum/k-8-pilot/resources/portal-v1.md](../curriculum/k-8-pilot/resources/portal-v1.md)
(frozen V1) and [portal-v1.1.md](../curriculum/k-8-pilot/resources/portal-v1.1.md) (living spec).
Salad Bowl setup: [salad-bowl-v1.md](salad-bowl-v1.md). Roadmap leftovers:
[portal-next.md](portal-next.md).

The portal is a **static Next.js export** (`output: "export"`, `trailingSlash: true`).
There is no app server. Anything live goes through Supabase functions that the browser
calls with the public anon key. There are **no student or guardian accounts**.

---

## Routes

| Path | Purpose |
| --- | --- |
| `/` and `/dashboard/` | Home: shortcut cards, Class Buckets launcher, newsletter button |
| `/classes/` | Homeroom index, grouped by band |
| `/classes/[cohort]/` | One homeroom screen per class (`scholars`, `kg`…`8b`) |
| `/buckets/` | Class Buckets marble tracker (teacher code) |
| `/teacher/` | Teacher mode: K–8 progress grid (Lesson / Review / Lab) |
| `/lessons/` and `/lessons/[code]/` | Lesson index and player |
| `/grades/[band]/` | Band lesson list plus Components toolbar |
| `/skills/` | Skills search hub |
| `/newsletter/` | Class updates, built from MDX |
| `/toolkit/` | Tools home |
| `/toolkit/games/` | Games list |
| `/toolkit/games/salad-bowl/` | Salad Bowl |
| `/tools/notation/` | Notation sandbox |
| `/tools/rhythm/` | Rhythm Randomizer |
| `/tools/circle-of-fifths/` | Circle of Fifths |
| `/resources/` | Placeholder for toolbar Investigate / Playlist links |
| `/playlists/`, `/submissions/`, `/profile/`, `/settings/` | Placeholders |

Sidebar (`portal/src/components/nav-main.tsx`): Dashboard, Classes, Lessons (Home plus
K–2 / 3–5 / 6–8), Toolkit (Home, Games, Notation Sandbox, Rhythm Randomizer, Circle of
Fifths), Skills, Playlists, Submissions. The user menu has Profile, Settings, the
marketing site, and Teacher mode.

---

## Lessons

MDX lives in [`portal/content/lessons/`](../portal/content/lessons/). Indexed at build
time. Curriculum text stays in git — do not build a lessons CMS table.

**Frontmatter.** `code`, `title`, `focus`, `bands` (one band per file — never
`["6-8","3-5"]` on the same file), `sequence` (max existing in that band + 1; never the
KOALACADEMY number), `created` (`"YYYY-MM-DD"`). K–2 decks add `presentation: "deck"`.

**6–8 and 3–5 shape.** Do Now → Lesson → Activate. Silent journal Do Now by default
(`look` + `journal` + `write`). Activate keeps I do / We do / You do. Do Now does not
steal Activate.

**K–2 shape.** `Deck` / `DeckSection` / `Slide`, plus `Mindfulness` and `MiniCrew` MDX
blocks. The `.Notes` panel in the toolbar starts closed so a projector never opens on
the teacher script.

Drafting order and the 3–5 port pass: `.cursor/rules/six-eight-lesson-loop.mdc` and
`.cursor/skills/split-lesson-work/SKILL.md`. Confirmed lesson work splits with
`./scripts/split-curriculum-portal.sh` — curriculum on `main`, portal MDX on
`portalv1-dev`.

---

## Teacher mode

One shared teacher code, stored in `localStorage` under `ka-teacher-code`.
`TeacherModeProvider` re-checks it on load. The same code unlocks lesson progress and
Class Buckets.

Supabase holds only a bcrypt hash of the code (`teacher_private.settings`). The table
`class_lesson_progress` is never read directly; access goes through the code-checked
functions `teacher_progress` and `teacher_set_progress`.

Eighteen sections (`kg`…`8b`, Gold/Blue). Each section/lesson has three checkboxes:
**L**esson, **R**eview, **L**ab (Λ). `/teacher/` is the grid. `TeacherLessonIndicator`
shows the same marks on a lesson page.

**Rotating the code.** Write a new hashed-code migration (see
`supabase/migrations/20261007190100_teacher_code_rotate.sql`) and `npx supabase db push`.
Do not put the plaintext code in git.

---

## Class Buckets (marbles)

`/buckets/`. Cohorts: Scholars plus K–5 (`kb`…`5b`). Grades 6–8 are meant to get
"points" later; the homeroom screen already labels them that way.

Supabase tables: `behavior_students` (first name, last initial, preferred name, marbles,
prize, avatar seed) and `behavior_cohort_pool` (class-wide marbles). Direct table access
is locked. Code-checked functions: `behavior_roster`, `_adjust`, `_move`, `_remove`
(soft delete), `_prize`, `_pools`, `_pool_adjust`, `_pool_set`, `_empty`,
`_set_preferred_name`.

`localStorage` remembers only the last cohort opened (`ka-behavior-cohort`).
`sessionStorage` holds the return path when Buckets is opened from a lesson's Options
menu (`.Buckets`).

Counter colours: green at 7 or more, warning below −2. Class total = sum of students +
pool.

**How a teacher uses it.** Open the dashboard card or lesson Options → .Buckets, enter
the code, pick a class, then add/subtract marbles, set the total, empty the bucket,
toggle a prize, move or remove a student, or set a preferred name.

### Roster import

[`portal/scripts/import-behavior-roster.mjs`](../portal/scripts/import-behavior-roster.mjs)
reads a school CSV, keeps only first name, last initial, cohort, avatar seed, and
optional preferred name, and drops everything else in memory. Needs
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (falls back to `npx supabase status`
locally). Run from your machine only — the service-role key must never ship in the
portal build.

```bash
node scripts/import-behavior-roster.mjs --file ../rosters/26-27\ roster.csv --dry-run
node scripts/import-behavior-roster.mjs --file ../rosters/26-27\ roster.csv
node scripts/import-behavior-roster.mjs --file ../rosters/26-27\ roster.csv --prune
node scripts/import-behavior-roster.mjs --file ../rosters/26-27\ roster.csv --reset
```

`--prune` deactivates students no longer in the CSV. `--reset` deletes every row first
(wipes marble counts). Default is additive and idempotent.

---

## Homeroom pages

`/classes/` and `/classes/[cohort]/`. Class list:
[`portal/src/features/classes/registry.ts`](../portal/src/features/classes/registry.ts).
Seating:
[`portal/src/features/classes/seating.ts`](../portal/src/features/classes/seating.ts) —
a shared four-table room layout. Only 3G has a chart so far (dated 2026-10-08). Edit
`SEATING` with first names as they appear on the 26–27 roster.

Each homeroom screen (`HomeroomView`) has:

- a menu linking to Playlists and Classes
- **Now Playing** — a YouTube mini player that picks one of three videos at random
  (`NowPlaying.tsx` `VIDEOS` list). CSP in `portal/netlify.toml` allows `www.youtube.com`
  for this player
- **Quick Info** — three entry reminders rotating every 7 seconds (`QUICK_INFO` in
  `QuickInfoTicker.tsx`)
- **Class Marbles** — a read-only total; shows "?" when Teacher mode is locked
- **Today's →** — the first lesson in the band not fully checked off; falls back to the
  band list when locked (`LastLessonLink`)

---

## Newsletter

Posts are MDX in [`portal/content/newsletter/`](../portal/content/newsletter/), read at
build time. The write-newsletter skill turns class-update notes into a portal post and
an admin PDF.

```bash
cd portal && node scripts/newsletter-to-pdf.mjs content/newsletter/<slug>.mdx
```

Needs Playwright Chromium (`npx playwright install chromium`). PDFs land in
`content/newsletter/exports/`.

---

## Data and privacy

Hosted Supabase project: `fyurkhqtujqrbqlsiuyu`. The browser never talks to tables
directly. Salad Bowl, teacher progress, and Class Buckets share that project and the
same `npx supabase db push` flow.

Stored for Class Buckets: first name, last initial, preferred name, marble counts,
prize flag, avatar seed. No emails, phones, DOB, or guardian contacts. Salad Bowl
stores first name + last initial for the session only (games expire ~6 hours after the
last action). Lesson progress is per section, not per named student.

Still no student logins, no guardian accounts, no homework tracker, no grades table.

---

## Environment and deploy

`portal/.env.example`:

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Netlify UI |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Netlify UI |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Netlify UI (publishable widget key) |

The Turnstile **secret** lives in Supabase (`SUPABASE_AUTH_CAPTCHA_SECRET` locally in
`supabase/.env`). Roster import uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on
your machine only.

Root `netlify.toml` builds `site/` (marketing). `portal/netlify.toml` builds `portal/`
and publishes `portal/out`. After schema changes: `npx supabase db push`. After Edge
Function changes: `npx supabase functions deploy salad-bowl`. New host-only Salad Bowl
commands that live only in SQL do not need a function redeploy.
