# Notehead — CM / GI interrupt copy

Captain Monologue (CM) and Game Interrupt (GI). Wired via `modules/story.ts`.

## Launch (`launch-teach`)

### Enter — CM then GI

- **CM:**
  1. Darn it!... This planet had a huge Borealis reading, but that landing scattered every one of the ship's Note-Tails...
  2. Wait a minute... there's almost no Tonal Force on this planet either!! The ship will need to be recalibrated. At least the Frequency Band is still working...
- **GI:** Pull the ship against the Frequency Band to launch the ship

### Guide miss — CM

- **CM:** Hmm. Gotta try a stronger pull!

## Notch crash (`notch-crash`)

No story interrupt — scripted fall into Notch.

## Notch calibrate (`notch-calibrate`)

### Enter — CM

- **CM:**
  1. Great... the ship's hull can't take much more of those!
  2. We need to mitigate our fall speed
  3. I'll try to divert power away from some damaged components
  4. ... ... ... *(click through)*
  5. ... ... ... *(click through)*
  6. Got it! *(reboot SFX)*

### First rise past pocket height (invisible threshold) — GI

- **GI:** You can now engage the Anachrometer! Pull against the band in mid air to jump again!
- Trigger is not drawn on screen.

### First hull HP loss on this beat — GI

- **GI:** Hard hits or impacts against terrain damage the hull
- Hull pips pulse at the **current** HP (not a full bar); purple up-arrow on the playfield points at the hull HUD.

### First hull breach (HP → 0) on this beat — GI

- **GI:** If there's a breach the Anachrometer resets you to try again.
- Ship shatter plays first (`breach` phase); hull stays empty (0 HP) through the GI until dismiss, then the beat restarts with a full hull.

### Exit (clear / leave Notch) — GI

- **GI:** Collecting Borealis orbs repairs the ship's tonal calibration so you can repair the Note-Tails and gain new abilities!
- Holds advance to Launch Bridge until dismissed.

## Tail (`launch-tail`)

Launch terrain + Frequency Band. Floating eighth-note Note-Tail pickup.

### Enter — CM then GI

- **CM:**
  1. Wait a minute… that reading — that's a Note-Tail signature!!
  2. The first missing tail… it's floating right above the Frequency Band. Grab it!
- **GI:** Launch up and collect the Note-Tail

### Clear

- Collect the Note-Tail → adds `eighth` to `repair.tails`.

## Stairs

(Draft only — not wired)

1. **Message:** The Anachrometer allows you to take your time with each new pull
   - **After 3 resets:** Try and jumper higher than your target to 'give yourself more time' while falling.
2. **Subtitle:** Borealis must be gathered in tonal order. Press/click the
