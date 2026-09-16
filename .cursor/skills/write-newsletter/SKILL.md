---
name: write-newsletter
description: Turns short class-update notes into a portal newsletter MDX post and a matching admin PDF. Use when the user pastes newsletter notes, class updates, or asks to write a newsletter or class update for the portal.
---

# Write newsletter

If the user has not given notes yet, ask for them. Wait. Do not invent a post.

Notes are brief blurbs (a few sentences or bullets), not page-long articles.

## Write the MDX

One file per update:

`portal/content/newsletter/<yyyy-mm-dd>-<slug>.mdx`

```mdx
---
title: "Week of September 14"
created: "2026-09-14"
---

K–2 practiced freeze dance and kept a steady beat on body percussion.

6–8 started a four-bar loop in BandLab. Next week they add a bass line.
```

Rules:

- `created` is today unless the user names another day. Quote it (`"YYYY-MM-DD"`).
- Slug: date prefix plus a short kebab title. Example: `2026-09-14-week-of-september-14`.
- Title lives in frontmatter only. Do not repeat it as a heading in the body.
- Plain markdown only: paragraphs, lists, bold, optional `##` sections (1–3 max). No JSX, no lesson components.
- Parent-friendly voice. No diagnostic or disability detail.

## PDF

From `portal/`:

```bash
npm run newsletter:pdf -- content/newsletter/<yyyy-mm-dd>-<slug>.mdx
```

Writes `content/newsletter/exports/<yyyy-mm-dd>-<slug>.pdf` (gitignored). If Chromium is missing:

```bash
npx playwright install chromium
```

## After

Report the MDX path (`portal/content/newsletter/…mdx`) and the PDF path (`portal/content/newsletter/exports/…pdf`). Do not commit unless asked. The exports folder is gitignored.
