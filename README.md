# Koalacademy

A 20-week music production curriculum for urban school districts, taught on iOS using
[Koala Sampler](https://www.koalasampler.com). Students learn theory, sampling history, drum
design, song form, and sampling rights, then build and perform an original project sampled from
three songs they choose themselves.

## Live

| Surface | URL | Branch |
| --- | --- | --- |
| Marketing site | [koalacademy-web.netlify.app](https://koalacademy-web.netlify.app/) | `webv1-dev` → `webv1` |
| Course Portal | [koalacademy-portal.netlify.app](https://koalacademy-portal.netlify.app/) | `portalv1-dev` → `portalv1` |

## Start here

| If you want to… | Go to |
| --- | --- |
| Read the full course content | [curriculum/KOALACADEMY.md](curriculum/KOALACADEMY.md) |
| See the K-8 adaptation for One City Schools | [curriculum/k-8-pilot/](curriculum/k-8-pilot/README.md) |
| Understand the course, requirements, and who can teach it | [docs/README.md](docs/README.md) |
| Use the Course Portal (routes, Teacher mode, Buckets, homerooms) | [docs/portal.md](docs/portal.md) |
| Find or add materials for a specific unit | [units/](units/) |
| Read the companion iOS app concepts | [apps/README.md](apps/README.md) |

## Units

1. [Music Theory and Koala Sampler Navigation](units/unit-01-music-theory-and-koala-navigation)
2. [Understanding Sampling and Digital Drumming / Drum Design](units/unit-02-sampling-and-digital-drumming)
3. [Song Forms in Popular Music and Sampling Rights](units/unit-03-song-forms-and-sampling-rights)
4. [Defining Your Sound and Artist Appreciation](units/unit-04-defining-your-sound-and-artist-appreciation)
5. [Advanced Effects Processing and Performing with Koala Sampler](units/unit-05-advanced-effects-and-performance)

## Repo map

Do not merge `portalv1-dev` into `main`. Curriculum commits land on `main`; portal app
commits land on `portalv1-dev`; site HTML lands on `webv1-dev`. Split mixed lesson work
with `./scripts/split-curriculum-portal.sh`.

```text
curriculum/KOALACADEMY.md   Full 6–8 course content — the source of truth
curriculum/k-8-pilot/       K–8 adaptation for One City Schools (pilot)
docs/README.md              Course description, requirements, teaching notes
docs/portal.md              Portal structure, Teacher mode, Buckets, homerooms, deploy
site/                       Marketing site (branch webv1-dev)
portal/                     Course Portal Next.js app (branch portalv1-dev)
supabase/                   Portal migrations and Edge Functions (with portalv1-dev)
units/                      Per-unit folders for materials and activities
apps/                       Blooprint suite concepts (native iOS)
```

Course content is edited in `curriculum/KOALACADEMY.md`. Unit folders hold assets and link back
into the relevant sections rather than duplicating them. The PDF in the repository root is the
original draft, kept for reference only.

## License

[MIT](LICENSE)
