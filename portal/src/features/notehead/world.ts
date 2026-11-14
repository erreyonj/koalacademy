/**
 * Persistent Notehead world. Regions share one route; the prototype
 * switches among them without a new page.
 */

export const C_MAJOR_OCTAVE = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
] as const;

export type PitchName = (typeof C_MAJOR_OCTAVE)[number];

export type RegionId = "launch" | "stairs" | "notch";

export interface Region {
  id: RegionId;
  label: string;
}

export const REGIONS: readonly Region[] = [
  { id: "launch", label: "Launch" },
  { id: "stairs", label: "Stairs" },
  { id: "notch", label: "Notch" },
];

export interface NoteheadWorld {
  regions: Region[];
  currentRegionId: RegionId;
  /** Diatonic ladder used as the height ruler. */
  scale: readonly PitchName[];
  /** Zero-based degree the guide line sits on. */
  targetDegree: number;
  /** Ship rests in the cradle between shots. */
  shipResting: boolean;
}

export function createLaunchWorld(
  targetDegree = 4,
): NoteheadWorld {
  return {
    regions: [...REGIONS],
    currentRegionId: "launch",
    scale: C_MAJOR_OCTAVE,
    targetDegree: Math.max(0, Math.min(C_MAJOR_OCTAVE.length - 1, targetDegree)),
    shipResting: true,
  };
}

export function pitchAtDegree(
  scale: readonly PitchName[],
  degree: number,
): PitchName | null {
  return scale[degree] ?? null;
}
