/* Sitewide chrome: hamburger button + hardware drawer, injected on every page. */

const GRADES = [
  ["K", "/syllabi/grade-k.html", false],
  ["1", "/syllabi/grade-1.html", false],
  ["2", "/syllabi/grade-2.html", false],
  ["3", "/syllabi/grade-3.html", false],
  ["4", "/syllabi/grade-4.html", false],
  ["5", "/syllabi/grade-5.html", false],
  ["6", "/syllabi/grade-6.html", true],
  ["7", "/syllabi/grade-7.html", true],
  ["8", "/syllabi/grade-8.html", true],
];

const BANDS = [
  ["K–2", "/songs/k-2.html", false],
  ["3–5", "/songs/3-5.html", false],
  ["6–8", "/songs/6-8.html", true],
];

const KNOB = `<svg class="knob" viewBox="0 0 64 64"><circle cx="32" cy="34" r="26" class="knob-base"/><circle cx="32" cy="30" r="26" class="knob-cap"/><rect x="30" y="8" width="4" height="14" rx="2" class="knob-mark"/></svg>`;

/* Netlify serves extensionless URLs, so normalise both forms to one key. */
function pageKey(pathname) {
  const path = pathname.replace(/\/+$/, "").replace(/\.html$/, "");
  if (path === "" || path === "/index") return "index";
  return path.replace(/^\//, "");
}

function keyOf(href) {
  return href.replace(/^\//, "").replace(/\.html$/, "");
}

function current(href, key) {
  return keyOf(href) === key ? ' aria-current="page"' : "";
}

function chromeMarkup(key) {
  const inSyllabi = key.startsWith("syllabi/");
  const inSongs = key.startsWith("songs/");

  const gradePads = GRADES.map(
    ([label, href, cool]) =>
      `<a class="sub-pad${cool ? " sub-pad-cool" : ""}" href="${href}"${current(href, key)}>${label}</a>`
  ).join("\n          ");

  const bandPads = BANDS.map(
    ([label, href, cool]) =>
      `<a class="sub-pad${cool ? " sub-pad-cool" : ""}" href="${href}"${current(href, key)}>${label}</a>`
  ).join("\n          ");

  return `<a class="skip-link" href="#main">Skip to content</a>

<button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="drawer" aria-label="Open menu">
  <span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>
  <span>Menu</span>
</button>

<div class="drawer-scrim" id="drawer-scrim"></div>

<aside class="drawer" id="drawer" aria-label="Site menu" aria-hidden="true">
  <div class="drawer-head">
    <div class="drawer-screen"><span class="lcd" id="drawer-lcd">MENU — SELECT</span></div>
    <div class="drawer-knobs" aria-hidden="true">${KNOB}${KNOB}</div>
  </div>
  <nav class="drawer-nav" aria-label="Main">
    <a class="drawer-item" href="/index.html"${current("/index.html", key)}><span class="led led-sky"></span>Home</a>

    <details class="drawer-group" name="ka-drawer" data-lcd="SYLLABI — MASTER + WI + K–8"${inSyllabi ? " open" : ""}>
      <summary class="drawer-item"><span class="led"></span>Syllabi<span class="drawer-toggle-mark" aria-hidden="true">+</span></summary>
      <div class="drawer-sub">
        <a class="sub-wide" href="/syllabi/master.html"${current("/syllabi/master.html", key)}>Master Syllabus</a>
        <a class="sub-wide" href="/syllabi/wi-dpi-standards-alignment.html"${current("/syllabi/wi-dpi-standards-alignment.html", key)}>WI DPI Alignment</a>
        <div class="sub-grid">
          ${gradePads}
          <span class="sub-pad sub-pad-dim" aria-hidden="true"></span>
        </div>
      </div>
    </details>

    <details class="drawer-group" name="ka-drawer" data-lcd="VANGUARD — 3 BANDS"${inSongs ? " open" : ""}>
      <summary class="drawer-item"><span class="led led-yellow"></span>Vanguard Songs<span class="drawer-toggle-mark" aria-hidden="true">+</span></summary>
      <div class="drawer-sub">
        <div class="sub-grid sub-grid-2">
          ${bandPads}
        </div>
      </div>
    </details>

    <a class="drawer-item" href="/resources.html"${current("/resources.html", key)}><span class="led led-pop"></span>Resources</a>
    <a class="drawer-item" href="https://koalacademy-web.netlify.app/portal.html" rel="noopener"><span class="led led-yellow"></span>Course Portal</a>
  </nav>
  <p class="drawer-fine">K–8 Music Pilot · One City Schools, Madison, WI. Pages marked scaffold are placeholders for the pilot year.</p>
</aside>`;
}

export function mountChrome() {
  const mount = document.getElementById("site-chrome");
  if (!mount) return;
  mount.outerHTML = chromeMarkup(pageKey(location.pathname));
}

export function initDrawer() {
  const menuBtn = document.getElementById("menu-btn");
  const drawer = document.getElementById("drawer");
  const scrim = document.getElementById("drawer-scrim");
  const drawerLcd = document.getElementById("drawer-lcd");
  if (!menuBtn || !drawer) return;

  let lastFocus = null;

  const focusables = () =>
    Array.from(
      drawer.querySelectorAll("a[href], button, summary, [tabindex]:not([tabindex='-1'])")
    ).filter((el) => el.offsetParent !== null);

  const setDrawer = (open) => {
    document.body.classList.toggle("drawer-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      lastFocus = document.activeElement;
      window.setTimeout(() => {
        const first = focusables()[0];
        if (first) first.focus();
      }, 60);
    } else if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  };

  menuBtn.addEventListener("click", () => {
    setDrawer(!document.body.classList.contains("drawer-open"));
  });

  if (scrim) scrim.addEventListener("click", () => setDrawer(false));

  document.addEventListener("keydown", (e) => {
    if (!document.body.classList.contains("drawer-open")) return;
    if (e.key === "Escape") {
      setDrawer(false);
      menuBtn.focus();
      return;
    }
    if (e.key !== "Tab") return;
    const items = focusables();
    items.unshift(menuBtn);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  if (drawerLcd) {
    const groups = Array.from(drawer.querySelectorAll(".drawer-group"));
    const idle = drawerLcd.textContent;
    groups.forEach((group) => {
      group.addEventListener("toggle", () => {
        const open = groups.find((g) => g.open);
        drawerLcd.textContent = open ? open.dataset.lcd || idle : idle;
      });
    });
  }
}
