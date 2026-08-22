---
name: split-lesson-work
description: Splits confirmed lesson work into curriculum commits on main and portal commits on portalv1-dev. Use after a lesson draft is confirmed, when routing KOALACADEMY.md vs portal/ changes, or when the user asks to split lesson commits.
---

# Split lesson work

After the user confirms a lesson draft, run the helper. Do not split by hand.

```bash
./scripts/split-curriculum-portal.sh
```

Dry run first if the working tree looks mixed or unexpected:

```bash
./scripts/split-curriculum-portal.sh --dry-run
```

Push and open PRs only when the user asks:

```bash
./scripts/split-curriculum-portal.sh --push
```

## Routing

| Paths | Destination |
| --- | --- |
| `curriculum/**` including `KOALACADEMY.md` | branch from `main` |
| `portal/**` | branch from `portalv1-dev` |
| anything else | stop; do not split |

Portal draft pointers in `KOALACADEMY.md` are staff/auditor links. Use a GitHub blob URL on the stable portal ref, not a relative path and not `portalv1-dev`:

`https://github.com/erreyonj/koalacademy/blob/portalv1/portal/content/lessons/<file>.mdx`

That URL 404s until the MDX exists on `portalv1` (after pulling `portalv1-dev`). The script does not wait for that pull.

## Hard rules

- Never `git add .` / `git add -A`
- Never `--no-verify` or force-push
- Do not merge `portalv1-dev` into `main`

## After a successful split

Report the two branch names / SHAs and the backup ref `refs/backup/pre-split-*`.
