/* Koalacademy K-8 pilot landing — light interaction layer. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var lcd = document.getElementById("lcd");
  var pads = Array.prototype.slice.call(document.querySelectorAll(".pad[data-section]"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-lcd]"));
  var knobs = Array.prototype.slice.call(document.querySelectorAll(".knob-mark"));

  /* ---- LCD readout + active pad, driven by the section in view ---- */
  var current = null;

  function setCurrent(section) {
    if (section === current) return;
    current = section;
    if (lcd) lcd.textContent = section ? section.dataset.lcd : "KOALACADEMY — READY";
    pads.forEach(function (pad) {
      pad.classList.toggle("active", !!section && pad.dataset.section === section.id);
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var visible = new Map();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        var best = null;
        var bestRatio = 0;
        sections.forEach(function (section) {
          var ratio = visible.get(section) || 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = section;
          }
        });
        setCurrent(best);
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.7] }
    );
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ---- Pad press feedback ---- */
  pads.forEach(function (pad) {
    pad.addEventListener("click", function () {
      if (reduceMotion) return;
      pad.classList.add("pressed");
      window.setTimeout(function () {
        pad.classList.remove("pressed");
      }, 180);
    });
  });

  /* ---- Knobs turn with scroll progress ---- */
  if (!reduceMotion && knobs.length) {
    var rates = [200, -140, 320]; // degrees over the full page, alternating direction
    var ticking = false;

    var turnKnobs = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? window.scrollY / max : 0;
      knobs.forEach(function (mark, i) {
        var rate = rates[i % rates.length];
        mark.style.setProperty("--rot", (progress * rate).toFixed(1) + "deg");
      });
    };

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(turnKnobs);
        }
      },
      { passive: true }
    );
    turnKnobs();
  }

  /* ---- Scroll reveal ---- */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var targets = Array.prototype.slice.call(
      document.querySelectorAll(".section .wrap, .band .wrap-half")
    );
    targets.forEach(function (el) {
      el.classList.add("reveal");
    });
    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach(function (el) {
      revealer.observe(el);
    });
  }
})();
