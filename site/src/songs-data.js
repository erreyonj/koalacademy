/* Vanguard Song players, keyed by stage slot.
   These are temporary DEMO tracks so the players work during the admin
   walkthrough — only 8-1 is an actual repertoire candidate. When a grade's
   anchor locks, replace that slot's id/title/artist and set locked: true;
   the song pages themselves need no edits.

   Every id below is an official artist, label, or topic upload and was
   confirmed playable in an embed. Rights holders can revoke embedding at any
   time, so re-run `npm run check:embeds` before presenting. */

export const SONGS = {
  // K + 1 — clear steady beat, obvious repeats
  k: { id: "rBrd_3VMC3c", title: "What a Wonderful World", artist: "Louis Armstrong" },
  1: { id: "EQlPq4z2gBc", title: "The Entertainer", artist: "Scott Joplin" },

  // 2 + 3 — section contrast, then swing and minor-key mood
  2: { id: "OqvHWUZZdP0", title: "In the Hall of the Mountain King", artist: "Grieg · London Symphony Orchestra" },
  "3-1": { id: "r2G1fKYFgVU", title: "Take the “A” Train", artist: "Duke Ellington and His Famous Orchestra" },
  "3-2": { id: "ZDWMoJz8OYU", title: "Danse Macabre", artist: "Saint-Saëns · WDR Funkhausorchester" },

  // 4 + 5 — funk instrumentation, then the famous breaks
  "4-1": { id: "ftdZ363R9kQ", title: "Superstition", artist: "Stevie Wonder" },
  "4-2": { id: "Gs069dndIYk", title: "September", artist: "Earth, Wind & Fire" },
  "5-1": { id: "HrrWhCbZAyY", title: "Amen, Brother", artist: "The Winstons" },
  "5-2": { id: "-Udnb6F1A0g", title: "Apache", artist: "Incredible Bongo Band" },

  // 6 — sampled drums, jazz-funk form, arrangement space
  "6-1": { id: "QXw6YZltKJk", title: "Funky Drummer (Pts. 1 & 2)", artist: "James Brown" },
  "6-2": { id: "iqomTAiRnVM", title: "Chameleon", artist: "Herbie Hancock" },
  "6-3": { id: "YuKfiH0Scao", title: "Ain’t No Sunshine", artist: "Bill Withers" },

  // 7 — arrangement depth, vocal form, minimal groove
  "7-1": { id: "o5TmORitlKk", title: "What’s Going On", artist: "Marvin Gaye" },
  "7-2": { id: "A134hShx_gw", title: "Respect", artist: "Aretha Franklin" },
  "7-3": { id: "rY0WxgSXdEE", title: "Another One Bites the Dust", artist: "Queen" },

  // 8 — the real candidate, then production and clearance case studies
  "8-1": {
    id: "Ppqln-S3vAo",
    title: "Forever YHWH (cover)",
    artist: "Jordan G. Welch",
    candidate: true,
  },
  "8-2": { id: "Zi_XLOBDo_Y", title: "Billie Jean", artist: "Michael Jackson" },
  "8-3": { id: "WRWtvbyprgo", title: "Footsteps in the Dark, Pts. 1 & 2", artist: "The Isley Brothers" },
};
