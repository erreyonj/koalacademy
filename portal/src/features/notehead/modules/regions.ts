/**
 * The registry of regions that come from route files rather than code.
 *
 * The sim, rock and art helpers are keyed by a region id. "launch" is the one
 * built-in region (the opening slingshot). Every level of a loaded route
 * registers here under its own level id, so those helpers find the level's
 * view, bands, rock and exit art without knowing anything about routes.
 *
 * This module is a leaf: it only imports types, so `sim.ts` and `terrain.ts`
 * can read it without a cycle.
 */
import type { ExitZone } from "./exit-zone";
import type { Body, Ledge } from "./sim";
import type { Mass } from "./terrain";

export type RegionView = "portrait" | "landscape";

export interface RegionData {
  id: string;
  view: RegionView;
  /** Authored landable surfaces (before any live exit / warp band). */
  ledges: readonly Ledge[];
  /** Rock in the region's view space (+y down), with score marks. */
  masses: readonly Mass[];
  /** Chevron + barrier art for up / right exits. */
  exitZones: readonly ExitZone[];
  /** The ship's pose on entering from the route's origin. */
  start: Body;
  /** Seed for the star field, so a level always shows the same sky. */
  skySeed: number;
}

const registry = new Map<string, RegionData>();

export function registerRegion(data: RegionData): void {
  registry.set(data.id, data);
}

export function regionData(id: string): RegionData | undefined {
  return registry.get(id);
}

export function isRegistered(id: string): boolean {
  return registry.has(id);
}

/** Forget every registered region (tests). */
export function clearRegions(): void {
  registry.clear();
}

/** A stable star-field seed from a level id. */
export function skySeedOf(id: string): number {
  let hash = 0x9e37;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(i)) >>> 0;
  }
  return (hash % 0xfffe) + 1;
}
