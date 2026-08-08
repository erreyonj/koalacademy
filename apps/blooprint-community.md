# Blooprint: Community

Native iOS app. Swift and SwiftUI.

## Objective

Blooprint: Community is the social media arm of the Blooprint suite, allowing creators to display,
share, and interact with their mobile DAW files as complete units. A user can share a Koala
project file and let others download it and pick up where the original creator left off on a
musical idea.

## The core idea

Existing music social platforms share the output: a bounce, a clip, a finished track. Blooprint:
Community shares the project. The unit of exchange is the editable session, not the render.

That changes what a post can be. A shared project is simultaneously a piece of music, a
demonstration of technique, and an invitation to continue. Anyone who downloads it can open the
same pads, the same chops, and the same patterns the creator was working with, and take the idea
somewhere else.

## Features

### Project-first sharing

- Posts carry a playable preview and the underlying project file
- Project metadata surfaced on the post: source DAW, tempo, key, and sample count
- Download and open directly into the originating app on the user's device

### Continuation and lineage

- Anyone can download a shared project and continue it
- Continuations link back to the original post, forming a visible lineage for an idea
- Creators can see how their ideas developed in other people's hands

### Attribution and rights

- Credits travel with the project file, not just the post description
- Structured fields for sampled source material, in line with the documentation practices taught
  in the curriculum (`SRP.4`)
- Per-project sharing terms so creators state what continuation they are inviting

### Social layer

- Follow creators, browse by DAW, genre, or technique
- Interaction on the specifics: comment on a section, a chop, or a pattern rather than only on
  the whole post
- Discovery weighted toward projects people actually opened and continued

## Technical direction

### Client

- SwiftUI feed and profile surfaces
- AVAudioEngine for preview playback
- `UTType` declarations and document handoff so project files open in Koala and other mobile DAWs
  via the iOS share and Open In flows
- Background upload and download with progress that survives app suspension

### Backend

- Object storage for project files with signed, expiring download URLs
- Metadata, lineage graph, and social records in a hosted backend
- Server-side preview transcoding so feed playback does not depend on the source DAW
- Moderation and takedown tooling, which a platform hosting sampled material requires from day
  one

### Constraints to design around

- Project file formats are DAW-specific and undocumented; the platform treats them as opaque
  blobs with declared types rather than parsing them
- File sizes are substantial once samples are embedded, so upload and storage cost matter
- Hosting user-uploaded material that may contain copyrighted samples requires clear terms, a
  reporting path, and a documented response process

## Relationship to Koalacademy

Blooprint: Community is the natural home for student work after the course ends. It extends the
crediting and documentation habits from Unit 3 (`SRP.1`, `SRP.4`) and the collaborative critique
from Units 4 and 5 into a practice students can continue on their own. It is referenced at the
close of the course in `PERFORMANCE.5`.

## Status

Concept stage. No implementation exists yet.
