/**
 * Special events for a route. The level editor only authors geometry; what
 * happens in a level beyond flying through it (stories, the Anachrometer
 * repair, Tonation intervals, the Note-Tail) is code, and lives here, keyed by
 * route id and level id.
 */
import type { StoryEventId } from "../../modules/story";
import type { PitchName } from "../../modules/sim";
import type { IntervalChallenge } from "../../modules/tonation";

/**
 * The slingshot lesson: a vertical-only pull on the level's first band. The
 * band stays soft until the ship rises past the guide line (the `goal` pitch
 * above the band); then the next fall breaks through it, and the ship drops out
 * of the level's floor gap and crashes into the level that gap leads to, at
 * that level's Enter pose. After the break the level plays like any other.
 */
export interface Slingshot {
  /** The guide line stands at this scale degree above the band. */
  goal: PitchName;
  /** Told when the ship lands back on the band short of the guide. */
  miss: StoryEventId;
  /** HUD line while the lesson is live. */
  hint: string;
  /** HUD line once the band breaks. */
  clearHint: string;
}

export interface LevelEvents {
  /** The opening slingshot lesson (see `Slingshot`). */
  slingshot?: Slingshot;
  /** Stories queued the first time the ship enters this level in a run. */
  enter?: readonly StoryEventId[];
  /** Ship repairs granted on first entry. */
  grant?: { anachrometer?: boolean };
  /** A GI that fires once, the first time the ship rises past `y` (logical). */
  riseGate?: { y: number; event: StoryEventId };
  /**
   * Borealis collected in this order bank Tonation. The first time the ship
   * leaves such a level it also heals the hull (see `health.ts`).
   */
  tonation?: IntervalChallenge;
  /** Hull teaching GIs: first damage, and first breach. */
  hull?: { hit?: StoryEventId; breach?: StoryEventId };
  /** A floating Note-Tail, in logical space. Collecting it completes the route. */
  noteTail?: { x: number; y: number };
  /** Beat (ms) between a forward exit and the next level. Default 720. */
  departMs?: number;
}

export interface RouteEvents {
  routeId: string;
  levels: Readonly<Record<string, LevelEvents>>;
}
