# The Blooprint Suite

Koala Sampler and other mobile DAWs are excellent foundations, but they are production tools, not
educational ones. To meaningfully change music education, this curriculum needs its own medium.
The Blooprint suite is that medium: a set of native iOS apps that leverage the popularity of
music production as a hobby and a career, alongside the persistent need for accessibility in
both.

Two of the three apps grew out of a specific accessibility question. It is possible to understand
musical concepts deeply, recognize and play them by ear, and still struggle badly with sight
reading. If musical notation is the equivalent of written language, it follows that someone could
struggle visually with notation the same way a reader struggles with text — mixing up notes on
the staff rather than letters on a page. Traditional notation instruction rarely accounts for
that. Blooprint: Production and Blooprint: Notation both start from the position that the
teaching interface, not the student, is usually what needs to change.

## The apps

| App | Purpose |
| --- | --- |
| [Blooprint: Production](blooprint-production.md) | Teaches transferable DAW practices through gamified lessons |
| [Blooprint: Notation](blooprint-notation.md) | Accessibility-first music theory and notation training |
| [Blooprint: Community](blooprint-community.md) | Social layer for sharing mobile DAW projects as complete, editable units |

## Platform

All three apps are native iOS projects built in Swift and SwiftUI, targeting iPhone and iPad.
That choice follows the curriculum: Koalacademy is taught on iOS devices, so the companion tools
belong on the same devices students already use to make music.

Shared platform assumptions across the suite:

- Swift and SwiftUI, with UIKit interop only where a control genuinely requires it
- AVAudioEngine for playback, recording, and analysis
- Ableton Link for tempo and transport sync where an app benefits from it
- AudioKit or equivalent for pitch detection and DSP where AVFoundation is insufficient
- Accessibility as a build requirement: VoiceOver support, Dynamic Type, reduced motion, and
  sufficient contrast throughout
- Offline-first behavior; school networks are unreliable and student devices are often shared

## Relationship to the curriculum

These are product concepts adjacent to Koalacademy, not prerequisites for teaching it. The
[curriculum](../curriculum/KOALACADEMY.md) works today with Koala Sampler alone. The suite
describes what the course could become with purpose-built tooling behind it.

## Status

Concept stage. These documents capture direction and scope. No implementation exists yet.
