# Koalacademy Brand Palette (v1)

<p align="center">
  <img src="../curriculum/assets/ka-main-smile-decal-no-bg.png" alt="Koalacademy logo" width="180" />
</p>

Source: the v1 koala logo mockups in [`curriculum/assets/`](../curriculum/assets/). Hex values below are sampled from [`ka-main-smile-decal.png`](../curriculum/assets/ka-main-smile-decal.png) and [`ka-main-smile-decal-no-bg.png`](../curriculum/assets/ka-main-smile-decal-no-bg.png). Greens and bamboo tones are extensions for future UI and marketing work; they are not in the logo yet.

**Current logo / icon:** [`ka-main-smile-decal-no-bg.png`](../curriculum/assets/ka-main-smile-decal-no-bg.png)

## Core (from logo)

| Token | Hex | Role in logo | Use |
| --- | --- | --- | --- |
| `ka-mist` | `#C0CBE1` | Face / soft fill | Page surfaces, soft panels, large backgrounds |
| `ka-slate` | `#99A4B8` | Inner ears | Secondary surfaces, muted chrome, borders |
| `ka-charcoal` | `#737A89` | Nose, smile | Body text on light mist, icons, hairlines |
| `ka-ink` | `#000000` | Eyes | Strong text, high-contrast UI on light surfaces |
| `ka-snow` | `#FFFFFF` | Glasses frames | Highlights, contrast on mist/slate, empty space |
| `ka-pop` | `#F56E8F` | Pink “K” decal | Accent only — CTAs, focus, badges, key moments |

```text
#C0CBE1  mist
#99A4B8  slate
#737A89  charcoal
#000000  ink
#FFFFFF  snow
#F56E8F  pop
```

`ka-pop` is the only warm, high-saturation color in the mark. Keep it scarce so it stays a signal, not a theme.

## Extended: greens

Cool, eucalyptus-leaning greens that sit next to mist and slate without tipping into neon.

| Token | Hex | Use |
| --- | --- | --- |
| `ka-eucalyptus` | `#A8C3B0` | Soft success states, nature callouts, alternate section fills |
| `ka-leaf` | `#5B8F7B` | Primary green for links/progress on light UI, icons |
| `ka-canopy` | `#2F5648` | Deep green for text on pale green, footer bars, dark accents |

```text
#A8C3B0  eucalyptus
#5B8F7B  leaf
#2F5648  canopy
```

## Extended: bamboo browns / beiges

Warm ground tones for print, classroom materials, and moments that need less “tech gray.”

| Token | Hex | Use |
| --- | --- | --- |
| `ka-pith` | `#EDE4D4` | Warm paper / alternate light background |
| `ka-bamboo` | `#D4C4A8` | Cards on pith, soft dividers, illustration fills |
| `ka-culm` | `#A8906C` | Secondary warm accent, charts, labels |
| `ka-bark` | `#6E5A42` | Warm body text on pith, wood-tone icons |

```text
#EDE4D4  pith
#D4C4A8  bamboo
#A8906C  culm
#6E5A42  bark
```

## CSS custom properties

```css
:root {
  /* Core — logo */
  --ka-mist: #c0cbe1;
  --ka-slate: #99a4b8;
  --ka-charcoal: #737a89;
  --ka-ink: #000000;
  --ka-snow: #ffffff;
  --ka-pop: #f56e8f;

  /* Extended — greens */
  --ka-eucalyptus: #a8c3b0;
  --ka-leaf: #5b8f7b;
  --ka-canopy: #2f5648;

  /* Extended — bamboo */
  --ka-pith: #ede4d4;
  --ka-bamboo: #d4c4a8;
  --ka-culm: #a8906c;
  --ka-bark: #6e5a42;
}
```

## Pairing guidance

- **Default UI:** mist background, charcoal/ink text, snow for contrast, pop for one primary action.
- **Cool sections:** mist + slate + leaf; keep pop off-canvas or as a single chip.
- **Warm sections:** pith + bamboo + bark; pop still works as the CTA if you need one accent.
- **Do not** flood layouts with pop pink, purple gradients, or extra neon accents. The mark is cool neutrals with one pink spark.
- **Logo on color:** prefer mist, snow, pith, or near-black. Avoid placing the mark on saturated pink or dense green fields.

## Contrast notes (quick)

| Foreground | Background | Notes |
| --- | --- | --- |
| `ka-ink` | `ka-mist` / `ka-snow` / `ka-pith` | Prefer for long reading |
| `ka-charcoal` | `ka-mist` / `ka-snow` | Secondary text; check size |
| `ka-snow` | `ka-charcoal` / `ka-canopy` / `ka-bark` | Buttons, inverted chrome |
| `ka-pop` | `ka-snow` / `ka-mist` | Accents and short labels; not body copy |
| `ka-canopy` | `ka-eucalyptus` / `ka-pith` | Green-on-green / warm pairings |

Verify WCAG for final type sizes when shipping UI.

## Asset reference

| File | Notes |
| --- | --- |
| [`ka-main-smile-decal-no-bg.png`](../curriculum/assets/ka-main-smile-decal-no-bg.png) | Current logo (transparent) |
| [`ka-main-smile-decal.png`](../curriculum/assets/ka-main-smile-decal.png) | Same mark on mist `#C0CBE1` |
