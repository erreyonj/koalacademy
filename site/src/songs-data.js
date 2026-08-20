/* Vanguard Song players, keyed by stage slot.
   locked: true  = repertoire locked in curriculum/k-8-pilot/vanguard-songs/song-list.md
   (no flag)     = temporary DEMO track for format review only

   Grades 6–8 titles are locked. K–5 slots share Companion tracks with MS Primaries
   (grade 6 Primary → K-2; grade 7 Primary → 3-5). When a slot locks, replace
   id/title/artist and set locked: true — the song pages themselves need no edits
   beyond titles/meta already matching song-list.md.

   Re-run `npm run check:embeds` before presenting; rights holders can revoke
   embedding at any time. */

export const SONGS = {
  // K-2 — Companion: grade 6 Primary (Let's Dream In The Moonlight)
  k: {
    id: "308HUieR7mM",
    title: "Let's Dream In The Moonlight",
    artist: "Samara Joy",
    locked: true,
  },
  1: {
    id: "308HUieR7mM",
    title: "Let's Dream In The Moonlight",
    artist: "Samara Joy",
    locked: true,
  },
  2: {
    id: "308HUieR7mM",
    title: "Let's Dream In The Moonlight",
    artist: "Samara Joy",
    locked: true,
  },

  // 3-5 — Companion: grade 7 Primary (Chicago)
  3: {
    id: "Y_8mUx4VOmo",
    title: "Chicago",
    artist: "Michael Jackson",
    locked: true,
  },
  4: {
    id: "Y_8mUx4VOmo",
    title: "Chicago",
    artist: "Michael Jackson",
    locked: true,
  },
  5: {
    id: "Y_8mUx4VOmo",
    title: "Chicago",
    artist: "Michael Jackson",
    locked: true,
  },

  // 6 — locked; 6-1 is Primary + K-2 Companion
  "6-1": {
    id: "308HUieR7mM",
    title: "Let's Dream In The Moonlight",
    artist: "Samara Joy",
    locked: true,
  },
  "6-2": {
    id: "dGR65RWwzg8",
    title: "I'm With You",
    artist: "Avril Lavigne",
    locked: true,
  },
  "6-3": {
    id: "_Pg3a_8K-Mw",
    title: "Happy",
    artist: "NAO",
    locked: true,
  },

  // 7 — locked; 7-2 is Primary + 3-5 Companion
  "7-1": {
    id: "V9PVRfjEBTI",
    title: "Birds of a Feather",
    artist: "Billie Eilish",
    locked: true,
  },
  "7-2": {
    id: "Y_8mUx4VOmo",
    title: "Chicago",
    artist: "Michael Jackson",
    locked: true,
  },
  "7-3": {
    id: "9YicQtP-xyg",
    title: "California Dreaming",
    artist: "José Feliciano",
    locked: true,
  },

  // 8 — fully locked; 8-1 is Primary
  "8-1": {
    id: "Ppqln-S3vAo",
    title: "Forever YHWH (cover)",
    artist: "Jordan G. Welch",
    locked: true,
  },
  "8-2": {
    id: "Cwkej79U3ek",
    title: "A Thousand Miles",
    artist: "Vanessa Carlton",
    locked: true,
  },
  "8-3": {
    id: "eQF7cqkiR6I",
    title: "DO 4 LOVE",
    artist: "Snoh Aalegra",
    locked: true,
  },
};
