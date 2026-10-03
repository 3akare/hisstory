import { Rng } from '../engine/rng';
import { BOARD_H, BOARD_W, Board, Cell, Dir, isWall, parseBoard } from './board';
import { Blocker, checkCollision, CrashCause } from './collision';
import { Fruit, fruitAt, randomFreeCell } from './fruit';
import { advance, createSnake, nextHead, occupies, Snake } from './snake';

/**
 * Everything that happens in one snake step, so scenes can play the matching
 * sound, particles and shake without the rules knowing about any of that.
 */
export type WorldEvent =
  | { type: 'eat'; fruit: Fruit }
  | { type: 'crash'; cause: CrashCause; at: Cell }
  | { type: 'step' };

export interface WorldOptions {
  board?: Board;
  start?: Cell;
  startDir?: Dir;
  startLength?: number;
  /** How many fruit are on the board at once. */
  fruitCount?: number;
  seed?: number;
}

export const CLASSIC_START: Cell = { x: 8, y: 9 };

/**
 * The game state for one level: board, snake, fruit, score.
 * Pure rules: no drawing, no audio, no DOM. Unit-tested.
 */
export class World {
  board: Board;
  snake: Snake;
  fruits: Fruit[] = [];
  rng: Rng;
  /** Fruit eaten in this level. */
  eaten = 0;
  /** Points earned in this level. */
  points = 0;
  /** Extra things the head can crash into (bosses, hazards). Rebuilt by the owner each step. */
  blockers: Blocker[] = [];
  /** Extra cells fruit may not spawn on (boss bodies, hazards). */
  reserved: (x: number, y: number) => boolean = () => false;
  /** Keep fruit at least this far from this cell (bosses). */
  avoid: { cell: Cell; dist: number } | undefined;
  fruitCount: number;
  readonly startHead: Cell;
  readonly startDir: Dir;

  constructor(opts: WorldOptions = {}) {
    this.board = opts.board ?? parseBoard();
    this.rng = new Rng(opts.seed);
    this.startHead = opts.start ?? CLASSIC_START;
    this.startDir = opts.startDir ?? 'R';
    this.snake = createSnake(this.startHead, this.startDir, opts.startLength ?? 4);
    this.fruitCount = opts.fruitCount ?? 1;
    this.fillFruit();
  }

  /** Is the cell taken by anything a new fruit shouldn't spawn on? */
  blocked = (x: number, y: number): boolean =>
    isWall(this.board, x, y) ||
    occupies(this.snake, { x, y }) ||
    fruitAt(this.fruits, x, y) >= 0 ||
    this.reserved(x, y);

  fillFruit(): void {
    while (this.fruits.length < this.fruitCount) {
      const c = randomFreeCell(this.rng, this.blocked, this.avoid);
      if (!c) return; // board is full
      this.fruits.push({ kind: 'apple', x: c.x, y: c.y, age: 0 });
    }
  }

  /** Advance the snake one cell. Returns what happened. A crash leaves the snake where it was. */
  step(): WorldEvent[] {
    const head = nextHead(this.snake);
    const crash = checkCollision(this.board, this.snake, head, this.blockers);
    if (crash) return [{ type: 'crash', cause: crash, at: head }];

    advance(this.snake, head);
    const events: WorldEvent[] = [{ type: 'step' }];
    const i = fruitAt(this.fruits, head.x, head.y);
    if (i >= 0) {
      const fruit = this.fruits.splice(i, 1)[0];
      this.snake.grow += 1;
      this.eaten += 1;
      this.points += 1;
      events.push({ type: 'eat', fruit });
      this.fillFruit();
    }
    return events;
  }

  /** True when the snake fills every free cell (Classic "Perfect!"). */
  isBoardFull(): boolean {
    let free = 0;
    for (let y = 0; y < BOARD_H; y++)
      for (let x = 0; x < BOARD_W; x++) if (!isWall(this.board, x, y)) free++;
    return this.snake.cells.length >= free;
  }

  tick(dt: number): void {
    for (const f of this.fruits) f.age += dt;
  }
}

/** Classic speed: a little faster every 5 fruit, capped. Milliseconds per step. */
export function classicStepMs(eaten: number): number {
  return Math.max(68, 135 - Math.floor(eaten / 5) * 7);
}
