/**
 * Prototype terrain for the stair run and the notch.
 * SVG space: +y is down. Ledges are horizontal tops the ship can land on.
 */

export interface Ledge {
  id: string;
  x0: number;
  x1: number;
  /** Top surface. */
  y: number;
  pitch: string;
  kind: "band" | "step" | "block";
}

export interface TerrainBody {
  x: number;
  y: number;
  vx: number;
  /** +y is down. */
  vy: number;
  restingOn: string | null;
}

export const TERRAIN_GRAVITY = 700;

export function bandPath(x0: number, x1: number, y: number, sag: number) {
  const mid = (x0 + x1) / 2;
  return `M ${x0} ${y} Q ${mid} ${y + sag} ${x1} ${y}`;
}

export function ledgeById(ledges: readonly Ledge[], id: string | null) {
  if (!id) return null;
  return ledges.find((ledge) => ledge.id === id) ?? null;
}

/** Next surface strictly below `id` (larger y). */
export function lowerLedge(ledges: readonly Ledge[], id: string): Ledge | null {
  const current = ledgeById(ledges, id);
  if (!current) return null;
  const below = ledges.filter((ledge) => ledge.y > current.y + 1);
  below.sort((a, b) => a.y - b.y);
  return below[0] ?? null;
}

export function restOn(ledge: Ledge, radius: number, x?: number): TerrainBody {
  const mid = (ledge.x0 + ledge.x1) / 2;
  return {
    x: x ?? mid,
    y: ledge.y - radius,
    vx: 0,
    vy: 0,
    restingOn: ledge.id,
  };
}

/**
 * One flight frame. Landing requires the bottom to cross a ledge top while
 * falling, with the ship’s x inside that ledge. The highest such ledge wins.
 */
export function stepTerrain(
  body: TerrainBody,
  ledges: readonly Ledge[],
  dt: number,
  radius: number,
  gravity = TERRAIN_GRAVITY,
): { body: TerrainBody; landedId: string | null } {
  if (body.restingOn || dt <= 0) {
    return { body, landedId: null };
  }

  const step = Math.min(dt, 0.032);
  const vy = body.vy + gravity * step;
  const nextX = body.x + body.vx * step;
  const nextY = body.y + vy * step;

  if (vy > 0) {
    const prevBottom = body.y + radius;
    const nextBottom = nextY + radius;
    let hit: Ledge | null = null;
    for (const ledge of ledges) {
      const withinX = nextX >= ledge.x0 && nextX <= ledge.x1;
      const crossed = prevBottom <= ledge.y + 0.75 && nextBottom >= ledge.y;
      if (!withinX || !crossed) continue;
      if (!hit || ledge.y < hit.y) hit = ledge;
    }
    if (hit) {
      return {
        body: {
          x: nextX,
          y: hit.y - radius,
          vx: 0,
          vy: 0,
          restingOn: hit.id,
        },
        landedId: hit.id,
      };
    }
  }

  return {
    body: { x: nextX, y: nextY, vx: body.vx, vy, restingOn: null },
    landedId: null,
  };
}

/**
 * Step down off `from` onto `target`. Picks an x that has left the upper
 * tread, then a short drop so the next frame lands on that step.
 */
export function dropOnto(
  from: Ledge,
  target: Ledge,
  currentX: number,
  radius: number,
): TerrainBody {
  let x = currentX - 16;
  if (x >= from.x0) x = from.x0 - 8;
  if (x < target.x0 + 4) x = target.x0 + 6;
  if (x > target.x1 - 4) x = target.x1 - 6;
  return {
    x,
    y: target.y - radius - 22,
    vx: 0,
    vy: 30,
    restingOn: null,
  };
}
