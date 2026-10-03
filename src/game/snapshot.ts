import type { BossController } from './bosses/bossKit';
import type { Cell } from './board';
import type { World } from './world';
import type { Twist } from './twists';

/**
 * Mid-level save: everything needed to put a level back exactly as it was.
 * Plain JSON, so it lives in the save file. (prd.md > Story: Chapter Map and Progress:
 * "leaving mid-level and coming back resumes that level paused, exactly where it was".)
 */
export interface LevelSnapshot {
  v: 1;
  snake: World['snake'];
  fruits: World['fruits'];
  rng: number;
  eaten: number;
  points: number;
  boss: unknown;
  livesLost: number;
  hint: number;
  /** Per-twist state (moving walls, ice, ...), in twist order. */
  twists?: unknown[];
}

export function snapshotLevel(world: World, boss: BossController | null, livesLost: number, hint: number, twists: Twist[] = []): LevelSnapshot {
  return JSON.parse(
    JSON.stringify({
      v: 1,
      snake: world.snake,
      fruits: world.fruits,
      rng: world.rng.state,
      eaten: world.eaten,
      points: world.points,
      boss: boss ? boss.snapshot() : null,
      livesLost,
      hint,
      twists: twists.map((t) => (t.snapshot ? t.snapshot() : null)),
    }),
  );
}

const okCell = (c: unknown): c is Cell => !!c && typeof (c as Cell).x === 'number' && typeof (c as Cell).y === 'number';

/**
 * Put a snapshot back into a freshly built level. Returns the restored extras,
 * or null (leaving the level untouched) if the data doesn't look right.
 */
export function restoreLevel(world: World, boss: BossController | null, data: unknown, twists: Twist[] = []): { livesLost: number; hint: number } | null {
  const d = data as Partial<LevelSnapshot> | null;
  if (!d || d.v !== 1 || !d.snake || !Array.isArray(d.snake.cells) || d.snake.cells.length < 2 || !d.snake.cells.every(okCell) || !Array.isArray(d.fruits)) {
    return null;
  }
  world.snake = {
    cells: d.snake.cells.map((c) => ({ x: c.x, y: c.y })),
    dir: d.snake.dir ?? 'R',
    grow: d.snake.grow ?? 0,
    prevTail: okCell(d.snake.prevTail) ? d.snake.prevTail : d.snake.cells[d.snake.cells.length - 1],
    queue: [],
  };
  world.fruits = d.fruits.filter(okCell);
  if (typeof d.rng === 'number') world.rng.state = d.rng;
  world.eaten = d.eaten ?? 0;
  world.points = d.points ?? 0;
  if (boss && d.boss) boss.restore(d.boss);
  if (Array.isArray(d.twists)) twists.forEach((t, i) => d.twists![i] != null && t.restore?.(d.twists![i]));
  world.fillFruit();
  return { livesLost: d.livesLost ?? 0, hint: d.hint ?? 0 };
}
