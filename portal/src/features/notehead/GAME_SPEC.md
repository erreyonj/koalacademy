# Notehead game spec

Source of truth for the Notehead overhaul. If this file and the code disagree, follow this file and change the code.

Story scenes and dialogue are out of scope for the route MVP. Soft beat transitions spawn the next place; there is no continuous scroll between regions.

## Lore

The player is the Captain of a notehead ship. Music on their world is a force you can harness. The ship is damaged and has set down on a habitable planet that is almost silent. The ship itself is the instrument: a stemless notehead that can take on tails later.

The Frequency Band is the ship's malleable sling. Pulling it launches the notehead. The first repair restores the Anachrometer: press-to-warp time and seat a Frequency Band under the ship mid-flight so the Captain can pull again. Later repairs add tails. The data model leaves room for tails; this MVP only implements the Anachrometer.

The first hard fall is unavoidable. The ship breaks through the band at high fall speed, crashes into the Notch, and the Captain diverts power from the Frequency Band to repair the Anachrometer off screen. After that, soft landings require the warp.

## Planet

One route, one world, four places. Default play advances a beat table. A debug HUD can jump beats for the table sandbox. The old free region bar is sandbox-only.

| Region | Working name | Role on the route |
| --- | --- | --- |
| `launch` | Launch site | Teach the pull; later a bridge back into Stairs |
| `notch` | Notch | Crash landing, then Anachrometer calibration |
| `stairs` | Stair cave | Anachrometer hops on sloping treads |
| `zig` | Zig | Landscape zig-zag Borealis between twin cliffs |

### Route beats

| Beat | Place | Gate |
| --- | --- | --- |
| `launch-teach` | Launch | Reach goal height on the way up; fall hard enough to break through the launch band |
| `notch-crash` | Notch | One-shot intro only: fall from above, hit block, land floor → unlock Anachrometer → Notch |
| `notch-calibrate` | Notch | Optional Ascending 4th (E4→A4) for Tonation; exit anytime through the top |
| `launch-bridge` | Launch | Free-aim on the band; full-power top exit → Stairs. Falling onto the floor under the band (`LAUNCH_FLOOR_GAP`) → Notch (fall from above; skip dialogue if visited) |
| `stairs-anach` | Stairs | Enter rising onto the approach band; optional arpeggio (C4→E4→G4) for Tonation; exit right → Zig (jump-in from the left lower barrier); falling onto the floor under the band (`STAIRS_FLOOR_GAP`) → Launch Bridge (fall from above) |
| `zig-1` | Zig | Enter jumping in from the left lower barrier onto the peak Frequency Band; optional contour (C4→E4→A4) for Tonation; exit up → Tail; lower-left floor gap → Stairs (fall onto approach band right edge); lower-right floor gap warp → soft reentry jump-in from Zig’s left lower barrier |
| `launch-tail` | Tail | Free-aim on launch terrain; collect the eighth Note-Tail when Tonation/hull gates pass; falling onto the floor under the band → Zig (fall from above) |

Soft transitions: most clears sparkle, then spawn the next beat's entry body (often already in flight). `launch-teach` skips the star burst and holds a slo-mo fall through the broken band until OOB, then cuts to Notch crash. `notch-crash` also skips the star burst.

## Frequency Band and aim

- Height is a diatonic ruler. Default ladder is one octave of C major, `C4`–`C5`. The scale table is the only place those names live.
- On ready, and whenever the player taps the interval HUD, the required pair plays.
- The band is flat at rest and sags only while the player pulls.
- While resting on a Frequency Band, a slight magnetic dock eases the ship to the band center. This does not apply to Anachrometer warp re-pulls (the warp band tracks the ship).
- **Launch teach** pulls are vertical only (`AimMode: "vertical"`). Sideways drag does not aim.
- **Launch Bridge / Tail** use free aim on the launch band (`AimMode: "free"`).
- Stairs, Notch, and Zig take a drag vector. Length is power (0..1). Direction is aim in radians from straight up. Positive aim points to +x. The ship flies opposite the drag.
- Each rest spot (except launch) has an aim cone. Hard difficulty shaves both sides (`aimInset`).
- While pulling with power, a dashed chart traces the flight `launchVelocity` and `step` would produce. The chart disappears on release.

## Break-through

While falling faster than `BREAK_SPEED`, the ship does not land on `kind: "band"` ledges. Blocks and steps can still catch. On `launch-teach`, the launch band stays soft until the guide is crossed on the way up — only then can a hard fall break through. The break plays a snap animation (band splits, peels, shards) while the ship falls in slow motion until it leaves the frame, then Notch crash begins. Once the Anachrometer is on, a mid-flight warp lets the Captain pull again while still moving so soft landings are reachable.

## Borealis and Tonation

**Borealis** are glowing mid-air orbs. They replace waiting Frequency Bands: the Captain flies near them, they magnetize, and collecting counts as a visit. Physical collect is **any order**. Tap an orb to preview its pitch without collecting.

**Tonation** is a separate banked energy resource (HUD solid meter, cap **24**). Completing a beat’s **interval challenge** in the required pitch order banks that region’s payout **once**:

| Beat | Interval | Pitches (order) | Payout |
| --- | --- | --- | --- |
| `notch-calibrate` | Ascending 4th | E4 → A4 | +5 |
| `stairs-anach` | Arpeggio | C4 → E4 → G4 | +9 |
| `zig-1` | Contour | C4 → E4 → A4 | +10 |

- Wrong-order collect **consumes** the gem and **fails** the attempt (0 Tonation this visit). Remaining gems stay collectable — nothing locks. All orbs regen when the Captain leaves the region and returns, so the interval can be retried then.
- The first Tonation banked in a run opens the `tonation-first` GI (four cards: energy source / correct interval order calibrates Tonation / this route's interval group / other routes may differ). It replaces the old Notch exit GI; leaving Notch never interrupts.
- Successful full sequence plants an `exit-band` under the last gem (soft pad) and banks the payout (idempotent per beat).
- Magnetism / collect run in **real time** — Anachrometer slows the ship, not Borealis.
- **Exit** on Borealis beats is always available (skip freely). Frame edges seal except forward + reverse travel openings. `launch-bridge` still needs a full-power shot out the top.

## Bottom-edge exits

Reverse travel and the Zig warp use **floor gaps** (`bottomOpening(x0, x1)`), not side corners. The floor inside a gap is unsealed; a route fires the moment a **falling** hull touches the floor there (`vy ≤ 0`, `y − SHIP_R ≤ 0`, x inside the span — `touchedOpening` / `matchTouchRoute`). Rising enter bodies never fire them, so rise-in arrivals pass through safely. The left frame edge is always sealed.

| Beat | Gap (world x) | Route |
| --- | --- | --- |
| `launch-bridge` | `LAUNCH_FLOOR_GAP` 0–770 | → `notch-calibrate`, fall in |
| `stairs-anach` | `STAIRS_FLOOR_GAP` 0–405 | → `launch-bridge`, fall onto the band |
| `zig-1` | `ZIG_FLOOR_GAP_LEFT` 0–290 | → `stairs-anach`, fall onto the band's right edge |
| `zig-1` | `ZIG_FLOOR_GAP_RIGHT` 660–900 | warp → `zig-1` soft reentry, jump in from the left gap onto the peak (Borealis kept) |
| `launch-tail` | `LAUNCH_FLOOR_GAP` 0–770 | → `zig-1`, fall onto the peak |
- HUD `interval:` shows the current required pair (progressive on multi-note beats). Tap it to hear the pair.
- Eighth Note-Tail on `launch-tail` requires Tonation ≥ **19** (Easy/Med) or **24** (Hard), plus hull ≥ **2** (Med) / ≥ **3** (Hard). Easy has no hull gate beyond staying alive.

## Hull (HP)

A simple hull bar in the HUD. Easy **10** / Medium **8** / Hard **5** (`profile.maxHp`).

- Landings on `kind: "band"` Frequency Bands never cost HP.
- Landings on steps / blocks cost 1 HP only when fall speed ≥ `LANDING_HIT_SPEED` (~6 ship-radii freefall). Short hops onto adjacent terrain stay free.
- Hard rock impacts (`resolveMasses` into a wall at ≥ `MASS_HIT_SPEED`) also cost 1 HP — pocket grazes on a short hop do not.
- Sealed exit-frame barriers bounce on every dial; they cost 1 HP **only on Hard**.
- First clear of an interval region (Notch / Stairs / Zig exit advance) heals Easy/Med **+3**, Hard **+1**.
- At 0 HP the ship plays a short shatter burst (`phase: "breach"`), then any hull teach GI, then the beat restarts with a full hull. **Hard** also wipes the Tonation bank; Easy/Med keep Tonation.

## Solid terrain

Rock masses are solid. The ship cannot pass through mass outlines; `resolveMasses` pushes it out and kills inward velocity. Frequency Band break-through still applies only to `kind: "band"` ledges, not to rock.

## Anachrometer (press-to-warp)

Unlocked after `notch-crash` (`repair.anachrometer = true`).

While airborne, a press with Anachrometer on:

1. Sets sim `timeScale` to a slow factor (about 0.10). Ship physics only — Borealis magnet / collect stay real-time.
2. Places a transient `warp-band` under the ship (it tracks the ship while engaged).
3. Opens a pull on that same press — the ship keeps its velocity so the Captain can aim the next shot in real time.

Releasing the pull with power clears the warp band, restores `timeScale = 1`, and applies a new launch from the current pose. Releasing with no power cancels the warp and resumes normal flight. Without Anachrometer, the mid-air press is a no-op.

If the ship touches a real surface (tread, band, block) while still holding an air-warp pull: the warp band and slow-mo clear, but the pull/aim stays active. Sloped treads still seat → slide → fall under that same pull.

## Launch

- Goal height is the guide line for the active goal pitch. Crossing it on the way up counts for `launch-teach`; apex match is not the clear rule on the route.
- `launch-teach` clears when goal height was crossed rising and the ship then breaks through the launch band on the way down. Short shots that never reach the guide always soft-land.
- `launch-bridge` forward enter rises onto the launch band (from Notch). Stairs → Bridge reverse falls from above onto the band. A full-power shot through the top exit clears into `stairs-anach`. Falling onto the floor under the band returns to Notch (also a fall).

## Notch

- Classic portrait notch: left wall with a first peak above the pocket shelf, high right block, floor band on the lower slope.
- Open from above so `notch-crash` can fall in and clip the block.
- Pocket / lower shelf (`A4`). Block / higher shelf (`E4`). Floor band (`C4`). Interval: Ascending 4th **E4 → A4** (+5 Tonation) — collect the block tone first, then the pocket.
- `notch-crash` is a **one-shot fall intro** after the first Launch break-through (not a free-standing level). It unlocks Anachrometer, then Notch play begins. Tracked via `RouteMemory.crashSeen`.
- `notch-calibrate` starts on the floor (or falling re-entry from Launch Bridge). Clear by flying through the exit anytime; bank Tonation with E4 then A4. Revisits skip enter dialogue.

## Zig

- Landscape region (`360×200` art in the same logical world). Force landscape device orientation with an on-screen prompt when portrait. Stage is ~2× the portrait playfield footprint.
- Twin hanging cliffs + bottom peak (`notehead-mock-zig-1.png`). Left shelf is a deep horizontal platform; right side is a sloping wedge. Interval contour **C4 → E4 → A4** (+10 Tonation).
- Ledges: `zig-peak` (`C4` band), `zig-left` (`E4` band), `zig-right` (`A4` sloping step). Shelves are spread far apart for a clear zig-zag.
- `zig-1` arrives with the same jump-in as the lower-right warp (`zigJumpFromLeftEnter`): up out of the left floor gap, arcing right onto the peak (peak counts as visited). The arc stays well below every Borealis orb. Exit up anytime → Tail; bank Tonation with C4 → E4 → A4 (any physical path, correct pitch order).
- Reverse: lower-left floor gap → Stairs (fall onto the **right edge** of the approach Frequency Band); lower-right floor gap warp → same-beat soft reentry that jumps in from the left lower barrier (`zigJumpFromLeftEnter`, Borealis kept). Tail → Zig reverse falls from above onto the peak.
- Both cliffs keep their full lower bodies down to the frame; the floor gaps sit between each cliff foot and the peak island.
- Rule: forward arrivals that continue an upward exit **rise** from below; reverse arrivals from a later region **fall** from above (except Zig, where both the Stairs arrival and the lower-right warp loop jump in from the left).

## Stairs

- Three long treads sit in the lower-right stair cave. Each tread slopes down toward open sky (left).
- The approach Frequency Band sits left of the lowest tread, slightly below its open lip (`C4`).
- Tread hits always seat (no trampoline bounce). The ship slides toward open sky and drips off the lip; +x into the rock is killed.
- There is no auto drop-down from tread to tread.
- Borealis sits over each tread's open face (not buried under higher steps).
- Interval arpeggio, bottom to top: `C4 E4 G4` (+9 Tonation).
- `stairs-anach` clears on the right-side exit anytime → Zig (jump-in from the left); falling onto the floor under the approach band → Launch Bridge (fall from above onto band); bank Tonation with C4 → E4 → G4. There is no lower-right exit — that edge is stair rock below ~840.

## Difficulty

One profile shared by every region. Route Easy uses the beat table and ignores apex windows. The dial still exists for aim inset and sandbox legacy checks.

| Dial | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Aim inset | 0 | 0.08 | 0.22 |
| Max HP | 10 | 8 | 5 |
| Region clear heal | +3 | +3 | +1 |
| Eighth Tail Tonation | ≥19 | ≥19 | ≥24 |
| Eighth Tail hull | — | ≥2 | ≥3 |
| Breach Tonation | keep | keep | wipe |

K–2 play uses Easy. Do not fork components per difficulty.

## Data shapes

Logical space is portrait, **900 × 1600**, origin at the bottom-left, **+y up**. Physics never reads screen pixels.

```ts
type BeatId =
  | "launch-teach"
  | "notch-crash"
  | "notch-calibrate"
  | "launch-bridge"
  | "stairs-anach"
  | "zig-1";

type RegionId = "launch" | "stairs" | "notch" | "zig";

interface ShipRepair {
  anachrometer: boolean;
  tails: readonly string[];
}

interface Ledge {
  id: string;
  x0: number;
  x1: number;
  y: number;
  pitch: PitchName;
  kind: "band" | "step" | "block";
  /** Rise over run (+y up). Steps use a small slope so the ship slides off. */
  slope?: number;
}

interface StepPolicy {
  /** Skip landing on bands while falling faster than this (logical |vy|). */
  breakSpeed: number;
  /** When true, bands can catch even above breakSpeed (warp / Anachrometer rest). */
  catchBands: boolean;
}
```

`ShipRepair` is live: Anachrometer starts false and flips after `notch-crash`.

Sim step is a pure function. Rendering, DOM, and audio call it.

```ts
step(
  body: Body,
  ledges: readonly Ledge[],
  dt: number,
  gravity?: number,
  policy?: StepPolicy,
): { body: Body; landedId: string | null };
```

Fixed timestep 1/60. Pause the sim on `visibilitychange`.

## Audio

Use Web Audio (same idea as `portal/src/components/keys-lite/piano.ts`). Do not add Tone.js.

1. **Discrete notes.** Interval HUD taps play the current required pair. After `launch-teach`, gather tones play on Borealis collect (and tap-preview). Landings stay silent.
2. **Climb.** `launch-teach` only: while rising, one oscillator glides with height across the scale.
3. **Aim clicks.** Short descending plucks while the trajectory is casting further (rate + level scale with extension). Holding still, retracting, or releasing is silent.

Theme: `public/assets/notehead/notehead-etheral-vibe.wav` via shared `MusicTransport` / `useThemeMusic` — starts when Launch mounts (with pull / goal tap as fallback if the browser blocks autoplay). Display title stays **Cosmic Aether Soul**.

## Renderer

`NoteheadView` stays SVG for this MVP. Pixi stays deferred. HUD and the goal button stay DOM. Cap `devicePixelRatio` at 2. `prefers-reduced-motion`: no decorative pulse on the warp trail; the shot still plays.

Ship rim color: blue while rising / calm; blue→yellow while falling (hotter with fall speed and near-ground clearance); red flash only when HP is lost (Frequency Band landings stay soft — no red).

## Shell

`GameFullscreenShell` (`theme: "field"`). Beat rules do not live in the shell.

## Table sandbox

Vitest beat tables assert entry bodies, scripted aims/warps, visited sets, repair flags, and next beat. The in-app debug HUD jumps beats; Anachrometer is unlocked after the crash (and for sandbox jumps to later beats) with no HUD toggle. The lore → logic → terrain → sandbox loop may become a Cursor skill later; this MVP is the hand-run version.

## Work order

1. This spec (route + Anachrometer + break-through).
2. Beat progression, break-through `step`, press-to-warp.
3. Sloping stairs; remove auto drop-downs on the route.
4. Terrain aligned to open-top notch and sloping treads.
5. Table sandbox tests and debug HUD.
