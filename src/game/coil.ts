import { BOARD_H, BOARD_W, Board, Cell, cellKey, isWall } from './board';

/**
 * COIL TO CONQUER: the heart of HISSTORY.
 *
 * A boss is "coiled" when it is sealed inside a small pocket of the board that
 * it cannot get out of. The walls of the pocket are Pip's body plus the arena's
 * walls/edges, so pinning a boss against a wall counts.
 *
 * How we check it, after every snake step:
 *   1. Every cell of Pip's body (and every wall) is BLOCKED.
 *   2. Flood fill from the boss's cells through everything that isn't blocked.
 *   3. If the fill runs out of room before it gets bigger than `maxPocket`,
 *      the boss is sealed in: that's a coil.
 * Without a snake wall around the boss, the fill spreads across the whole
 * board and blows past `maxPocket`, so nothing counts by accident.
 */
export interface CoilResult {
  coiled: boolean;
  /** The pocket cells (only filled in when coiled), for the highlight effect. */
  pocket: Cell[];
}

export function checkCoil(board: Board, snakeCells: readonly Cell[], target: readonly Cell[], maxPocket: number): CoilResult {
  const none: CoilResult = { coiled: false, pocket: [] };
  if (!target.length) return none;
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
