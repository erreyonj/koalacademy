/**
 * A level file as the game plays it. `buildLevelScene` converts the authored
 * shapes once (rock with score marks, ledges, exits with their route doors,
 * the Enter pose) and `registerScene` hands the view, rock and ledges to the
 * sim's region registry so every helper keyed by a region id finds them under
 * the level's own id.
 */
import { previewLevel } from "../../levels/adapter";
import { buildScene, type SceneDoor } from "../../levels/playtest/runtime";
import type { BorealisSpot, LevelFile, LevelView } from "../../levels/types";
import type { LogicalMass } from "../modules/collide";
import type { ExitZone, FrameOpening } from "../modules/exit-zone";
import { registerRegion, skySeedOf } from "../modules/regions";
import type { Body, Ledge, SvgViewSize } from "../modules/sim";
import type { Mass } from "../modules/terrain";

export type { SceneDoor };

export interface LevelScene {
  /** The level id, also its region id in the sim registry. */
  id: string;
  level: LevelFile;
  view: LevelView;
  size: SvgViewSize;
  /** Rock in view space (+y down), with score marks, for drawing. */
  masses: Mass[];
  /** The same rock in logical space (+y up), for collision. */
  logical: LogicalMass[];
  ledges: Ledge[];
  borealis: BorealisSpot[];
  /** Soft frame gaps, one per exit. */
  openings: FrameOpening[];
  /** One per opening: the level it leads to, or null for a route end. */
  doors: (SceneDoor | null)[];
  exitZones: { id: string; zone: ExitZone | null }[];
  /** The ship's pose when it arrives from the route's start. */
  start: Body;
}

/** Why a level cannot be played, or null. */
export function sceneBlocker(level: LevelFile): string | null {
  if (!level.enter) return "has no enter point";
  if (level.exits.length === 0) return "has no exit";
  if (buildScene(level) === null) return "is not a valid level";
  return null;
}

export function buildLevelScene(level: LevelFile): LevelScene {
  const base = buildScene(level);
  if (!base) {
    throw new Error(`Level "${level.id}" ${sceneBlocker(level) ?? "cannot be played"}.`);
  }
  const preview = previewLevel(level);
  return {
    id: level.id,
    level,
    view: level.view,
    size: preview.view,
    masses: preview.masses,
    logical: base.masses,
    ledges: base.ledges,
    borealis: level.borealis,
    openings: base.openings,
    doors: base.doors,
    exitZones: preview.exitZones,
    start: base.start,
  };
}

/** Make the sim's region helpers answer for this level's id. */
export function registerScene(scene: LevelScene): void {
  registerRegion({
    id: scene.id,
    view: scene.view,
    ledges: scene.ledges,
    masses: scene.masses,
    exitZones: scene.exitZones.flatMap((entry) => (entry.zone ? [entry.zone] : [])),
    start: scene.start,
    skySeed: skySeedOf(scene.id),
  });
}
