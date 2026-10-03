/**
 * The playfield: a fixed 20×15 grid in every level, so levels play identically on every device.
 * (Started at 24×18; play-testing showed the cells were too small and coiling too hard.)
 */
export const BOARD_W = 20;
export const BOARD_H = 15;

export type Dir = 'U' | 'D' | 'L' | 'R';

export interface Cell {
  x: number;
  y: number;
}

export const DIR_VEC: Record<Dir, Cell> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };

export const cellKey = (x: number, y: number): number => y * BOARD_W + x;

export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

export const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < BOARD_W && y < BOARD_H;

export const manhattan = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const add = (c: Cell, d: Dir): Cell => ({ x: c.x + DIR_VEC[d].x, y: c.y + DIR_VEC[d].y });

/**
 * Static level geometry. Walls are cells you can't enter; the board edge is
 * always a wall too. Holes are where burrowing bosses can surface (passable).
 */
export interface Board {
  walls: Set<number>;
  holes: Cell[];
}

/**
 * Parse a level map. One string per row, BOARD_W characters each:
 *   `.` floor   `#` wall   `o` boss hole
 * Shorter maps are padded with floor; an empty map is an open arena.
 */
export function parseBoard(rows: readonly string[] = []): Board {
  const walls = new Set<number>();
  const holes: Cell[] = [];
  for (let y = 0; y < Math.min(rows.length, BOARD_H); y++) {
    const row = rows[y];
    for (let x = 0; x < Math.min(row.length, BOARD_W); x++) {
      const ch = row[x];
      if (ch === '#') walls.add(cellKey(x, y));
      else if (ch === 'o') holes.push({ x, y });
    }
  }
  return { walls, holes };
}

export const isWall = (board: Board, x: number, y: number): boolean =>
  !inBounds(x, y) || board.walls.has(cellKey(x, y));
