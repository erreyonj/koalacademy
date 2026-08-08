# Blooprint: Notation

Native iOS app. Swift and SwiftUI.

## Objective

An accessibility app for individuals with reading disabilities or other difficulties with
traditional music notation, using interactive games to teach music theory and staff reading.

The premise is that struggling to read notation is a reading problem, not a musicianship problem.
A student can hear intervals accurately, play by ear, and understand harmony while still mixing up
notes on the staff. Blooprint: Notation treats that as a solvable interface problem rather than a
limit on the student.

## Features

### Accessibility focus

- Designed first for learners with reading disabilities, then generalized
- Interactive games in place of drills and flashcards
- Adjustable staff rendering: spacing, size, contrast, and color coding of note positions
- Full VoiceOver support, Dynamic Type, and reduced-motion alternatives for every animation

### Microphone-based feedback

- Uses the device microphone to hear the user play a sequence of notes on any instrument
- Immediate feedback on whether the played pitches match the notated ones
- Turns reading practice into playing practice, which keeps the ear involved in a visual task

### Theory component

- A theory track that builds understanding alongside reading fluency
- Progresses as the user advances: notes and staff positions, then intervals, key signatures,
  scales, modes, and rhythm
- Concepts introduced in the order the Koalacademy theory component uses them

## Technical direction

### Notation rendering

- Staff, clef, note, and rest views built as composable SwiftUI views, each carrying its own
  state and correctness attributes
- Interactive note animations providing visual feedback on correct and incorrect answers
- Layout driven by a data model of the musical content, so rendering settings can change without
  changing the content

### Pitch detection

- AVAudioEngine input tap for live microphone capture
- Pitch detection via AudioKit or an equivalent DSP layer, tuned for monophonic input from voice
  and common classroom instruments
- Tolerance and timing windows configurable per exercise, so early lessons are forgiving

### Progression and data

- Exercise progression, error patterns, and mastery state persisted locally with SwiftData
- Error tracking that identifies which specific staff positions or intervals a user consistently
  confuses, and adapts the exercise mix accordingly
- Offline-first; microphone exercises require no network

## Relationship to Koalacademy

Blooprint: Notation covers the notation and rhythm material from Unit 1 (`BMT.1`–`BMT.5`) as
self-paced practice. It exists in part because that material is where students in a production
course are most likely to disengage.

## Status

Concept stage. No implementation exists yet.
