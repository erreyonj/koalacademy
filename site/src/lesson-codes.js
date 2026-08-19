/**
 * Canonical lesson-code descriptions for tooltip display.
 *
 * 6–8 codes map to Koalacademy lessons (KOALACADEMY.md).
 * K–5 codes map to concept strands used across the elementary band.
 *
 * Range entries (e.g. "BMT") describe the component; numbered entries
 * (e.g. "BMT.1") describe the individual lesson. The tooltip resolver
 * tries the exact code first, then falls back to the component prefix.
 */

const codes = {
  // ── Unit 1: Music Theory and Koala Sampler Navigation ──────────────
  BMT:            "Basic Music Theory",
  "BMT.1":        "Basic Music Theory — intervals, scales, chords, key signatures",
  "BMT.2":        "Blues Scale, Dorian and Phrygian Modes",
  "BMT.3":        "Relative and Parallel Keys",
  "BMT.4":        "Intro to Music Notation and Rhythm",
  "BMT.5":        "3/4 and 6/8 Time, and Basic Drum Sounds",

  KSN:            "Koala Sampler Navigation",
  "KSN.1":        "Sample Tab",
  "KSN.2":        "Sequence Tab",
  "KSN.3":        "Perform Tab",
  "KSN.4":        "Step Sequencer View",
  "KSN.5":        "File Management and Auxiliary Screens",

  // ── Unit 2: Understanding Sampling and Digital Drumming ────────────
  US:             "Understanding Sampling",
  "US.1":         "Sampling as a Practice",
  "US.2":         "Case Study: \u201CWe Need a Resolution\u201D",
  "US.3":         "Case Study: \u201CThrough the Wire\u201D",
  "US.4":         "Case Study: \u201CN.Y. State of Mind\u201D",
  "US.5":         "Case Study: \u201CNo Problem\u201D",

  D4:             "Digital Drumming / Drum Design",
  "D4.1":         "Drum Sounds and Roles",
  "D4.2":         "Building Patterns",
  "D4.3":         "Understanding Swing",
  "D4.4":         "Note Repeat",
  "D4.5":         "Drum FX and Processing",

  // ── Unit 3: Song Forms and Sampling Rights ─────────────────────────
  SONGFORM:       "Song Forms in Popular Music",
  "SONGFORM.1":   "Intro to Song Form",
  "SONGFORM.2":   "AABA and Simple Variations",
  "SONGFORM.3":   "Case Study: \u201CSicko Mode\u201D",
  "SONGFORM.4":   "Case Study: \u201CSelf Control\u201D",
  "SONGFORM.5":   "Beat Flips and Transitions",

  SRP:            "Sampling Rights and Permissions",
  "SRP.1":        "Ethical Use of Sampling",
  "SRP.2":        "Song Ownership, Publishing, and Songwriting",
  "SRP.3":        "Obtaining Permission",
  "SRP.4":        "Gray Areas and Non-Copyrighted Material",
  "SRP.5":        "Case Study: Ed Sheeran v. Xscape / Robin Thicke v. the Marvin Gaye Estate",

  // ── Unit 4: Defining Your Sound and Artist Appreciation ────────────
  DYS:            "Defining Your Sound // Applied Theory",
  "DYS.1":        "Honing a Sound\u2026 Your Sound",
  "DYS.2":        "Playlist Activity",
  "DYS.3":        "Playlist Analysis I: Theory and Form",
  "DYS.4":        "Playlist Analysis II: Production and Sampling",
  "DYS.5":        "Review Week",

  AW:             "Artist Appreciation",
  "AW.1":         "Final Project Song Selection",
  "AW.2":         "Final Project Class Proposals and Discussion",
  "AW.3":         "Final Project Work Week I: Sources and Foundations",
  "AW.4":         "Final Project Work Week II: Arrangement and Refinement",
  "AW.5":         "Artist Appreciation Presentations",

  // ── Unit 5: Advanced Effects Processing and Performance ────────────
  AEP:            "Advanced Effects Processing",
  "AEP.1":        "Perform Tab II",
  "AEP.2":        "Expanding Ideas in Sequencing with FX",
  "AEP.3":        "One-on-One Follow-Ups on Final Projects",
  "AEP.4":        "Koala Versus Other Mobile DAWs",
  "AEP.5":        "Building a Live Perform Set",

  PERFORMANCE:    "Performing with Koala Sampler",
  "PERFORMANCE.1":"Final Project",
  "PERFORMANCE.2":"Performance Check-In",
  "PERFORMANCE.3":"Live Recording",
  "PERFORMANCE.4":"Class Presentations I",
  "PERFORMANCE.5":"Class Presentations II and Course Close",

  // ── K–5 concept strands ────────────────────────────────────────────
  BEAT:           "Steady beat, pulse, and rest — the rhythmic foundation strand",
  PITCH:          "High/low, melody, echo singing, and tonal awareness",
  TIMBRE:         "Sound qualities — smooth, scratchy, bright, dark",
  FORM:           "Same vs. different, AABA, musical structure",
  NOTATE:         "Reading and writing music symbols",
  LISTEN:         "Focused listening and Vanguard Song work",
  CREATE:         "Improvisation, composition, and creative exploration",
};

export default codes;
