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
| `notch-crash` | Notch | Enter from above; touch the high block; land on the floor. Unlock `repair.anachrometer` |
| `notch-calibrate` | Notch | With Anachrometer, collect Borealis at pocket and block (floor starts visited); jump up through the top exit |
| `launch-bridge` | Launch | Enter rising onto the launch band (continues the Notch exit jump); a full-power shot through the top exit clears into Stairs |
| `stairs-anach` | Stairs | Enter rising onto the approach band (reads as the Launch Bridge exit); collect Borealis above every tread; jump right through the side exit |
| `zig-1` | Zig | Enter rising onto the peak Frequency Band; collect Borealis float → left shelf → right shelf; jump up through the top exit |

Soft transitions: most clears sparkle, then spawn the next beat's entry body (often already in flight). `launch-teach` skips the star burst and holds a slo-mo fall through the broken band until OOB, then cuts to Notch crash. `notch-crash` also skips the star burst.

## Frequency Band and aim

- Height is a diatonic ruler. Default ladder is one octave of C major, `C4`–`C5`. The scale table is the only place those names live.
- On ready, and whenever the player taps the goal, the target pitch plays once.
- The band is flat at rest and sags only while the player pulls.
- While resting on a Frequency Band, a slight magnetic dock eases the ship to the band center. This does not apply to Anachrometer warp re-pulls (the warp band tracks the ship).
- Launch pulls are straight down. Sideways drag does not aim.
- Stairs and the notch take a drag vector. Length is power (0..1). Direction is aim in radians from straight up. Positive aim points to +x. The ship flies opposite the drag.
- Each rest spot (except launch) has an aim cone. Hard difficulty shaves both sides (`aimInset`).
- While pulling with power, a dashed chart traces the flight `launchVelocity` and `step` would produce. The chart disappears on release.

## Break-through

While falling faster than `BREAK_SPEED`, the ship does not land on `kind: "band"` ledges. Blocks and steps can still catch. On `launch-teach`, the launch band stays soft until the guide is crossed on the way up — only then can a hard fall break through. The break plays a snap animation (band splits, peels, shards) while the ship falls in slow motion until it leaves the frame, then Notch crash begins. Once the Anachrometer is on, a mid-flight warp lets the Captain pull again while still moving so soft landings are reachable.

## Borealis

Borealis is the ship's energy resource — glowing mid-air collectibles that mark the spaces a beat needs the Captain to reach. They replace waiting Frequency Bands in the middle of a place: the Captain flies near them, they magnetize toward the ship, and collecting them counts as a visit. The ship does not need to land on terrain to progress; it can keep falling, gather Borealis, then press-to-warp the next pull.

- Placed for visit chains: `notch-calibrate` (pocket, block), `stairs-anach` (one above each tread), and `zig-1` (float, left shelf, right shelf).
- Collectible only in goal order: the next uncollected gem magnetizes; later gems wait.
- Within `MAGNET_RANGE`, the active gem drifts toward the ship.
- Magnetism and collect run in **real time** — Anachrometer `timeScale` slows the ship, not Borealis.
- Within `COLLECT_RADIUS`, it is gathered, plays its goal pitch, and adds its id to `visited`. After `launch-teach`, pitched notes come from Borealis gathers only (not landings).
- Goal / HUD tonation matches Borealis in gather order: `notch-calibrate` **E4 A4**; `stairs-anach` **C4 E4 G4**; `zig-1` **C4 E4 A4**. Beats without Borealis keep the region's single guide pitch.
- Gathering every Borealis on a beat restores 1 HP (capped at max).
- The **last** Borealis may plant an `exit-band` Frequency Band under that gem as a soft landing pad. Stage advance is the purple **exit zone** arrow: after Borealis are gathered, frame edges seal (soft walls) except the exit opening — the ship cannot OOB-restart and must leave through that gap (`notch-calibrate` / `stairs-anach` / `zig-1` top or right). `launch-bridge` seals from the start and needs a full-power shot out the top.
- Terrain masses stay; mid waiting bands at those spots are not drawn.

## Hull (HP)

A simple hull bar in the HUD. Easy starts at **5** HP (`profile.maxHp`).

- Landings on `kind: "band"` Frequency Bands never cost HP.
- Landings on steps / blocks (and hard rock impacts) cost 1 HP.
- Hard rock impacts (`resolveMasses` with speed into the wall) also cost 1 HP.
- Gathering all Borealis on the current beat restores 1 HP.
- At 0 HP the beat restarts with a full hull.

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
- `launch-bridge` starts resting on the launch band. A full-power shot through the top exit clears into `stairs-anach`.

## Notch

- Classic portrait notch: left wall with a first peak above the pocket shelf, high right block, floor band on the lower slope.
- Open from above so `notch-crash` can fall in and clip the block.
- Pocket (`E4`). Block (`A4`). Floor band (`C4`). Tonation **E4 A4** (both Borealis).
- `notch-crash` clears when the ship has visited the block and then rests on the floor; then Anachrometer unlocks.
- `notch-calibrate` starts on the floor (floor already visited). Clear by collecting Borealis at pocket and block — no need to land on those ledges.

## Zig

- Landscape region (`360×200` art in the same logical world). Force landscape device orientation with an on-screen prompt when portrait. Stage is ~2× the portrait playfield footprint.
- Twin hanging cliffs + bottom peak (`notehead-mock-zig-1.png`). Left shelf is a deep horizontal platform; right side is a sloping wedge. Tonation **C4 E4 A4** (float → left → right Borealis).
- Ledges: `zig-peak` (`C4` band), `zig-left` (`E4` band), `zig-right` (`A4` sloping step). Shelves are spread far apart for a clear zig-zag.
- `zig-1` starts on the peak (peak already visited). Collect Borealis in order: floating shaft gem → left shelf → right shelf; last gem plants the exit band.

## Stairs

- Three long treads sit in the lower-right stair cave. Each tread slopes down toward open sky (left).
- The approach Frequency Band sits left of the lowest tread, slightly below its open lip (`C4`).
- Tread hits always seat (no trampoline bounce). The ship slides toward open sky and drips off the lip; +x into the rock is killed.
- There is no auto drop-down from tread to tread.
- Borealis sits over each tread's open face (not buried under higher steps).
- Default tread pitches / tonation, bottom to top: `C4 E4 G4`.
- `stairs-anach` clears when every tread id has been visited via Borealis collect (tread contact still counts).

## Difficulty

One profile shared by every region. Route Easy uses the beat table and ignores apex windows. The dial still exists for aim inset and sandbox legacy checks.

| Dial | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Aim inset | 0 | 0.08 | 0.22 |
| Max HP | off (0) | 5 | 4 |
| Miss copy | retry | retry, name the miss | split pitch / landing when useful |

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

1. **Discrete notes.** Goal taps anytime. After `launch-teach`, gather tones play only on Borealis collect (Notch: E4 then A4; Stairs: C4, E4, G4). Landings stay silent.
2. **Climb.** `launch-teach` only: while rising, one oscillator glides with height across the scale.
3. **Aim clicks.** Short descending plucks while the trajectory is casting further (rate + level scale with extension). Holding still, retracting, or releasing is silent.

`resume` on the pull gesture. Theme: `public/assets/notehead/Swung Gospel Glide.mp3` via shared `MusicTransport` / `useThemeMusic` (`start` on first pull or goal tap).

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
