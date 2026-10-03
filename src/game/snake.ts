import { add, Cell, Dir, OPPOSITE } from './board';

/**
 * The snake is an ordered list of cells, head first.
 * Plain data only, so it can be saved as JSON.
 */
export interface Snake {
  cells: Cell[];
  dir: Dir;
  /** Segments still to grow; each step with growth pending keeps the tail. */
  grow: number;
  /** Where the tail was before the last step (for smooth drawing). */
  prevTail: Cell;
  /** Queued turns, at most 2, so quick double-taps both register. */
  queue: Dir[];
}

export const MAX_QUEUED_TURNS = 2;
export const MIN_LENGTH = 3;

export function createSnake(head: Cell, dir: Dir, length: number): Snake {
  const back = OPPOSITE[dir];
  const cells: Cell[] = [];
  let c = { ...head };
  for (let i = 0; i < length; i++) {
    cells.push(c);
    c = add(c, back);
  }
  return { cells, dir, grow: 0, prevTail: { ...cells[cells.length - 1] }, queue: [] };
}

/**
 * Queue a turn. Turns that reverse into your own neck, or repeat the direction
 * you'd already be travelling, are ignored.
 */
export function queueTurn(snake: Snake, dir: Dir): boolean {
  if (snake.queue.length >= MAX_QUEUED_TURNS) return false;
  const effective = snake.queue.length ? snake.queue[snake.queue.length - 1] : snake.dir;
  if (dir === effective || dir === OPPOSITE[effective]) return false;
  snake.queue.push(dir);
  return true;
}

/** Take the next queued turn (if any) and return the cell the head is about to enter. */
export function nextHead(snake: Snake): Cell {
  if (snake.queue.length) snake.dir = snake.queue.shift()!;
  return add(snake.cells[0], snake.dir);
}

/** Move the head into `head`. The tail follows unless growth is pending. */
export function advance(snake: Snake, head: Cell): void {
  snake.cells.unshift(head);
  if (snake.grow > 0) {
    snake.grow--;
    snake.prevTail = { ...snake.cells[snake.cells.length - 1] };
  } else {
    snake.prevTail = snake.cells.pop()!;
  }
}

/** Remove segments from the tail (poison fruit, Viper hits). Never below MIN_LENGTH. */
export function shrink(snake: Snake, n: number): void {
  const target = Math.max(MIN_LENGTH, snake.cells.length - n);
  while (snake.cells.length > target) snake.cells.pop();
  snake.grow = 0;
  snake.prevTail = { ...snake.cells[snake.cells.length - 1] };
}

/** True if the snake occupies the cell. `ignoreTail` covers the tail cell that is about to move away. */
export function occupies(snake: Snake, c: Cell, ignoreTail = false): boolean {
  const n = ignoreTail && snake.grow === 0 ? snake.cells.length - 1 : snake.cells.length;
  for (let i = 0; i < n; i++) {
    const s = snake.cells[i];
    if (s.x === c.x && s.y === c.y) return true;
  }
  return false;
}
