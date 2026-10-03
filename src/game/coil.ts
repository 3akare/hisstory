import { BOARD_H, BOARD_W, Board, Cell, cellKey, isWall } from './board';

/**
 * COIL TO CONQUER: the heart of HISSTORY.
 *
 * A coil means GOING AROUND the boss. Two ways count, checked after every step:
 *
 *  A. CIRCLING (the main one, forgiving): walk along Pip's body from tail to
 *     head and add up how far it turns around the boss, like a clock hand
 *     sweeping. Most of a full lap (COIL_DEGREES) counts. No precision needed:
 *     gaps, loose loops and wobbly circles all work.
 *
 *  B. SEALED IN (for wall pins): Pip's body plus the arena walls trap the boss
 *     in a small pocket. Flood fill from the boss through everything that isn't
 *     body or wall; if the fill stays at or under `maxPocket` cells, he's sealed.
 */
/** How much of a lap around the boss counts as a coil (360 = a full circle). */
export const COIL_DEGREES = 300;

/**
 * How many degrees Pip's body sweeps around `center`, following the body from
 * tail to head. Going round once is ±360; going out and back cancels out.
 */
export function windingDegrees(snakeCells: readonly Cell[], center: { x: number; y: number }): number {
  let total = 0;
  let prev: number | null = null;
  for (let i = snakeCells.length - 1; i >= 0; i--) {
    const c = snakeCells[i];
    const dx = c.x - center.x;
    const dy = c.y - center.y;
    if (dx === 0 && dy === 0) continue;
    const a = Math.atan2(dy, dx);
    if (prev !== null) {
      let d = a - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      total += d;
    }
    prev = a;
  }
  return Math.abs((total * 180) / Math.PI);
}
export interface CoilResult {
  coiled: boolean;
  /** The pocket cells (only filled in when coiled), for the highlight effect. */
  pocket: Cell[];
}

export function checkCoil(board: Board, snakeCells: readonly Cell[], target: readonly Cell[], maxPocket: number): CoilResult {
  const none: CoilResult = { coiled: false, pocket: [] };
  if (!target.length) return none;
  // A. Circling: measured around the middle of the boss.
  const center = {
    x: target.reduce((s, c) => s + c.x, 0) / target.length,
    y: target.reduce((s, c) => s + c.y, 0) / target.length,
  };
  if (windingDegrees(snakeCells, center) >= COIL_DEGREES) return { coiled: true, pocket: [...target] };
  return sealedIn(board, snakeCells, target, maxPocket);
}

/** B. Sealed in by body + walls (see above). */
export function sealedIn(board: Board, snakeCells: readonly Cell[], target: readonly Cell[], maxPocket: number): CoilResult {
  const none: CoilResult = { coiled: false, pocket: [] };
  const body = new Set<number>();
  for (const c of snakeCells) body.add(cellKey(c.x, c.y));

  const seen = new Set<number>();
  const queue: Cell[] = [];
  for (const t of target) {
    const k = cellKey(t.x, t.y);
    // A boss cell under the snake can't be the start of a pocket.
    if (body.has(k)) continue;
    if (!seen.has(k)) {
      seen.add(k);
      queue.push(t);
    }
  }
  if (!queue.length) return none;

  let touchesBody = false;
  for (let i = 0; i < queue.length; i++) {
    if (seen.size > maxPocket) return none;
    const c = queue[i];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = c.x + dx;
      const y = c.y + dy;
      if (x < 0 || y < 0 || x >= BOARD_W || y >= BOARD_H) continue;
      const k = cellKey(x, y);
      if (body.has(k)) {
        touchesBody = true;
        continue;
      }
      if (isWall(board, x, y) || seen.has(k)) continue;
      seen.add(k);
      queue.push({ x, y });
    }
  }
  // Walls alone don't count: Pip has to be part of the seal.
  if (!touchesBody || seen.size > maxPocket) return none;
  return { coiled: true, pocket: queue };
}

/**
 * A ring of snake cells around a rectangle (used by the debug "wrap the boss"
 * helper and by tests). Returns cells in path order, so it is a valid snake body.
 */
export function ringAround(x: number, y: number, w = 1, h = 1): Cell[] {
  const ring: Cell[] = [];
  for (let i = x - 1; i <= x + w; i++) ring.push({ x: i, y: y - 1 });
  for (let j = y; j <= y + h; j++) ring.push({ x: x + w, y: j });
  for (let i = x + w - 1; i >= x - 1; i--) ring.push({ x: i, y: y + h });
  for (let j = y + h - 1; j >= y; j--) ring.push({ x: x - 1, y: j });
  return ring;
}
