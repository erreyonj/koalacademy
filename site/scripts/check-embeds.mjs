/* Confirm every wired Vanguard Song is still playable in an embed.
   Run before a demo: npm run check:embeds

   Two things make this check easy to get wrong:
   1. youtube-nocookie.com/embed/ID answers "Error 153" unless a Referer is
      sent, which looks like every video is blocked.
   2. The embed payload carries playableInEmbed as escaped JSON, so the marker
      reads playableInEmbed\":true — a plain match for "playableInEmbed":true
      silently finds nothing.

   Rights holders can revoke embedding at any time, so a red line here means
   swap the id in src/songs-data.js, not that the site is broken. */

import { SONGS } from "../src/songs-data.js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const REFERER = "https://koalacademy.netlify.app/";

async function check(id) {
  const oembedUrl =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);

  const oembed = await fetch(oembedUrl);
  let channel = "";
  if (oembed.ok) {
    channel = (await oembed.json()).author_name ?? "";
  }

  const embed = await fetch(`https://www.youtube-nocookie.com/embed/${id}`, {
    headers: { "User-Agent": UA, Referer: REFERER },
  });
  const body = await embed.text();

  const playable =
    body.includes('playableInEmbed\\":true') || body.includes('"playableInEmbed":true');
  const blocked =
    body.includes('playableInEmbed\\":false') ||
    body.includes("UNPLAYABLE") ||
    body.includes("Video unavailable");

  return {
    // 401 is how YouTube reports an embedding-disabled video; 404/400 means gone.
    status: oembed.status,
    channel,
    ok: oembed.ok && playable && !blocked,
    noReferer: body.includes("Error 153"),
  };
}

const slots = Object.entries(SONGS);
const failures = [];

for (const [slot, track] of slots) {
  const r = await check(track.id);
  if (!r.ok) failures.push({ slot, ...track, ...r });
  const flag = r.ok ? "ok  " : "FAIL";
  console.log(
    `${flag} ${slot.padEnd(5)} ${track.id.padEnd(13)} http=${r.status} ${track.title} — ${track.artist}${r.channel ? `  [${r.channel}]` : ""}`
  );
}

console.log(`\n${slots.length - failures.length}/${slots.length} playable in embeds`);

if (failures.length) {
  console.log("\nReplace these ids in src/songs-data.js:");
  for (const f of failures) {
    console.log(`  ${f.slot}: ${f.id} (${f.title})${f.noReferer ? " — referer rejected" : ""}`);
  }
  process.exit(1);
}
