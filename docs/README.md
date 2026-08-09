# Koalacademy Course Documentation

<p align="center">
  <img src="../curriculum/assets/ka-main-smile-decal-no-bg.png" alt="Koalacademy logo" width="160" />
</p>

Brand colors for future design work live in [brand-palette.md](./brand-palette.md).

## What Koalacademy is

Koalacademy is a 20-week music production curriculum designed for urban school districts. It
teaches students to produce original music using [Koala Sampler](https://www.koalasampler.com),
an inexpensive and approachable sampler for iOS, and pairs that hands-on work with the music
theory, history, and rights knowledge that production actually requires.

The course is built around a single premise: students learn production fastest when theory is
introduced in service of something they are trying to make. Every theory concept in the course
has a corresponding application in Koala, and the whole course converges on one original project
built from samples the students choose themselves.

The complete course content lives in
[curriculum/KOALACADEMY.md](../curriculum/KOALACADEMY.md).

## Who it is for

- Middle and high school students, no prior production experience assumed
- Students who already make beats but have no formal theory or industry knowledge
- Programs that need a low-cost production course; Koala runs on iOS devices schools often
  already have, without a computer lab or a per-seat DAW license

## Course outcomes

By the end of the course, a student can:

- Identify keys, modes, meters, and song forms by ear and explain them in musical terms
- Navigate Koala Sampler fluently: sampling, chopping, sequencing, effects, and file management
- Design drum patterns with intentional groove, swing, and processing
- Analyze a record's production and identify what makes it work
- Explain sampling ethics, song ownership, publishing, and clearance paths
- Describe their own developing sound and defend their creative choices
- Build a complete original project from three self-selected sampled sources
- Perform that project live and capture a live recording of it

## Structure

Five units, two components each, five lessons per component. Each unit spans roughly four weeks.

| Unit | Title | Components | Folder |
| --- | --- | --- | --- |
| 1 | Music Theory and Koala Sampler Navigation | Basic Music Theory (`BMT`), Koala Sampler Navigation (`KSN`) | [unit-01](../units/unit-01-music-theory-and-koala-navigation) |
| 2 | Understanding Sampling and Digital Drumming / Drum Design | Understanding Sampling (`US`), Digital Drumming (`D4`) | [unit-02](../units/unit-02-sampling-and-digital-drumming) |
| 3 | Song Forms in Popular Music and Sampling Rights | Song Forms (`SONGFORM`), Sampling Rights and Permissions (`SRP`) | [unit-03](../units/unit-03-song-forms-and-sampling-rights) |
| 4 | Defining Your Sound and Artist Appreciation | Defining Your Sound (`DYS`), Artist Appreciation (`AW`) | [unit-04](../units/unit-04-defining-your-sound-and-artist-appreciation) |
| 5 | Advanced Effects Processing and Performing with Koala Sampler | Advanced Effects Processing (`AEP`), Performing with Koala (`PERFORMANCE`) | [unit-05](../units/unit-05-advanced-effects-and-performance) |

Units 1 through 3 build technique, context, and legal literacy. Unit 4 turns the course over to
the students: they define their own sound, build and analyze a ten-song playlist, and select the
three songs their final project will sample. Unit 5 finishes the project and puts it on stage.

## The final project

The course's assessment spine is one project that begins in Unit 4 and is performed in Unit 5:

1. Build a ten-song playlist representing the student's style (`DYS.2`)
2. Analyze those songs for theory and form (`DYS.3`), then for production and rights (`DYS.4`)
3. Select three songs to sample and justify the choices (`AW.1`)
4. Propose the project to the class and revise it (`AW.2`)
5. Build the project across two work weeks (`AW.3`, `AW.4`)
6. Present the three source songs and honor the original artists (`AW.5`)
7. Refine with advanced effects and one-on-one review (`AEP.1`–`AEP.3`)
8. Restructure the project into a performable set (`AEP.5`)
9. Lock the project, capture a live recording, and perform it for the class
   (`PERFORMANCE.1`–`PERFORMANCE.5`)

## Requirements

**Per student**

- An iOS device (iPhone or iPad) capable of running Koala Sampler
- Koala Sampler
- Headphones
- Storage space for source audio and project backups

**Per classroom**

- Audio playback capable of filling the room, for listening sessions and performances
- A keyboard or piano for theory demonstration
- A means of playing reference recordings for the class
- Optionally, a second mobile DAW on at least one device for the comparison work in `AEP.4`

## Who can teach this course

The ideal teacher for Koalacademy has a deep passion for music and is highly skilled at analyzing
music in detail. They should have a degree in music, audio engineering, live sound, or a related
field, with experience using at least one of the major DAWs such as Logic Pro, Ableton Live, or
Pro Tools. Experience with iOS DAWs such as Koala Sampler, Loopy Pro, or BeatMaker is a plus.

The teacher should have a strong foundation in music theory, including the ability to play
intermediate-level chords and scales on a piano, and a natural ability to teach complex musical
concepts in an accessible way to students of all levels.

Above all, the ideal teacher for Koalacademy should have a genuine desire to help students unlock
their musical potential. They should be patient, encouraging, and willing to invest time and
energy in each student. With these skills and qualities, the teacher will be able to inspire and
empower their students to excel in music production.

## Companion apps

Koala Sampler and other mobile DAWs are excellent foundations, but they are production tools, not
teaching tools. The [Blooprint suite](../apps/README.md) is a set of proposed native iOS apps
that would give this curriculum its own medium: a gamified production trainer, an accessibility-
focused notation app, and a community layer for sharing mobile DAW projects as complete, editable
units.

These are product concepts adjacent to the course, not prerequisites for teaching it. The
curriculum stands on its own without them.

## Repository layout

```text
curriculum/KOALACADEMY.md   Full course content — the source of truth
curriculum/assets/          Logo and brand image assets
docs/README.md              This file: course description, requirements, teaching notes
docs/brand-palette.md       v1 color palette and logo reference for design tasks
units/                      Per-unit folders for materials and activities
apps/                       Blooprint suite concepts (native iOS)
```

The original PDF remains in the repository root as an archival reference. All content edits
should be made in `curriculum/KOALACADEMY.md`.
