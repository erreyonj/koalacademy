# Notehead game spec

Source of truth for the Notehead overhaul. Prototypes in this folder are playable references, not the target architecture. If this file and the code disagree, follow this file and change the code.

Story scenes, dialogue, and level-to-level transitions are out of scope until the sim, audio, and renderer below exist. Do not invent them while extracting the prototypes.

## Lore

The player is the Captain of a notehead ship. Music on their world is a force you can harness. The ship is damaged and has set down on a habitable planet that is almost silent. The repair tech is beyond the Captain, but the ship itself is the instrument: a notehead that can take on tails later (quarter, eighth, sixteenth, and so on).

Each region is a calibration. Clearing a calibration repairs one function. Clearing the set repairs the ship enough to leave. A later game can start from that repaired ship. This spec only covers the first planet.

The damaged ship is stemless, which is already a whole note. The first repair restores the Anachrometer (time-warp landing). Later repairs add tails. Do not build the Anachrometer or the tails in the extraction pass. The data model must leave room for them.

Pitch and landing are different skills. A shot can be the right pitch and still fail the landing, or the reverse. Feedback names which one failed. For K–2, a miss is only "try again." Older difficulties may score the two skills apart. The Anachrometer landing, when it exists, is musical: a whole note is four beats, so "hold while falling" means sustaining that note. Easy hold is anywhere during the fall. Harder holds are a four-count sustain, or a release on a count to clear terrain. The first time the ship falls, the crash is unavoidable, then the game teaches the hold. Not every shot is a straight drop.

## Planet

One route, one world, three regions. The player moves between them as places on the same planet, not as separate games. Today that switch is the Launch / Stairs / Notch bar. Story travel replaces that bar later. Do not add a new route per region.

| Region | Working name | What the shot teaches |
| --- | --- | --- |
| `launch` | Launch site | Apex pitch. Pull, rise through a scale, match the guide line at the top of the flight. |
| `stairs` | Stair cave | Melodic direction. Launch so the ship comes down the stack and touches every tread. |
| `notch` | Notch | Two bands and a high block. Aim chooses the pocket or the block. Power chooses how far the shot goes. |

### Launch site

- The note you play is the apex. Crossing the guide line on the way up does not count. Overshoot is a miss.
- Height is a diatonic ruler. Default ladder is one octave of C major, `C4`–`C5`. The scale table is the only place those names live.
- On ready, and whenever the player taps the goal, the target pitch plays once.
- The Frequency Band is flat at rest and sags only while the player pulls. The pull is straight down. Sideways drag does not aim the shot.
- After the apex the ship returns to the band. No damage and no warp-land in this pass.

### Aim

Stairs and the notch take a drag vector. Length is power (0..1). Direction is aim, measured in radians from straight up. Positive aim points to +x. The ship flies opposite the drag: pull down to shoot up, pull down-left to shoot up-right.

Each rest spot has a cone. An aim outside the cone is clamped to the edge, so the ship cannot be fired into the cliff. Hard difficulty shaves both sides of that cone (`aimInset`). The launch site has no cone.

The band and the ship sag along the drag while the finger is down, and the band is flat again at rest. A band the ship is sitting on may still show a small cradle.

While the finger is down and the pull has power, a dashed chart traces the flight that `launchVelocity` and `step` would produce, including the stair drop-downs. A ring marks the apex. The chart disappears on release. It is the same shot the player is about to fire, not a separate estimate.

### Stair cave

- Black treads rise to the right. The Frequency Band sits in the open sky to their left, flat until pulled.
- Aim up and to the right, toward the stack. Enough power reaches the top tread. The ship then steps down the rest. Each tread plays its pitch on landing.
- The same aim with less power lands short and visits only the treads from the impact down, which is not a clear.
- Clear means every required tread was touched on that shot. Easy asks for the top three. Medium and hard ask for every tread.
- Default tread pitches, bottom to top: `C4 D4 E4 F4 G4`. The goal control plays `G4`.

### Notch

- A cliff pocket, a floor band, and a high block. Bands are flat until pulled. A band the ship is resting on may show a small cradle.
- From the floor, aim up-left to land in the pocket and aim nearly straight up with more power to land on the block. From the pocket, aim up-right toward the block.
- Pocket pitch `E4`. Block pitch `A4`, and that is the goal. Floor is `C4`.
- Clear means the shot lands on the block, except on Easy, where the pocket also clears. The pocket is a legal rest either way.

Frame art (pink sky, black terrain, cyan bands) is a motion and layout reference. Colors stay in theme tokens. Do not hard-code a palette into the sim.

## Difficulty

One profile shared by every region. The shell does not own it. Suggested id: `DifficultyProfile`.

| Dial | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Apex window | ±1 scale degree | exact degree | exact degree |
| Stair clear | top three treads | every tread | every tread, narrower aim cone |
| Notch clear | pocket or block | block only | block only, narrower aim cone |
| Miss | retry, no score split | retry, name pitch or landing | pitch score and landing score apart |
| Landing hold | not in this game yet | not in this game yet | not in this game yet |

K–2 play uses Easy. The profile is data. Do not fork components per difficulty.

## Data shapes

Logical space is portrait, **900 × 1600**, origin at the bottom-left, **+y up**. Physics never reads screen pixels. The view scales this rectangle to fit. The current prototypes do not match this yet: launch math is +y up in abstract units, stair and notch math is SVG **+y down** in a 200 × 360 viewBox. Extraction must convert both into this space.

```ts
type PitchName = `${"C" | "D" | "E" | "F" | "G" | "A" | "B"}${"" | "#" | "b"}${number}`;

type DifficultyId = "easy" | "medium" | "hard";

interface Scale {
  id: string;
  pitches: readonly PitchName[];
}

interface Aim {
  power: number;
  /** Radians from straight up. Positive aims to +x. */
  angle: number;
}

interface DifficultyProfile {
  id: DifficultyId;
  apexWindowDegrees: number;
  stairClear: "top-three" | "all";
  notchClear: "pocket-or-block" | "block";
  splitSkills: boolean;
  /** Radians removed from each side of the aim cone. */
  aimInset: number;
}

type RegionId = "launch" | "stairs" | "notch";

interface Region {
  id: RegionId;
  label: string;
  scaleId: string;
  goalPitch: PitchName;
}

interface Ledge {
  id: string;
  x0: number;
  x1: number;
  y: number;
  pitch: PitchName;
  kind: "band" | "step" | "block";
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  restingOn: string | null;
}

interface ShotSample {
  t: number;
  body: Body;
  /** Pitches whose heights were crossed while rising, in order. */
  crossedUp: PitchName[];
  apexPitch: PitchName | null;
}

interface ShotResult {
  regionId: RegionId;
  apexPitch: PitchName | null;
  landedOn: string | null;
  visited: readonly string[];
  pitchOk: boolean;
  landingOk: boolean;
  cleared: boolean;
}
```

`ShipRepair` can wait as an empty slot on the world: `{ anachrometer: false, tails: [] }`. Do not implement its behavior.

Sim step is a pure function. Rendering, DOM, and audio call it. They do not contain the rules.

```ts
step(body: Body, ledges: readonly Ledge[], dt: number, gravity: number): {
  body: Body;
  landedId: string | null;
};
```

Fixed timestep inside the sim (use 1/60). The renderer ticker only draws the latest sample. Pause the sim on `visibilitychange`. Launch-site apex tests and the stair/notch landing tests move onto this step. An up-right stair aim with enough power must visit every tread. The same aim with less power must miss the top. A notch aim toward the pocket must land on `pocket`. A near-vertical full-power notch aim must land on `block`. An overshoot that crosses the launch guide must not clear. Launch aim is always straight up.

## Audio

Use Web Audio, the same context idea as `portal/src/components/keys-lite/piano.ts`. Do not add Tone.js.

Two layers:

1. **Discrete notes.** Taps on the goal, tread landings, pocket and block landings. One shot per event.
2. **Climb.** While the ship is rising, a single oscillator glides with height across the scale, retargeting as the ship crosses each degree. Stop or duck it at the apex. Pull strength is what sets the apex, so the climb the player hears is the climb they aimed.

`resume` happens on the pull gesture, same as today. No theme track until a file exists. `useThemeMusic` stays unwired.

## Renderer

A small interface. The sim never imports Pixi or SVG.

```ts
interface NoteheadView {
  mount(host: HTMLElement): void;
  resize(width: number, height: number): void;
  frame(sample: ShotSample, region: Region): void;
  unmount(): void;
}
```

- **SVG view.** Adapt the current Launch, Stairs, and Notch drawings to this interface. This is the fallback and the thing tests can ignore.
- **Pixi view.** Second implementation of the same interface. PixiJS v8 (MIT). Draw with Graphics, or upload the existing SVG art as textures. HUD and the goal button stay DOM, so the current CSS and the "tap the goal to hear it" control remain.
- Do not install Pixi until the sim tests pass and someone has confirmed current v8 builds of `pixi-filters` (or dropped that plugin). Glow, bloom, shockwave, and displacement are polish, not the first Pixi commit.
- Particles (dust, sparkle, a pitch-colored trail) come after the view can show a shot.
- Client only. The portal is a static export. Create the app in `useEffect` and `import()` Pixi with SSR off. Prefer a plain mount component over `@pixi/react` so the sim/view line stays obvious.
- Cap `devicePixelRatio` at 2.
- `prefers-reduced-motion`: no bloom, shockwave, or displacement. The shot still plays.

## Shell

The page stays inside `GameFullscreenShell` (`theme: "field"`). Boot copy can change. Do not put region rules in the shell.

## Work order

1. This spec.
2. Extract one sim in logical space. Move the launch apex rule and the stair/notch landing rule in as tests. Delete duplicate physics only after those tests pass.
3. Audio module. Discrete notes plus the rising oscillator. Wire pull to the climb.
4. `NoteheadView`, then wrap the existing SVG in it.
5. Pixi view behind that interface, after the plugin check above. Own branch and PR.
6. Difficulty profile plugged into the sim. The shell only displays the current dial.
7. Per-element visual polish, then lore and transitions.
