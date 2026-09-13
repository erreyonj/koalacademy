# 3-5 Band Differentiation — How 3-5 Handles Koala Lessons

**Status: locked — hybrid.** This memo used to weigh two models for running the Koala-coded
lessons in the 3-5 band. It now records the decision. The two options are kept below as
background; the **Decision** section is what the 3-5 Koala ports and lab days follow.

The non-Koala 6-8 lessons (`BMT`, `US`, and later `SONGFORM`, `SRP`, `DYS` analysis) port to
3-5 straight, independent of this memo — see the
[Band model](../scope-and-sequence.md#band-model).

## The question

3-8 shares one Koalacademy spine (see [scope-and-sequence.md](../scope-and-sequence.md)). In
6-8, Koala lessons run **1:1 on iPads**. 3-5 does **not** get 1:1 student devices
([teaching-notes.md](../playbook/teaching-notes.md)). So every 6-8 step that says "students do
X in Koala" needs a 3-5 substitute. This memo picks the shape of that substitute.

## Decision — hybrid, split by grade with cascading fallbacks

Classes have actually gone different ways, so the answer is not one shape for the whole band.
One of the two 5th-grade classes showed it is ready for iPads; the second is a maybe. Because
**at least one 5th section will use iPads**, the 3-5 Koala ports are generated now (see
[Band model](../scope-and-sequence.md#band-model)). 3rd and 4th grade do not use the
student-Koala path at all.

**iPad-ready 5th grade** (at least one class; the second when it shows it is ready):
teacher-projected **walkthrough first**, then a **few students at a time** on a **premade**
Koala project while the rest of the class works keyboards/instrumentation or the content
station. This is lighter than full three-station Option 2 — one rotating Koala touchpoint, not
three simultaneous stations. First student-facing Koala day still gates on the `KSN.5`
file-management habits in
[device-privilege-and-file-management.md](device-privilege-and-file-management.md).

**3rd and 4th grade (and any 5th section not yet ready):** no student iPad Koala. Run
**Option 1** — teacher-projected Koala demo plus **instrumentation / keyboard** work. If a
section cannot hold the instrument block, fall back to **half instrumentation / half content
station**.

**Instrument-behavior fallback (any section on instruments):** if instrument time itself
breaks down — behavior, not logistics — drop to **whole-class content / literacy**: Rubin
excerpts, articles, and notebook writing, no instruments and no student Koala. This is the
floor for every section.

```
Koala-coded 3-5 day
├── iPad-ready 5th → projected walkthrough → few-at-a-time premade Koala; others instrument/content
│                     └── if instruments break → whole-class content/literacy
└── 3rd / 4th / not-ready 5th → Option 1 (projected + instrumentation/keyboards)
                                 └── can't hold instrument block → half instrument / half content
                                      └── if instruments break → whole-class content/literacy
```

Premade Koala project files are a **teacher-prep asset** for the ready-5th rotation, not part
of the portal MDX. The ported KSN 3-5 lessons carry all four branches in their Activate block
so a section can drop to the right fallback in the moment.

## Option 1 — Teacher-projected Koala + instrumentation / keyboard days

Remove student-facing Koala. The teacher demonstrates Koala on the projector for a few key
lessons as needed. The hands-on time becomes **instrumentation days**: students who have a
prior instrument bring/use it where available; everyone else practices **keyboards**, of which
there should be enough for each class. (Only one guitar on hand currently, so guitar is
teacher-demo, not a student rotation.)

| Pros | Cons |
| --- | --- |
| More instrument lab days; students build real keyboard/instrument skill faster (your note) | Instrument days need clear practice targets or they drift into free play (your note) |
| Matches the existing keyboard-station + guitar-first methodology already documented | Harder to see every student at once — though that is true of any class (your note) |
| Simpler 3-5 device story: iPad privilege and file-management can stay a 6-8-first concern | Students may want an instrument that is not available (your note) |
| Lower prep — no bank of premade Koala projects to build and maintain | Loses the early Koala UI literacy that the 6-8 course later assumes 3-5 students will have |
| Keyboard supply is already sufficient per class, so the fallback is real, not aspirational | Rotation equity if instruments are scarce beyond keyboards |

**In the hybrid:** this is the default for 3rd/4th and any not-ready 5th section.

## Option 2 — Stations (premade Koala · theory · content)

Set up stations. A **Koala station** with heavily premade projects that 3-5 students interact
with a few at a time. A **theory station** with a theory ticket — e.g. write out the major
scale for three keys with key signatures, clef, and notes on a staff in accurate measures (all
eighth notes, C to C an octave up), or an equivalent worksheet. A **content station** with
articles, excerpts, or videos to review and write about. The content station is the **fallback**
once the others are visited, or for any student without iPad permission. Excerpts draw from
Rick Rubin's *The Creative Act* and others.

| Pros | Cons |
| --- | --- |
| All students still get to attempt Koala (your note) | Students on Koala may need more teacher attention (your note) |
| If behavior does not allow, defaults back to Option 1 (your note) | Harder to keep the non-Koala stations on task (your note) |
| Easy on-ramp for wider literacy — reading and writing built in (your note) | Heavy upfront build: premade projects, theory tickets, and excerpt packs |
| Keeps the vertical path toward 6-8 production intact | Station management is tight on the 55-60 min clock |
| Content station doubles as the written-learning / no-privilege fallback already described in [device-privilege-and-file-management.md](device-privilege-and-file-management.md) | iPad privilege and file habits now arrive earlier in 3-5, not just 6-8 |
| Literacy widens without inventing a parallel syllabus | Noise and attention split three ways |

**In the hybrid:** the ready-5th path borrows Option 2's premade-Koala idea but runs it as a
single rotating touchpoint, not three simultaneous stations. The full three-station version is
not the daily plan.

### Option 2 materials

- Premade Koala project files (to build)
- Theory tickets / worksheets — see [written-work.md](written-work.md) and [booklist.md](booklist.md)
- Content excerpts: Rick Rubin, *The Creative Act: A Way of Being* (added to [booklist.md](booklist.md)); plus articles/videos as gathered

## Decision criteria

The hybrid was chosen against how classes have actually gone:

1. **Behavior** — 3-5 sections vary; the cascade lets each section sit at the level it can hold.
2. **Logistics** — outlets, power strips, and available iPads vs. keyboards per section.
3. **Prep bandwidth** — premade Koala projects are built only for the ready-5th rotation, not the whole band.
4. **Literacy goals** — the content/literacy floor folds reading/writing into every section.
5. **Vertical fit** — ready 5th get early Koala exposure before 6-8; 3-4 lean on instrumentation and literacy.

## Next step

Decision is locked. Remaining work is teacher prep, not curriculum design:

- Build the premade Koala project files for the ready-5th rotation.
- Gather the content/literacy excerpt packs (Rubin + articles) that back the fallback floor.
- Generate the 3-5 Koala ports (`KSN.1`, `KSN.2`, `KSN.4`, `KSN.5`) with the four-branch Activate; later hands-on `D4` / `AEP` / `PERFORMANCE` follow the same hybrid when they exist.
