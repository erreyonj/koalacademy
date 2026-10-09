# Student Portal — V1.1

> **Status: living spec** as of 2026-10-09. The lesson slide hub shipped before school
> started (2026-09-02). Teacher mode, Class Buckets, homeroom pages, the newsletter, and
> the Rhythm Randomizer have shipped since. The original proposal is frozen at
> [portal-v1.md](portal-v1.md). Structure and how-to: [docs/portal.md](../../../docs/portal.md).

This file records what is live, what is still content work (not platform), and the access
decision for the pilot year: no student or guardian accounts; unlisted class link now;
optional host-level class password later — not FERPA auth. A shared teacher code gates
section progress and Class Buckets; that is not a student login.

---

## Purpose

The portal is where students go to see the lesson: a page per lesson, phone-readable,
holding the same material a projector would show — the concept, the listening example, the
links, and the jokes that keep a room awake. It is useful with no student accounts and no
submission flow. Teacher-only classroom tools (homerooms, marble tracking, lesson progress)
sit behind a shared code; the lesson library itself stays unlisted.

Live app: [https://koalacademy-portal.netlify.app/](https://koalacademy-portal.netlify.app/).
Marketing bridge: [site/portal.html](../../../site/portal.html).

## Audience

**All lessons and slides face students** — K–2, 3–5, and 6–8. Kindergarteners may not type a
URL; the teacher still projects the same student-facing page. Write in the student register.
Teacher cues are short stage directions, not a private lesson plan.

---

## What shipped / what is leftover

V1 called for a static lesson slide hub with no accounts. That hub exists. The leftover gap
is **content**, not stack.

### Shipped (matches V1 “In”)

| Piece | Where |
| --- | --- |
| Next.js static export (`output: "export"`) | [`portal/`](../../../portal/), Netlify publish |
| Slide page per lesson | MDX + [`SlideShell`](../../../portal/src/components/SlideShell.tsx), [`DoNow`](../../../portal/src/components/DoNow.tsx), [`Activate`](../../../portal/src/components/Activate.tsx), [`Break`](../../../portal/src/components/Break.tsx), click-to-load [`YouTubeEmbed`](../../../portal/src/components/YouTubeEmbed.tsx), prev/next [`LessonNav`](../../../portal/src/components/LessonNav.tsx) |
| K–2 decks | [`Deck`](../../../portal/src/components/Deck.tsx), [`Notes`](../../../portal/src/components/Notes.tsx), `Mindfulness` / `MiniCrew` MDX blocks |
| Band indexes + Components toolbar | `/grades/k-2/`, `/grades/3-5/`, `/grades/6-8/` |
| Homeroom pages | `/classes/`, `/classes/[cohort]/` |
| Class Buckets | `/buckets/` |
| Teacher mode | `/teacher/` |
| Newsletter | `/newsletter/` |
| Rhythm Randomizer | `/tools/rhythm/` |
| No student login | [`layout.tsx`](../../../portal/src/app/layout.tsx) is `robots: noindex, nofollow` |
| Hardware / LCD tokens | Copied into [`portal/src/styles/tokens.css`](../../../portal/src/styles/tokens.css) |
| Marketing bridge | [`site/portal.html`](../../../site/portal.html) links the live portal |

### Content in the portal today

Thirty-seven MDX files under [`portal/content/lessons/`](../../../portal/content/lessons/)
versus ~50 6–8 lessons in [KOALACADEMY.md](../../KOALACADEMY.md) plus K–2 strand sessions.

| Band | In the portal today |
| --- | --- |
| 6–8 | INTRO-68, BMT.1–5, KSN.1/2/4/5, US.1–5 |
| 3–5 | Matching ports of the 6–8 files above (separate MDX, `bands: ["3-5"]`) |
| K–2 | INTRO-K2, BEAT-K2-01/02, TIMBRE-K2-01, FORM-K2-01, PITCH-K2-01, CREATE-K2-01 |

Missing from 6–8: KSN.3, then D4, SONGFORM, SRP, DYS, AW, AEP, PERFORMANCE. The rest is
writing ahead of the 6-day rotation, using the split-lesson workflow — not a platform
rewrite.

### Already past V1

Notation sandbox, Circle of Fifths, Skills hub, and the Rhythm Randomizer are live. See
[docs/portal-next.md](../../../docs/portal-next.md) for the product notes that drove the
first two, and [docs/portal.md](../../../docs/portal.md) for the current route map.

Profile, settings, submissions, and playlists are stubs (“auth not wired”).

**Toolkit → Games → Salad Bowl** is live and was the first real Supabase use.
Teacher mode and Class Buckets now share that same hosted project
(`fyurkhqtujqrbqlsiuyu`) and the same `db push` flow. See the boundary note below —
none of this is the student-accounts slice.

### Classroom tools vs “no database”

V1 said “no accounts, no database, no submission flow.” That still holds for students.
Salad Bowl, Teacher mode, and Class Buckets narrow it honestly rather than breaking it:

- **Still no student or guardian accounts.** Salad Bowl players are anonymous Supabase
  auth sessions — a random id per browser, no email, no password. Teacher mode is one
  shared code, not a roster login.
- **Salad Bowl is ephemeral.** A game holds first names/initials and game cards for the
  session only. Games expire ~6 hours after the last action and a scheduled job deletes them;
  old anonymous auth users are purged on a 7-day cycle.
- **Class Buckets stores a minimum.** First name, last initial, preferred name, marble
  counts, prize flag, avatar seed. No emails, phones, DOB, or guardian contacts. Direct
  table access is locked; code-checked functions are the only write path. Import from a
  school CSV with
  [`portal/scripts/import-behavior-roster.mjs`](../../../portal/scripts/import-behavior-roster.mjs).
- **Lesson progress is per section, not per named student.** `class_lesson_progress`
  (Lesson / Review / Lab checks) supersedes the V1 sketch of a per-student `progress`
  table for this year. It is not grades, homework, or submissions.
- **Curriculum text stays in git.** Game tables and teacher tables hold state only; the
  no-CMS rule is untouched.

Before wider rollout, confirm the school is comfortable with temporary Salad Bowl names
and the minimal Buckets roster. It is far narrower than an account system, but “no actual
users” is not the same as “no student data is processed.” Full Salad Bowl procedure:
[docs/salad-bowl-v1.md](../../../docs/salad-bowl-v1.md). Classroom-tool how-to:
[docs/portal.md](../../../docs/portal.md).

### Still true from V1

Lesson text stays Markdown/MDX in the repo. A later database references lesson codes as
strings. Do not build a lessons CMS table — it would duplicate git and fight static export.

```text
MDX (portal/content/lessons)
        │
        ▼
Static HTML export ──► Unlisted Netlify URL
                              │
                              ┊ optional later
                              ▼
                    Netlify site password
                              │
                              ┊ when admin has bandwidth
                              ▼
                    student / guardian accounts
```

Code-gated teacher data (`class_lesson_progress`, `behavior_students`) already sits beside
this stack. It does not replace the later accounts slice.

---

## Access for this year

**Do not build student or guardian accounts for 9/2.** School starts 2026-09-02. Admin staff
will not have time to review a new identity system or LMS integration. V1 was right: slides
do not need identity.

### FERPA vs a shared class password

FERPA is the wrong hammer for gating curriculum. It applies when you store education records
(a named student plus progress, grades, or submissions). Serving lesson slides is not that.

A shared class password is also not auth: nobody is identified, nothing is stored about a
child. It is a gate on curriculum, not a roster.

### Three layers

1. **Now (already live):** unlisted class link. `noindex` plus knowing the URL. Zero admin.
   This is what 9/2 uses.
2. **Optional upgrade, no district:** shared class password as a **Netlify visitor / site
   password** (HTTP basic auth on the host). One string on the board, rotatable, still static
   files, still no PII. That is the V1 “class password.” Do **not** build an in-app password
   page — static HTML in `out/` is still fetchable, and a fake login invites the FERPA
   conversation you are avoiding.
3. **Later, when admin has time:** real accounts (guardian-first sketch below), keyed off
   lesson codes and skill strings. LMS integration waits until that conversation can happen;
   do not block the portal on discovering whether One City already has a parent portal.

This document does **not** flip the Netlify password on. It records it as the intended next
gate if the URL leaks or you want a board-writable lock. Marketing currently links the portal
from a public page; turning the password on would break that CTA for strangers (usually
desired).

---

## Content model

Unchanged from V1. A slide page is one lesson — a scrolling page, not a deck you arrow
through.

| Block | What it holds |
| --- | --- |
| Header | Lesson code or strand, grade band, one-line focus statement |
| Do Now | Silent journal prompt (K–2 uses Movement instead, inside the deck) |
| Concept | The teaching text, short and in the register of the grade band |
| Listening | Click-to-load YouTube embed |
| Activate | The game or activity for the day (I do / We do / You do) |
| Breaks | Gifs and memes between blocks — attention resets, not decoration |
| Links | Vanguard Song pages, resources, worksheets, anything the lesson points at |
| Footer | Previous and next lesson in the sequence |

Optional frontmatter (`skills`, `investigate`) feeds the Skills hub. Tags live on the lesson
file. That is not a CMS and not a database.

Embeds stay click-to-load; every embed also links out to YouTube. Blocks map to
[playbook/lesson-structure.md](../playbook/lesson-structure.md).

---

## Stack

Chosen and running — not a recommendation:

- **Next.js** in `portal/` with `output: "export"`, `trailingSlash: true`
- **Netlify** site: `koalacademy-portal.netlify.app` (separate from the marketing Vite site)
- **MDX** under `portal/content/lessons/`; `getAllLessons()` indexes at build time
- **No server runtime**, no search API, no lessons table

Root `package.json` has Supabase CLI (`npx supabase …`). Salad Bowl, Teacher mode, and
Class Buckets share hosted project `fyurkhqtujqrbqlsiuyu` (see
[docs/salad-bowl-v1.md](../../../docs/salad-bowl-v1.md) and
[docs/portal.md](../../../docs/portal.md)). An accounts schema is still a separate, later
slice.

---

## Accounts later

Not built this year. Recorded so V1.1 choices stay compatible.

**Supabase** remains the recommendation when accounts arrive: hosted Postgres with row-level
security, built-in auth, storage for student uploads. Free tier covers a single-school pilot.

First schema sketch (roster/progress — **not** a lessons catalog). Two of these ideas
already have a narrower stand-in: `class_lesson_progress` is per-section Lesson / Review /
Lab checks, and `behavior_students` is the marble roster. Neither is the per-student
progress table below.

| Table | Holds |
| --- | --- |
| `students` | Name, grade, school; the roster |
| `guardians` | Parent/guardian accounts, one row per adult |
| `guardian_students` | Join table — a guardian may have several children, a child several guardians |
| `classes` | A section: grade, teacher, meeting cadence |
| `enrollments` | Student in class, for a given year |
| `assignments` | Lesson code or strand session, due date, class |
| `progress` | Per student, per assignment: status, submitted date, teacher note |

When progress lands, key off the same lowercase skill strings and lesson codes already used
in MDX. Do not move curriculum text into Postgres.

Guardian-only accounts stay the simpler first pass: fewer minors holding credentials, a
smaller consent conversation with the district. Student accounts only become necessary when
students submit work or earn points directly.

---

## Out of scope this year

| Feature | Notes |
| --- | --- |
| Student and guardian login | Needs district bandwidth; not for 9/2 |
| LMS integration | Deferred until admin can discuss existing parent portals |
| Progress / homework tracker | Needs identity; do not compete with an LMS this year |
| Project workspace | Original long-term portal concept; still later |
| In-app class password | Use Netlify host password if you need a gate |
| Lessons CMS / `lessons` table | Content stays in git |

---

## Closed questions

| # | V1 question | V1.1 decision |
| --- | --- | --- |
| 1 | Public, unlisted class link, or shared class password? | Unlisted now; host-level class password optional; no student login |
| 2 | `portal.koalacademy.*`, `/portal`, or replace `portal.html`? | Separate Netlify app (`koalacademy-portal.netlify.app`). Marketing `portal.html` stays a bridge. Custom domain later, not 9/2 |
| 3 | Who authors slide content, and at what pace? | Teacher + repo workflow; MDX under `portal/content/lessons/`; write ahead of the rotation (Unit 1 first). Split commits: curriculum on `main`, portal on `portalv1-dev` |
| 4 | Do K–5 slides face students? | **All lessons/slides face students** — K–2 included. Same page for projection and hallway phones |
| 5 | Does One City already run an LMS with a parent portal? | Out of scope until admin has bandwidth. Progress tracker does not compete with an LMS this year |
| 6 | Fold marketing into the portal app? | Stay separate (Vite marketing site + Next portal). Two Netlify hosts |

---

## Related documents

- Original V1 proposal (frozen): [portal-v1.md](portal-v1.md)
- Portal how-to (routes, Teacher mode, Buckets, homerooms, deploy): [docs/portal.md](../../../docs/portal.md)
- Next-feature notes (Circle of Fifths, Skills — both shipped): [docs/portal-next.md](../../../docs/portal-next.md)
- Salad Bowl: [docs/salad-bowl-v1.md](../../../docs/salad-bowl-v1.md)
- Live portal: [https://koalacademy-portal.netlify.app/](https://koalacademy-portal.netlify.app/)
- Marketing bridge: [site/portal.html](../../../site/portal.html)
- Full 6–8 lesson content and codes: [curriculum/KOALACADEMY.md](../../KOALACADEMY.md)
- K–2 strand codes: [scope-and-sequence.md](../scope-and-sequence.md)
- Class period structure: [playbook/lesson-structure.md](../playbook/lesson-structure.md)
- Vanguard Song framework: [vanguard-songs/framework.md](../vanguard-songs/framework.md)
