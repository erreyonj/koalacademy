/* Koalacademy K-8 pilot landing — light interaction layer. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Sitewide drawer ---- */
  var menuBtn = document.getElementById("menu-btn");
  var drawer = document.getElementById("drawer");
  var scrim = document.getElementById("drawer-scrim");
  var drawerLcd = document.getElementById("drawer-lcd");

  if (menuBtn && drawer) {
    var lastFocus = null;

    var focusables = function () {
      return Array.prototype.slice
        .call(drawer.querySelectorAll("a[href], button, summary, [tabindex]:not([tabindex='-1'])"))
        .filter(function (el) {
          return el.offsetParent !== null;
        });
    };

    var setDrawer = function (open) {
      document.body.classList.toggle("drawer-open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) {
        lastFocus = document.activeElement;
        window.setTimeout(function () {
          var first = focusables()[0];
          if (first) first.focus();
        }, 60);
      } else if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    };

    menuBtn.addEventListener("click", function () {
      setDrawer(!document.body.classList.contains("drawer-open"));
    });

    if (scrim) {
      scrim.addEventListener("click", function () {
        setDrawer(false);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (!document.body.classList.contains("drawer-open")) return;
      if (e.key === "Escape") {
        setDrawer(false);
        menuBtn.focus();
        return;
      }
      if (e.key !== "Tab") return;
      var items = focusables();
      items.unshift(menuBtn);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    /* LCD readout follows the open submenu */
    if (drawerLcd) {
      var groups = Array.prototype.slice.call(drawer.querySelectorAll(".drawer-group"));
      var idle = drawerLcd.textContent;
      groups.forEach(function (group) {
        group.addEventListener("toggle", function () {
          var open = groups.filter(function (g) {
            return g.open;
          })[0];
          drawerLcd.textContent = open ? (open.dataset.lcd || idle) : idle;
        });
      });
    }
  }

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
      document.querySelectorAll(".section .wrap, .band .wrap-half, .song-stage .song-inner, .book-grid > li")
    );
    targets.forEach(function (el) {
      el.classList.add("reveal");
    });
    Array.prototype.slice.call(document.querySelectorAll(".book-grid > li")).forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i, 6) * 60 + "ms";
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
