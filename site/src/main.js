/* Koalacademy site — interaction layer. */

import "./styles.css";
import { mountChrome, initDrawer } from "./nav.js";
import { initEmbeds } from "./embeds.js";
import { initTooltips } from "./tooltips.js";

mountChrome();
initDrawer();
initEmbeds();
initTooltips();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- Home deck: LCD readout + active pad, driven by the section in view ---- */
const lcd = document.getElementById("lcd");
const pads = Array.from(document.querySelectorAll(".pad[data-section]"));
const sections = Array.from(document.querySelectorAll("[data-lcd]"));
const knobs = Array.from(document.querySelectorAll(".deck .knob-mark"));

let currentSection = null;

function setCurrent(section) {
  if (section === currentSection) return;
  currentSection = section;
  if (lcd) lcd.textContent = section ? section.dataset.lcd : "KOALACADEMY — READY";
  pads.forEach((pad) => {
    pad.classList.toggle("active", !!section && pad.dataset.section === section.id);
  });
}

if (lcd && "IntersectionObserver" in window && sections.length) {
  const visible = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visible.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      let best = null;
      let bestRatio = 0;
      sections.forEach((section) => {
        const ratio = visible.get(section) || 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = section;
        }
      });
      setCurrent(best);
    },
    { threshold: [0, 0.15, 0.3, 0.5, 0.7] }
  );
  sections.forEach((section) => observer.observe(section));
}

/* ---- Pad press feedback ---- */
pads.forEach((pad) => {
  pad.addEventListener("click", () => {
    if (reduceMotion) return;
    pad.classList.add("pressed");
    window.setTimeout(() => pad.classList.remove("pressed"), 180);
  });
});

/* ---- Deck knobs turn with scroll progress (home only) ---- */
if (!reduceMotion && knobs.length) {
  const rates = [200, -140, 320]; // degrees over the full page, alternating direction
  let ticking = false;

  const turnKnobs = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    knobs.forEach((mark, i) => {
      mark.style.setProperty("--rot", (progress * rates[i % rates.length]).toFixed(1) + "deg");
    });
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(turnKnobs);
      }
    },
    { passive: true }
  );
  turnKnobs();
}

/* ---- Scroll reveal, home narrative sections only ----
   Inner pages skip it: reference pages should never start at opacity 0. */
const isInnerPage = document.body.classList.contains("page-inner");

if (!isInnerPage && !reduceMotion && "IntersectionObserver" in window) {
  const targets = Array.from(document.querySelectorAll(".section .wrap, .band .wrap-half"));
  targets.forEach((el) => el.classList.add("reveal"));

  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((el) => revealer.observe(el));
}
