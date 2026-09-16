import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { NewsletterPost } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "newsletter");

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar day as YYYY-MM-DD. Quoted in YAML so gray-matter does not make a Date. */
function parseCreated(slug: string, value: unknown): string {
  if (typeof value === "string") {
    const day = value.trim().slice(0, 10);
    if (ISO_DAY.test(day)) return day;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  throw new Error(`${slug}.mdx: created must be a YYYY-MM-DD date string.`);
}

function parsePost(slug: string, source: string): NewsletterPost {
  const { data, content } = matter(source);
  const title = data.title;

  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error(`${slug}.mdx: title is a required string.`);
  }

  return {
    slug,
    title: title.trim(),
    created: parseCreated(slug, data.created),
    body: content.trim(),
  };
}

/** Newest first. Slug breaks same-day ties. */
function comparePosts(a: NewsletterPost, b: NewsletterPost): number {
  if (a.created !== b.created) return a.created < b.created ? 1 : -1;
  return b.slug.localeCompare(a.slug, undefined, { numeric: true, sensitivity: "base" });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/** Enough markdown for short class-update blurbs: headings, lists, paragraphs. */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;
  let paragraph: string[] = [];

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

/**
 * Every post in content/newsletter, newest first.
 *
 * Reads the filesystem, so this only ever runs at build time — the site is
 * statically exported and ships no server. Ignores .pdf and .gitkeep.
 */
export function getAllNewsletterPosts(): NewsletterPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      return parsePost(slug, source);
    })
    .sort(comparePosts);
}

export function formatNewsletterDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
