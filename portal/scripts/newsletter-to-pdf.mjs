#!/usr/bin/env node
/**
 * Render a newsletter MDX file to a Letter PDF next to it.
 *
 *   node scripts/newsletter-to-pdf.mjs content/newsletter/<slug>.mdx
 *
 * Needs Playwright Chromium: npx playwright install chromium
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const matter = require("gray-matter");

const PORTAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/newsletter-to-pdf.mjs <path-to.mdx>");
  process.exit(1);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/** Enough markdown for short class-update blurbs: headings, lists, paragraphs. */
function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inList = false;
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(item[1])}</li>`);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return html.join("\n");
}

function formatDate(iso) {
  const day = typeof iso === "string" ? iso.trim().slice(0, 10) : "";
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function letterHtml({ title, created, bodyHtml }) {
  const dateLabel = formatDate(created);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: Letter; margin: 0.75in; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #111;
    }
    .kicker {
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #2f5648;
      margin: 0 0 0.4rem;
    }
    h1 {
      font-size: 22pt;
      line-height: 1.15;
      margin: 0 0 0.35rem;
    }
    .date {
      font-size: 11pt;
      color: #737a89;
      margin: 0 0 1.25rem;
    }
    h2 { font-size: 14pt; margin: 1.1rem 0 0.4rem; }
    h3 { font-size: 12.5pt; margin: 0.9rem 0 0.35rem; }
    p { margin: 0 0 0.75rem; }
    ul { margin: 0 0 0.75rem; padding-left: 1.2rem; }
    li + li { margin-top: 0.25rem; }
    a { color: #2f5648; }
  </style>
</head>
<body>
  <p class="kicker">K–8 Music Pilot</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="date">${escapeHtml(dateLabel)}</p>
  ${bodyHtml}
</body>
</html>`;
}

const inputArg = process.argv[2];
if (!inputArg) usage();

const inputPath = path.isAbsolute(inputArg)
  ? inputArg
  : path.resolve(process.cwd(), inputArg);

if (!fs.existsSync(inputPath)) usage(`File not found: ${inputPath}`);
if (!inputPath.endsWith(".mdx") && !inputPath.endsWith(".md")) {
  usage("Input must be a .mdx or .md file.");
}

const source = fs.readFileSync(inputPath, "utf8");
const { data, content } = matter(source);
const title = typeof data.title === "string" ? data.title.trim() : "";
const created = data.created;

if (!title) usage(`${path.basename(inputPath)}: title is required in frontmatter.`);

const html = letterHtml({
  title,
  created: typeof created === "string" ? created : created instanceof Date ? created.toISOString() : "",
  bodyHtml: markdownToHtml(content.trim()),
});

const outPath = inputPath.replace(/\.mdx?$/, ".pdf");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: outPath,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
  });
} finally {
  await browser.close();
}

console.log(path.relative(PORTAL_ROOT, outPath) || outPath);
