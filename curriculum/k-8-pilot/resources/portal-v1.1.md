# Student Portal — V1.1

> **Status: living spec** as of 2026-08-24. The lesson slide hub shipped. School year starts
> 2026-09-02. The original proposal is frozen at
> [portal-v1.md](portal-v1.md).

This file records what is live, what is still content work (not platform), and the access
decision for the pilot year: no student or guardian accounts; unlisted class link now;
optional host-level class password later — not FERPA auth.

---

## Purpose

The portal is where students go to see the lesson: a page per lesson, phone-readable,
holding the same material a projector would show — the concept, the listening example, the
links, and the jokes that keep a room awake. It is useful on day one of the pilot with no
accounts, no database, and no submission flow. Everything heavier gets built on top of it.

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
| Band indexes | `/grades/k-2/`, `/grades/3-5/`, `/grades/6-8/` (not per single grade) |
| No login | [`layout.tsx`](../../../portal/src/app/layout.tsx) is `robots: noindex, nofollow` |
| Hardware / LCD tokens | Copied into [`portal/src/styles/tokens.css`](../../../portal/src/styles/tokens.css) |
| Marketing bridge | [`site/portal.html`](../../../site/portal.html) links the live portal |

### Content in the portal today

Eight MDX files under [`portal/content/lessons/`](../../../portal/content/lessons/) versus
~50 6–8 lessons in [KOALACADEMY.md](../../KOALACADEMY.md) plus K–5 strands.

| Band | In the portal today |
| --- | --- |
| 6–8 | INTRO-68, BMT.1, KSN.1, KSN.2, BMT.4 |
| 3–5 | INTRO-35 |
| K–2 | INTRO-K2, BEAT-K2-01 |

Missing: BMT.2–3, BMT.5, KSN.3–5, and Units 2–5; K–5 strands after the first BEAT. Day one
(9/2) can run on intros + early Unit 1. The rest is writing ahead of the 6-day rotation,
using the split-lesson workflow — not a platform rewrite.

### Already past V1

Notation sandbox, Circle of Fifths, and Skills hub are live. See
[docs/portal-next.md](../../../docs/portal-next.md) for the product notes that drove them.

Profile, settings, submissions, and playlists are stubs (“auth not wired”).
[`supabase/`](../../../supabase/) has `config.toml` only — no migrations, unused until a
later accounts slice.

### Still true from V1

Lesson text stays Markdown/MDX in the repo. A later database references lesson codes as
strings. Do not build a lessons CMS table — it would duplicate git and fight static export.

```text
MDX (portal/content/lessons)
        │
        ▼
Static HTML export ──► Unlisted Netlify URL  (9/2)
                              │
                              ┊ optional later
                              ▼
                    Netlify site password
                              │
                              ┊ when admin has bandwidth
                              ▼
                    students / progress tables
```

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

A slide page is one lesson — a scrolling page, not a deck you arrow
through. Shape is **Do Now → Lesson → Activate**.

| Block | What it holds |
| --- | --- |
| Header | Lesson code or strand, grade band, one-line focus statement |
| Do Now | Posted work at the top of every lesson (3–5 min during Threshold) |
| Concept | The teaching text, short and in the register of the grade band |
| Listening | Click-to-load YouTube embed |
| Activate | The You-do — game or hands-on work for the day (formerly Do) |
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

Root `package.json` has Supabase CLI (`npx supabase …`). Config exists; schema does not.
Linking a remote project and writing migrations is a separate accounts/progress slice.

---

## Accounts later

Not built this year. Recorded so V1.1 choices stay compatible.

**Supabase** remains the recommendation when accounts arrive: hosted Postgres with row-level
security, built-in auth, storage for student uploads. Free tier covers a single-school pilot.

First schema sketch (roster/progress — **not** a lessons catalog):

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
- Next-feature notes (Circle of Fifths, Skills): [docs/portal-next.md](../../../docs/portal-next.md)
- Live portal: [https://koalacademy-portal.netlify.app/](https://koalacademy-portal.netlify.app/)
- Marketing bridge: [site/portal.html](../../../site/portal.html)
- Full 6–8 lesson content and codes: [curriculum/KOALACADEMY.md](../../KOALACADEMY.md)
- K–5 strand codes: [scope-and-sequence.md](../scope-and-sequence.md)
- Class period structure: [playbook/lesson-structure.md](../playbook/lesson-structure.md)
- Vanguard Song framework: [vanguard-songs/framework.md](../vanguard-songs/framework.md)
