import { Board, Cell, isWall } from './board';
import { occupies, Snake } from './snake';

export type CrashCause = 'wall' | 'self' | 'boss' | 'hazard' | 'rival';

/**
 * Something other than walls and the snake that the head can crash into:
 * boss bodies, Viper, temporary dirt mounds, crows, crumbled floor.
 */
export interface Blocker {
  cause: CrashCause;
  hits(c: Cell): boolean;
}

/** What would the head hit if it entered `head`? null means the move is safe. */
export function checkCollision(board: Board, snake: Snake, head: Cell, blockers: Blocker[] = []): CrashCause | null {
  if (isWall(board, head.x, head.y)) return 'wall';
  // The tail cell is about to move out of the way, so moving into it is fine.
  if (occupies(snake, head, true)) return 'self';
  for (const b of blockers) if (b.hits(head)) return b.cause;
  return null;
}
