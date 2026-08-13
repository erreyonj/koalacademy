/* Click-to-load YouTube players. Nothing from youtube.com is requested until a
   teacher actually presses a stage, so a nine-anchor page stays cheap.

   Each stage also links out to YouTube, which keeps the lesson reachable if a
   rights holder later revokes embedding (see npm run check:embeds). */

import { SONGS } from "./songs-data.js";

function playerFrame(track) {
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${track.id}?autoplay=1&rel=0`;
  iframe.title = `${track.title} — ${track.artist}`;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.loading = "lazy";
  return iframe;
}

function hintFor(track) {
  if (track.locked) return "Press to load player";
  if (track.candidate) return "Candidate recording — press to load";
  return "Demo track — press to load";
}

function watchLink(track) {
  const p = document.createElement("p");
  p.className = "embed-link";
  const a = document.createElement("a");
  a.href = `https://www.youtube.com/watch?v=${track.id}`;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = "Watch on YouTube";
  p.appendChild(a);
  return p;
}

function load(frame, track) {
  const holder = document.createElement("div");
  holder.className = "embed-frame is-live";
  holder.appendChild(playerFrame(track));
  frame.replaceWith(holder);
}

export function initEmbeds() {
  document.querySelectorAll(".embed-frame[data-slot]").forEach((frame) => {
    const track = SONGS[frame.dataset.slot];

    if (!track) {
      frame.disabled = true;
      return;
    }

    const label = frame.querySelector(".embed-pending");
    if (label) label.textContent = `${track.title} — ${track.artist}`;

    const hint = frame.querySelector(".embed-hint");
    if (hint) hint.textContent = hintFor(track);

    frame.after(watchLink(track));
    frame.addEventListener("click", () => load(frame, track), { once: true });
  });
}
