import codes from "./lesson-codes.js";

/**
 * Walk every <code> element on the page. If its text matches a known
 * lesson code (exact match first, then component prefix), attach a
 * tooltip via data-tooltip so CSS handles the display.
 */
export function initTooltips() {
  const els = document.querySelectorAll("code");

  els.forEach((el) => {
    const text = el.textContent.trim();
    const desc = codes[text] || codes[text.replace(/\.\d+$/, "")];
    if (!desc) return;

    el.dataset.tooltip = desc;
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", `${text}: ${desc}`);
  });
}
