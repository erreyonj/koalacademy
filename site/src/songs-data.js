/* Vanguard Song players, keyed by stage slot.
   locked: true  = repertoire locked in curriculum/k-8-pilot/vanguard-songs/song-list.md
   (no flag)     = temporary DEMO track for format review only

   Grade 8 is fully locked. Grade 7 has songs 1–2 locked; 7-3 is still TBD.
   Grades K–6 remain TBD. When a slot locks, replace id/title/artist and set
   locked: true — the song pages themselves need no edits.

   Re-run `npm run check:embeds` before presenting; rights holders can revoke
   embedding at any time. */

export const SONGS = {
  // K + 1 — demo (anchors TBD)
  k: { id: "rBrd_3VMC3c", title: "What a Wonderful World", artist: "Louis Armstrong" },
  1: { id: "EQlPq4z2gBc", title: "The Entertainer", artist: "Scott Joplin" },

  // 2 + 3 — demo (anchors TBD)
  2: { id: "OqvHWUZZdP0", title: "In the Hall of the Mountain King", artist: "Grieg · London Symphony Orchestra" },
  "3-1": { id: "r2G1fKYFgVU", title: "Take the “A” Train", artist: "Duke Ellington and His Famous Orchestra" },
  "3-2": { id: "ZDWMoJz8OYU", title: "Danse Macabre", artist: "Saint-Saëns · WDR Funkhausorchester" },

  // 4 + 5 — demo (anchors TBD)
  "4-1": { id: "ftdZ363R9kQ", title: "Superstition", artist: "Stevie Wonder" },
  "4-2": { id: "Gs069dndIYk", title: "September", artist: "Earth, Wind & Fire" },
  "5-1": { id: "HrrWhCbZAyY", title: "Amen, Brother", artist: "The Winstons" },
  "5-2": { id: "-Udnb6F1A0g", title: "Apache", artist: "Incredible Bongo Band" },

  // 6 — demo (anchors TBD)
  "6-1": { id: "QXw6YZltKJk", title: "Funky Drummer (Pts. 1 & 2)", artist: "James Brown" },
  "6-2": { id: "iqomTAiRnVM", title: "Chameleon", artist: "Herbie Hancock" },
  "6-3": { id: "YuKfiH0Scao", title: "Ain’t No Sunshine", artist: "Bill Withers" },

  // 7 — songs 1–2 locked; 3 still TBD (demo)
  "7-1": {
    id: "dGR65RWwzg8",
    title: "I’m With You",
    artist: "Avril Lavigne",
    locked: true,
  },
  "7-2": {
    id: "Y_8mUx4VOmo",
    title: "Chicago",
    artist: "Michael Jackson",
    locked: true,
  },
  "7-3": { id: "rY0WxgSXdEE", title: "Another One Bites the Dust", artist: "Queen" },

  // 8 — fully locked
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
