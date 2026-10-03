import { add, BOARD_H, BOARD_W, Cell, cellKey, Dir, isWall, OPPOSITE } from './board';
import { occupies } from './snake';
import type { World } from './world';

/**
 * The self-playing snake behind the home screen. Not a genius, just safe:
 * for each move that doesn't crash, check there's enough open space left to
 * fit the body (so it doesn't trap itself), then head for the nearest fruit.
 */
const DIRS: Dir[] = ['U', 'R', 'D', 'L'];

/** How many cells can be reached from `start` without crossing the snake (after it moves). */
function openSpace(world: World, start: Cell, limit: number): number {
  const body = new Set(world.snake.cells.slice(0, -1).map((c) => cellKey(c.x, c.y)));
  const seen = new Set<number>([cellKey(start.x, start.y)]);
  const q: Cell[] = [start];
  for (let i = 0; i < q.length && seen.size < limit; i++) {
    for (const d of DIRS) {
      const n = add(q[i], d);
      const k = cellKey(n.x, n.y);
      if (seen.has(k) || isWall(world.board, n.x, n.y) || body.has(k)) continue;
      seen.add(k);
      q.push(n);
    }
  }
  return seen.size;
}

/** Shortest-path distance to the nearest fruit avoiding the body (BFS), or Infinity. */
function fruitDistance(world: World, start: Cell): number {
  const targets = new Set(world.fruits.map((f) => cellKey(f.x, f.y)));
  if (!targets.size) return Infinity;
  const body = new Set(world.snake.cells.map((c) => cellKey(c.x, c.y)));
  const dist = new Map<number, number>([[cellKey(start.x, start.y), 0]]);
  const q: Cell[] = [start];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    const d = dist.get(cellKey(c.x, c.y))!;
    if (targets.has(cellKey(c.x, c.y))) return d;
    for (const dir of DIRS) {
      const n = add(c, dir);
      const k = cellKey(n.x, n.y);
      if (dist.has(k) || isWall(world.board, n.x, n.y) || body.has(k)) continue;
      dist.set(k, d + 1);
      q.push(n);
    }
  }
  return Infinity;
}

export function chooseDir(world: World): Dir {
  const snake = world.snake;
  const head = snake.cells[0];
  const need = snake.cells.length + 2;
  let best: { dir: Dir; score: number } | null = null;
  for (const d of DIRS) {
    if (d === OPPOSITE[snake.dir]) continue;
    const n = add(head, d);
    if (isWall(world.board, n.x, n.y) || occupies(snake, n, true)) continue;
    const space = openSpace(world, n, need + 1);
    const safe = space >= need;
    const fd = fruitDistance(world, n);
    // Safety first, then the fruit, then a mild preference for going straight (looks natural).
    const score = (safe ? 0 : 10000) + (fd === Infinity ? 500 : fd) + (d === snake.dir ? -0.5 : 0) - space * 0.001;
    if (!best || score < best.score) best = { dir: d, score };
  }
  return best?.dir ?? snake.dir;
}

export const ATTRACT_MAX_LENGTH = Math.floor((BOARD_W * BOARD_H) / 12);
