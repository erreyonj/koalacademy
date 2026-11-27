# Notehead game spec

Source of truth for the Notehead overhaul. If this file and the code disagree, follow this file and change the code.

Story scenes and dialogue are out of scope for the route MVP. Soft transitions spawn the next level; there is no continuous scroll between levels.

## Lore

The player is the Captain of a notehead ship. Music on their world is a force you can harness. The ship is damaged and has set down on a habitable planet that is almost silent. The ship itself is the instrument: a stemless notehead that can take on tails later.

The Frequency Band is the ship's malleable sling. Pulling it launches the notehead. The first repair restores the Anachrometer: press-to-warp time and seat a Frequency Band under the ship mid-flight so the Captain can pull again. Later repairs add tails. The data model leaves room for tails; this MVP only implements the Anachrometer.

The first hard fall is unavoidable. The ship breaks through the band at high fall speed, crashes into the Notch, and the Captain diverts power from the Frequency Band to repair the Anachrometer off screen. After that, soft landings require the warp.

## Route

The game plays **route files** authored in the level editor (`features/levels`). A route is `{version, id, origin, levels}`: one `LevelFile` per level (rock, bands, Borealis, Enter pose, exits) plus the **origin**, the level the route begins on (the editor's "Set Origin", written into the file). Files live in `features/notehead/routes/*.route.json` and are registered in `routes/registry.ts`, which validates the route (every door's `to` is a level in the route, origin exists, every level has an Enter and an exit), builds a scene per level and registers each level with the sim under its own level id.

The editor only authors geometry and links. What *happens* in a level beyond flying through it is code: `routes/events/` holds a table keyed by route id and level id (`eventsFor(routeId, levelId)`): enter stories, the Anachrometer grant, the rise-gate GI, the Tonation interval, hull teaching GIs, the Note-Tail position and the beat before the next level (`departMs`). A level with no entry has no special events. `routes/events/tutorial.ts` carries the tutorial route.

There is no separate launch site. The run begins on the route's **origin** level, and the opening slingshot lesson is an event of that level (`LevelEvents.slingshot`, on `notch1` in the tutorial route).

### The tutorial route (`notch1.route.json`, origin `landing1`)

| Level | Frame | Role |
| --- | --- | --- |
| `landing1` | portrait | The start. Rise-in Enter pose onto the band; the slingshot lesson (vertical pull, guide at G4, band breaks); up → `stairs1`, down → `notch1` |
| `notch1` | portrait | The crash. Entered at its authored Enter pose when the band breaks; Anachrometer grant, optional Ascending 4th (E4→A4); up → `landing1` |
| `stairs1` | portrait | Optional arpeggio (C4→E4→G4); right → `zig1`, down → `landing1` |
| `zig1` | landscape | Optional contour (C4→E4→A4); down-left → `stairs1`, down-right → `zig1` (soft re-entry), up → `8thTail1` |
| `8thTail1` | portrait | Collect the eighth Note-Tail when Tonation/hull gates pass; down → `zig1` |

### Travel

`routes/runtime.ts` (pure) decides where a ship that leaves a level lands. It matches the editor playtest's semantics:

- An exit with a `to` is **always open** (never locked by Borealis or Tonation). An exit with no `to` ends the route.
- **Up / right** exits are forward travel: celebrate, then jump after `departMs` (default 720 ms) to the target's **Enter pose**.
- **Down** exits are the way back and fire the moment a falling hull touches the floor inside the gap. The ship comes in through the target's own door that leads here (falling in through an up door, or flying in from the right edge), and the arrival plays a short slow-motion (`fallIn`, 0.22 for 900 ms).
- An exit that leads to the **same level** is a **soft re-entry**: Borealis and the Tonation attempt are kept and the ship re-enters at the Enter pose.
- Leaving a level through an exit after completing its Borealis interval heals the hull once (see Hull).

Rule: forward arrivals rise or fly in from the Enter pose; reverse arrivals come back through the door they left by.

## Frequency Band and aim

- Height is a diatonic ruler. Default ladder is one octave of C major, `C4`–`C5`. The scale table is the only place those names live.
- On ready, and whenever the player taps the interval HUD, the required pitches play.
- The band is flat at rest and sags only while the player pulls.
- While resting on a Frequency Band, a slight magnetic dock eases the ship to the band center. This does not apply to Anachrometer warp re-pulls (the warp band tracks the ship).
- **Launch teach** pulls are vertical only (`AimMode: "vertical"`). Sideways drag does not aim.
- Every route level takes a drag vector (`AimMode: "free"`). Length is power (0..1). Direction is aim in radians from straight up. Positive aim points to +x. The ship flies opposite the drag.
- Route levels share the editor playtest's aim cone: portrait ±0.95 rad, landscape ±1.0 rad from straight up. Hard difficulty shaves both sides (`aimInset`).
- While pulling with power, a dashed chart traces the flight `launchVelocity` and `step` would produce. The chart disappears on release.

## Break-through

While falling faster than `BREAK_SPEED`, the ship does not land on `kind: "band"` ledges. Blocks and steps can still catch. During the slingshot lesson the level's first band stays soft until the guide is crossed on the way up — only then can a hard fall break through. The break plays a snap animation (band splits, peels, shards) while the ship falls in slow motion out through the level's floor gap, and the ship crashes into the level that gap leads to (at its Enter pose). Everywhere else, and once the lesson is done, bands always catch (`catchBands: true`). Once the Anachrometer is on, a mid-flight warp lets the Captain pull again while still moving so soft landings are reachable.

## Borealis and Tonation

**Borealis** are glowing mid-air orbs. They replace waiting Frequency Bands: the Captain flies near them, they magnetize, and collecting counts as a visit. Physical collect is **any order**. Tap an orb to preview its pitch without collecting.

**Tonation** is a separate banked energy resource (HUD solid meter, cap **24**). Completing a level's **interval challenge** (`LevelEvents.tonation`) in the required pitch order banks that level's payout **once**:

| Level | Interval | Pitches (order) | Payout |
| --- | --- | --- | --- |
| `notch1` | Ascending 4th | E4 → A4 | +5 |
| `stairs1` | Arpeggio | C4 → E4 → G4 | +9 |
| `zig1` | Contour | C4 → E4 → A4 | +10 |

- Wrong-order collect **consumes** the gem and **fails** the attempt (0 Tonation this visit). Remaining gems stay collectable — nothing locks. All orbs regen when the Captain leaves the level and returns (a soft re-entry keeps them), so the interval can be retried then.
- The first Tonation banked in a run opens the `tonation-first` GI (four cards: energy source / correct interval order calibrates Tonation / this route's interval group / other routes may differ). It replaces the old Notch exit GI; leaving Notch never interrupts.
- Successful full sequence plants an `exit-band` under the last gem (soft pad) and banks the payout (idempotent per level).
- Magnetism / collect run in **real time** — Anachrometer slows the ship, not Borealis.
- **Exit** on Borealis levels is always available (skip freely). Frame edges seal except the level's exits. The exit band after a successful interval is planted by casting down from the last gem onto the level's rock or ledges; over open sky none is planted.
- The Tonation interval's pitches must match the level's Borealis pitches (checked by `tests/routes.test.ts`).

## Bottom-edge exits

Reverse travel uses **floor gaps** (a `down` exit, `bottomOpening(x0, x1)`), not side corners. The floor inside a gap is unsealed; the route fires the moment a **falling** hull touches the floor there (`vy ≤ 0`, `y − SHIP_R ≤ 0`, x inside the span: `touchedOpening`, via `matchDeparture`). Rising enter bodies never fire them, so rise-in arrivals pass through safely. Frame edges that are not an exit stay sealed. The editor playtest refuses to start a level whose ship flies out an exit before landing on anything.

- HUD `interval:` always shows every required pitch of the level's interval (`intervalHudPitches`), regardless of progress. Tap it to hear the whole sequence.
- The eighth Note-Tail (`LevelEvents.noteTail`, on `8thTail1`) requires Tonation ≥ **19** (Easy/Med) or **24** (Hard), plus hull ≥ **2** (Med) / ≥ **3** (Hard). Easy has no hull gate beyond staying alive.

## Hull (HP)

A simple hull bar in the HUD. Easy **10** / Medium **8** / Hard **5** (`profile.maxHp`).

- Landings on `kind: "band"` Frequency Bands never cost HP.
- Landings on steps / blocks cost 1 HP only when fall speed ≥ `LANDING_HIT_SPEED` (~6 ship-radii freefall). Short hops onto adjacent terrain stay free.
- Hard rock impacts (`resolveMasses` into a wall at ≥ `MASS_HIT_SPEED`) also cost 1 HP — pocket grazes on a short hop do not.
- Sealed exit-frame barriers bounce on every dial; they cost 1 HP **only on Hard**.
- First exit from a level after **completing** its interval (`notch1` / `stairs1` / `zig1`) heals Easy/Med **+3**, Hard **+1**. Leaving without the interval does not heal, so hull damage carries into the next level (`exitHealsHull`).
- At 0 HP the ship plays a short shatter burst (`phase: "breach"`), then any hull teach GI, then the level restarts with a full hull. **Hard** also wipes the Tonation bank; Easy/Med keep Tonation.

## Solid terrain

Rock masses are solid. The ship cannot pass through mass outlines; `resolveMasses` pushes it out and kills inward velocity. Frequency Band break-through still applies only to `kind: "band"` ledges, not to rock.

## Anachrometer (press-to-warp)

Granted on first entry to a level whose events say so (`grant.anachrometer`; `notch1` in the tutorial route), so `repair.anachrometer = true`.

While airborne, a press with Anachrometer on:

1. Sets sim `timeScale` to a slow factor (about 0.10). Ship physics only — Borealis magnet / collect stay real-time.
2. Places a transient `warp-band` under the ship (it tracks the ship while engaged).
3. Opens a pull on that same press — the ship keeps its velocity so the Captain can aim the next shot in real time.

Releasing the pull with power clears the warp band, restores `timeScale = 1`, and applies a new launch from the current pose. Releasing with no power cancels the warp and resumes normal flight. Without Anachrometer, the mid-air press is a no-op.

If the ship touches a real surface (tread, band, block) while still holding an air-warp pull: the warp band and slow-mo clear, but the pull/aim stays active. Sloped treads still seat → slide → fall under that same pull.

## Slingshot lesson

- Authored as `LevelEvents.slingshot` `{goal, miss, hint, clearHint}`; the origin's enter story is `launch-enter`. Pulls are vertical only (`AimMode: "vertical"`), the guide line stands `goal` scale degrees above the level's first band, and the climb voice glides up the scale while rising.
- The lesson clears when the guide was crossed rising and the ship then breaks through the band on the way down. Short shots that never reach the guide always soft-land and tell the `miss` GI.
- The slo-mo fall (`BREAK_FALL_TIME_SCALE` 0.22) plays until the ship touches the floor gap, then the game jumps to the crash level's Enter pose. Sliding off the band without breaking it restarts the lesson; leaving up or sideways ends it. Afterwards the level is plain.

## Levels

- Rock, bands, Borealis, exits and the Enter pose come from the level file. A level is drawn by one generic renderer (`LevelArt`) and played through the same sim helpers, keyed by level id.
- Portrait levels use the portrait frame (900 × 1600 logical). Landscape levels use the landscape frame (`554×308` art in the same logical world); force landscape device orientation with an on-screen prompt when portrait.
- The landscape camera shows the frame edge to edge (`LANDSCAPE_CAMERA = 1`, no sky gutter), so the editor frame, the game frame and pointer mapping all line up. The stage keeps the frame's ratio and grows with the window, at 90% of the size where the HUD, hint and music bar would overflow the viewport.
- The landscape view is `554×308` units against portrait's `200×360`, so one view unit is about the same pixels in both. Anything drawn in view units (ship `rx 8 / ry 6`, band width, rock stroke, gems) reads the same size in every level. A band's width in view units sets how large it looks: author a landscape band about 24 view units wide (about 39 logical) to match stairs1.
- The collision circle is unchanged (31 logical). It is anisotropic in landscape, so it is wider on screen than the drawn ship.
- Bands are the only ledge kind the editor authors. A Borealis gem's pitch is its own (A3 to E5).
- Hull-teach, enter stories and the rise-gate GI come from the events table, not from level geometry.

## Difficulty

One profile shared by every level. Route Easy ignores apex windows. The dial still exists for aim inset and sandbox legacy checks.

| Dial | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Aim inset | 0 | 0.08 | 0.22 |
| Max HP | 10 | 8 | 5 |
| Level clear heal | +3 | +3 | +1 |
| Eighth Tail Tonation | ≥19 | ≥19 | ≥24 |
| Eighth Tail hull | — | ≥2 | ≥3 |
| Breach Tonation | keep | keep | wipe |

K–2 play uses Easy. Do not fork components per difficulty.

## Data shapes

Logical space is portrait, **900 × 1600**, origin at the bottom-left, **+y up**. Physics never reads screen pixels.

```ts
/** A place the sim runs in: a route level id ("launch" is only the editor's portrait pseudo-region). */
type RegionId = string;

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

`ShipRepair` is live: Anachrometer starts false and flips on the level whose events grant it.

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

1. **Discrete notes.** Interval HUD taps play the current required pair. After the slingshot lesson, gather tones play on Borealis collect (and tap-preview). Landings stay silent.
2. **Climb.** Slingshot lesson only: while rising, one oscillator glides with height across the scale.
3. **Aim clicks.** Short descending plucks while the trajectory is casting further (rate + level scale with extension). Holding still, retracting, or releasing is silent.

Theme: `public/assets/notehead/notehead-etheral-vibe.wav` via shared `MusicTransport` / `useThemeMusic` — starts when Launch mounts (with pull / goal tap as fallback if the browser blocks autoplay). Display title stays **Cosmic Aether Soul**.

## Renderer

`NoteheadView` stays SVG for this MVP. Pixi stays deferred. HUD and the goal button stay DOM. Cap `devicePixelRatio` at 2. `prefers-reduced-motion`: no decorative pulse on the warp trail; the shot still plays.

Ship rim color: blue while rising / calm; blue→yellow while falling (hotter with fall speed and near-ground clearance); red flash only when HP is lost (Frequency Band landings stay soft — no red).

## Shell

`GameFullscreenShell` (`theme: "field"`). Route rules do not live in the shell.

## Tests

Vitest asserts the route registry (every door resolves, origin round-trips, bad files are rejected), the runtime's arrival cases (forward, back, self-loop soft re-entry, route end), the events table against the route (every key is a level id, interval pitches match the level's gems), and the pure sim, collision, terrain and exit-zone helpers against the levels of the shipped route. The in-app debug HUD jumps between level ids. The lore → logic → terrain → sandbox loop may become a Cursor skill later; this MVP is the hand-run version.

## Work order

1. This spec (route + Anachrometer + break-through).
2. Break-through `step`, press-to-warp.
3. Sloping stairs; remove auto drop-downs on the route.
4. Level editor and route files.
5. Route-driven game: registry, scenes, runtime, events table.
