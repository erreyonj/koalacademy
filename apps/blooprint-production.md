# Blooprint: Production

Native iOS app. Swift and SwiftUI.

## Objective

Teach common practices in digital audio workstations through gamification, enabling users to
develop transferable skills that apply across different workstations rather than skills locked to
one piece of software.

## Features

### Gamification

- Game elements teach concrete skills: reverb, delay, drum programming, arrangement, and mixing
- Users progress through lessons by creating parts that combine into complete songs
- Progress is measured by finished musical material, not by lessons marked complete

### DAW integration

- Ableton Link integration for tempo and transport sync with a running session
- Lessons demonstrate how a concept maps to its equivalent in a full DAW, so the skill transfers
  when the user moves to Ableton Live, Logic Pro, or another workstation
- Exported material leaves the app in formats a DAW can actually open

### Lesson-based interface

- A Duolingo-style structure: short, sequential, repeatable lessons with clear progression
- Focus on interactive practice over passive explanation
- Every lesson ends with the user having made something audible

## Technical direction

### Audio

- AVAudioEngine for playback, mixing, and effect processing
- Real-time effect nodes for the concepts being taught, so users hear parameter changes as they
  move them
- Ableton Link via `LinkKit` for tempo and beat-grid sync

### Interface

- SwiftUI for lesson flow, progression, and controls
- Custom gesture-driven controls for parameters where a standard slider misrepresents the
  underlying musical behavior
- Metal-backed rendering only where waveform or spectrum display demands it

### Progression and data

- Lesson and skill progression persisted locally with SwiftData
- Offline-first; no network dependency for core lessons
- Per-lesson audio artifacts retained so users can revisit and rebuild earlier work

### Transferable skills

The design goal that governs every lesson: a user who finishes Blooprint: Production should be
able to sit down in an unfamiliar DAW and know what to look for, even if they have never seen
that interface before.

## Relationship to Koalacademy

Blooprint: Production covers the same ground as the Koala navigation and effects work in Units 1
and 5 (`KSN.1`–`KSN.5`, `AEP.1`–`AEP.2`), but as self-paced practice rather than instructor-led
sessions. In a classroom, it would serve as reinforcement between lessons.

## Status

Concept stage. No implementation exists yet.
