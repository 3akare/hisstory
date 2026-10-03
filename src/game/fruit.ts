import { BOARD_H, BOARD_W, Cell, cellKey, DIR_VEC, Dir, manhattan } from './board';
import type { Rng } from '../engine/rng';

export type FruitKind = 'apple' | 'poison' | 'portal';

export interface Fruit {
  kind: FruitKind;
  x: number;
  y: number;
  /** Portal fruit only: id shared by the two twins. */
  pair?: number;
  /** Seconds since it appeared (for the pop-in animation). */
  age: number;
}

/**
 * Pick a random free cell, or null if the board is full.
 * `blocked(x, y)` says whether a cell is taken (snake, walls, hazards, bosses, other fruit).
 * `minDistFrom` keeps fruit away from a point (bosses).
 */
export function randomFreeCell(
  rng: Rng,
  blocked: (x: number, y: number) => boolean,
  minDistFrom?: { cell: Cell; dist: number },
): Cell | null {
  const free: Cell[] = [];
  const fallback: Cell[] = [];
  for (let y = 0; y < BOARD_H; y++) {
    for (let x = 0; x < BOARD_W; x++) {
      if (blocked(x, y)) continue;
      const c = { x, y };
      if (minDistFrom && manhattan(c, minDistFrom.cell) < minDistFrom.dist) fallback.push(c);
      else free.push(c);
    }
  }
  if (free.length) return rng.pick(free);
  if (fallback.length) return rng.pick(fallback);
  return null;
}

/**
 * A cell is "safe to exit into" if the 3 cells ahead in every direction are free.
 * Used for portal twins and respawns so nothing ever kills you instantly.
 */
export function isSafeLanding(c: Cell, blocked: (x: number, y: number) => boolean, ahead = 3): boolean {
  for (const d of ['U', 'D', 'L', 'R'] as Dir[]) {
    const v = DIR_VEC[d];
    for (let i = 1; i <= ahead; i++) {
      const x = c.x + v.x * i;
      const y = c.y + v.y * i;
      if (blocked(x, y)) return false;
    }
  }
  return true;
}

/** Same as isSafeLanding but only checks the direction of travel. */
export function isSafeAhead(c: Cell, dir: Dir, blocked: (x: number, y: number) => boolean, ahead = 3): boolean {
  const v = DIR_VEC[dir];
  for (let i = 1; i <= ahead; i++) {
    if (blocked(c.x + v.x * i, c.y + v.y * i)) return false;
  }
  return true;
}

export const fruitAt = (fruits: Fruit[], x: number, y: number): number => fruits.findIndex((f) => f.x === x && f.y === y);

export const fruitKeySet = (fruits: Fruit[]): Set<number> => new Set(fruits.map((f) => cellKey(f.x, f.y)));
