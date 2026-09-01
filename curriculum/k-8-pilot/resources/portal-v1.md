# Student Portal — V1

> **Status: proposal.** Nothing is built. This document fixes the scope of a first release,
> recommends a stack, and records what the later features (accounts, progress tracking,
> minigames) need so V1 does not have to be thrown away to reach them.

## Purpose

The portal is where students go to see the lesson. Today the marketing site has a placeholder
at [site/portal.html](../../../site/portal.html) that describes an eventual project workspace
for 6-8. That workspace is still the long-term goal, but it is not the first thing worth
building.

The first thing worth building is the **lesson slide hub**: a page per lesson, phone-readable,
holding the same material a projector would show — the concept, the listening example, the
links, and the jokes that keep a room awake. It is useful on day one of the pilot with no
accounts, no database, and no submission flow. Everything heavier gets built on top of it.

## V1 scope

**In:**

- A slide page for every K-8 lesson: 6-8 by Koalacademy lesson code (`BMT.1`, `KSN.3`, `SRP.5`,
  …) and K-5 by strand session (`BEAT`, `PITCH`, `TIMBRE`, `FORM`, `NOTATE`, `LISTEN`, `CREATE`)
- An index per grade and per band so a teacher or student can find today's lesson in two taps
- Public or unlisted class-link access — no login
- Mobile-first layout; assume a phone in a hallway, not a laptop at a desk
- Projector-usable: the same page has to read from the back of a classroom

**Out (V1):**

- Student and guardian accounts
- Any student-submitted work, homework tracking, or grades
- Anything that needs a database or a server

**Why no auth in V1.** Accounts are the expensive part — student data in a school setting
carries FERPA and district-approval weight, and guardian accounts double the surface. None of
it is needed for a student to read a slide. Deferring auth means V1 can ship as static files
and still be genuinely useful, while the schema and hosting choices below keep the door open.

Grade 6-8 content is fully specified in [KOALACADEMY.md](../../KOALACADEMY.md) — fifty lessons
across five units — so those slides can be written now. K-5 slides follow the strand definitions
in [scope-and-sequence.md](../scope-and-sequence.md) and will land incrementally as per-strand
progressions fill in.

## Content model

A slide page is one lesson. It is a scrolling page, not a deck of slides you arrow through — a
single page is easier to build, easier to link into, and far better on a phone.

| Block | What it holds |
| --- | --- |
| Header | Lesson code or strand, grade band, one-line focus statement |
| Concept | The teaching text, short and in the register of the grade band |
| Listening | Click-to-load YouTube embed, reusing the pattern in [site/src/embeds.js](../../../site/src/embeds.js) |
| Do | The game or activity for the day, linking to [playbook/games.md](../playbook/games.md). **Superseded:** this block is now **Activate**; lessons also open with **Do Now**. See [portal-v1.1.md](portal-v1.1.md). |
| Breaks | Gifs and memes between blocks — attention resets, not decoration |
| Links | Vanguard Song pages, resources, worksheets, anything the lesson points at |
| Footer | Previous and next lesson in the sequence |

Two constraints carry over from the existing site and should not be relitigated:

- **Embeds stay click-to-load.** Nothing is requested from YouTube until someone presses play,
  and every embed also links out to `youtube.com` so the lesson survives a rights holder
  disabling embedding. The current site enforces this with `npm run check:embeds`.
- **Blocks map to the lesson structure** in
  [playbook/lesson-structure.md](../playbook/lesson-structure.md), so a slide page is a legible
  version of a real class period rather than a separate artifact to maintain.

Lesson content is authored as MDX or Markdown with frontmatter, not hand-written HTML. The
curriculum is already Markdown; keeping slides in the same form means content edits do not
require touching components.

## Recommended stack

**Next.js with static export, deployed to Netlify.**

The portal is a separate app from the marketing site, living at `portal/` in this repository
and deployed to its own path or subdomain. The marketing site stays exactly as it is — Vite 7,
vanilla JS, multi-page — and links across.

Why Next.js over extending the current Vite multi-page setup:

- **Component reuse across 50+ pages.** The slide shell, embed, callout, and nav are the same on
  every lesson. The Vite site copies its page chrome into each HTML file by hand, which is fine
  for a dozen marketing pages and painful for fifty-plus lesson pages that will be edited
  weekly during a pilot year.
- **Routing maps to lesson codes.** `app/lessons/[code]/page.tsx` with `generateStaticParams`
  reading the content directory gives `/lessons/bmt-1` for free, and a new lesson is a new
  Markdown file rather than a new entry in a build config.
- **Content pipeline built in.** MDX support means the concept text, embeds, and callouts live
  in one authorable file.
- **Deployment does not change.** `output: "export"` produces static HTML, so hosting stays the
  same zero-server Netlify build described in [netlify.toml](../../../netlify.toml). No runtime,
  no serverless functions, no cost.
- **It is the same language as the mobile path.** When a native app is on the table, React
  Native and Expo share the language, the data layer, and most of the component thinking.

**The honest alternative.** The existing Vite MPA could carry V1 with no new framework at all —
a build script that renders Markdown lesson files through one HTML template would get most of
the reuse benefit and add roughly zero dependencies. That is the right call if the portal stays
at this size forever. It is the wrong call the moment interactive state enters the picture:
minigames, progress checkmarks, a signed-in header. Those are all on the roadmap, so the
recommendation is to take the framework cost now rather than rewrite in a year.

**Styling.** Reuse the existing design language rather than reinventing it. The hardware/LCD
visual system in [site/src/styles.css](../../../site/src/styles.css) is the brand; the practical
move is extracting its tokens (colors from [docs/brand-palette.md](../../../docs/brand-palette.md),
type scale, the pad and screen treatments) into a small shared layer both apps read.

## Infrastructure for accounts and data

Not built in V1. Recorded here so the V1 choices stay compatible.

**Supabase** is the recommendation when accounts arrive: hosted Postgres with row-level
security, built-in auth, storage for student uploads, and first-class JavaScript and React
Native clients. The relevant properties for this project are that row-level security can
express "a guardian sees only their own children's rows" as a database policy rather than
application code, and that the free tier covers a single-school pilot.

A first schema sketch:

| Table | Holds |
| --- | --- |
| `students` | Name, grade, school; the roster |
| `guardians` | Parent/guardian accounts, one row per adult |
| `guardian_students` | Join table — a guardian may have several children, a child several guardians |
| `classes` | A section: grade, teacher, meeting cadence |
| `enrollments` | Student in class, for a given year |
| `assignments` | Lesson code or strand session, due date, class |
| `progress` | Per student, per assignment: status, submitted date, teacher note |

Two decisions worth making before any of it is written:

- **Do students get accounts, or only guardians?** Guardian-only is dramatically simpler — fewer
  minors holding credentials, a smaller consent conversation with the district — and still
  supports the progress tracker. Student accounts only become necessary when students submit
  work or earn points directly.
- **Where does authoritative content live?** Lesson content should stay in this repository as
  Markdown, with the database referencing lesson codes as strings. Putting curriculum text in a
  database means losing version control over the curriculum, which is the one thing this project
  has done well so far.

Whatever is chosen, the portal reaches it through a single data-access module rather than
calling the client from components. That module is the seam a mobile app reuses.

## Mobile readiness

Mobile browser support is a V1 requirement; a native app is not on the roadmap. What V1 should
do to avoid painting the mobile app into a corner:

- Design at phone width first and treat desktop and projector as the wider case
- Keep tap targets and contrast usable in a classroom, with the accessibility posture already
  established in the [Blooprint suite docs](../../../apps/README.md): VoiceOver, Dynamic Type,
  reduced motion
- Keep all data access behind one module, so a React Native client swaps the UI and not the logic
- Model content as data — a lesson is frontmatter plus body, not hand-authored HTML — so the
  same content can render in a native view later

**An open tension worth naming:** the Blooprint apps are specified as native Swift and SwiftUI,
while the natural mobile path for a React portal is React Native. These are different codebases
with different skill demands. The portal and Blooprint solve different problems — one is
coursework delivery, the other is instrument-grade audio tooling — so two stacks may simply be
correct. It should be a decision, not an accident.

## Out of scope, noted for later

| Feature | Sketch |
| --- | --- |
| Student and guardian login | Guardian-first; district and FERPA review before any student data is stored |
| Progress tracker | A parent-facing dashboard: what was covered, what is assigned, how their child is doing against grade goals — the reporting counterpart to [written-work.md](written-work.md) |
| Homework tracker | Assignment list per student with completion state; feeds the progress tracker |
| Music theory minigames | Short interactive drills — note naming, interval ear training, rhythm matching — tied to the same strand and lesson codes as the slides |
| Points and unlocks | Points earned in minigames and class, spendable on unlocked course content or classroom rewards; needs a considered incentive design, not just a counter |
| Project workspace | The original portal concept: three declared sample sources per 6-8 student, rights justifications, drafts, and the live performance capture |
| Native app | React Native/Expo, reusing the data layer; only after the web portal has real usage |

## Open questions

1. Public, unlisted class link, or a shared class password for V1? Unlisted links are the
   lightest option that still keeps the pilot's material off search engines.
2. Does the portal live at `portal.koalacademy.*`, at `/portal` on the existing domain, or
   replace [site/portal.html](../../../site/portal.html) outright?
3. Who authors slide content, and at what pace? Fifty 6-8 lessons is a real writing project even
   with [KOALACADEMY.md](../../KOALACADEMY.md) as the source.
4. Do K-5 slides face students at all, or are they a teacher-facing projection surface? A
   kindergartener is not opening a link on a phone.
5. Does One City Schools already run an LMS with a parent portal? If so, the progress tracker
   may be duplicated effort and should integrate rather than compete.
6. Does the marketing site eventually fold into the portal app, or do the two stay separate
   permanently?

## Related documents

- Current portal placeholder: [site/portal.html](../../../site/portal.html)
- Full 6-8 lesson content and codes: [curriculum/KOALACADEMY.md](../../KOALACADEMY.md)
- K-5 strand codes: [scope-and-sequence.md](../scope-and-sequence.md)
- Class period structure: [playbook/lesson-structure.md](../playbook/lesson-structure.md)
- Vanguard Song framework: [vanguard-songs/framework.md](../vanguard-songs/framework.md)
- Companion iOS app concepts: [apps/README.md](../../../apps/README.md)
