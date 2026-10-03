import { describe, expect, it } from 'vitest';
import { parseBoard } from '../../src/game/board';
import { advance, createSnake, nextHead, queueTurn, shrink } from '../../src/game/snake';
import { classicStepMs, World } from '../../src/game/world';
import { checkCollision } from '../../src/game/collision';
import { Rng } from '../../src/engine/rng';

describe('snake movement', () => {
  it('moves one cell in its direction and the tail follows', () => {
    const s = createSnake({ x: 5, y: 5 }, 'R', 3);
    advance(s, nextHead(s));
    expect(s.cells).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(s.prevTail).toEqual({ x: 3, y: 5 });
  });

  it('grows by keeping the tail when growth is pending', () => {
    const s = createSnake({ x: 5, y: 5 }, 'R', 3);
    s.grow = 1;
    advance(s, nextHead(s));
    expect(s.cells).toHaveLength(4);
    advance(s, nextHead(s));
    expect(s.cells).toHaveLength(4);
  });

  it('ignores a turn straight back into the neck, and repeats of the current direction', () => {
    const s = createSnake({ x: 5, y: 5 }, 'R', 3);
    expect(queueTurn(s, 'L')).toBe(false);
    expect(queueTurn(s, 'R')).toBe(false);
    expect(s.queue).toEqual([]);
  });

  it('buffers two quick turns so both register in order', () => {
    const s = createSnake({ x: 5, y: 5 }, 'R', 3);
    expect(queueTurn(s, 'U')).toBe(true);
    expect(queueTurn(s, 'L')).toBe(true); // valid relative to the queued U
    expect(queueTurn(s, 'D')).toBe(false); // buffer is full
    advance(s, nextHead(s));
    expect(s.dir).toBe('U');
    advance(s, nextHead(s));
    expect(s.dir).toBe('L');
    expect(s.cells[0]).toEqual({ x: 4, y: 4 });
  });

  it('rejects a buffered turn that would reverse the previously queued turn', () => {
    const s = createSnake({ x: 5, y: 5 }, 'R', 3);
    queueTurn(s, 'U');
    expect(queueTurn(s, 'D')).toBe(false);
  });

  it('shrinks but never below 3', () => {
    const s = createSnake({ x: 10, y: 5 }, 'R', 6);
    shrink(s, 2);
    expect(s.cells).toHaveLength(4);
    shrink(s, 10);
    expect(s.cells).toHaveLength(3);
  });
});

describe('collisions', () => {
  const board = parseBoard();

  it('the board edge is a wall', () => {
    const s = createSnake({ x: 23, y: 0 }, 'R', 3);
    expect(checkCollision(board, s, { x: 24, y: 0 })).toBe('wall');
    expect(checkCollision(board, s, { x: 23, y: -1 })).toBe('wall');
  });

  it('inner walls from the level map block', () => {
    const b = parseBoard(['', '..#']);
    const s = createSnake({ x: 1, y: 1 }, 'R', 2);
    expect(checkCollision(b, s, { x: 2, y: 1 })).toBe('wall');
  });

  it('running into your own body is a crash', () => {
    const s = createSnake({ x: 5, y: 5 }, 'R', 5);
    // Coil the head around: U, L, D lands on the body.
    for (const d of ['U', 'L'] as const) {
      queueTurn(s, d);
      advance(s, nextHead(s));
    }
    queueTurn(s, 'D');
    const head = nextHead(s);
    expect(checkCollision(board, s, head)).toBe('self');
  });

  it('moving into the cell the tail is leaving is allowed', () => {
    const s = createSnake({ x: 5, y: 5 }, 'R', 4);
    // Square loop: head chases its own tail.
    for (const d of ['U', 'L'] as const) {
      queueTurn(s, d);
      advance(s, nextHead(s));
    }
    queueTurn(s, 'D');
    const head = nextHead(s);
    expect(head).toEqual(s.cells[s.cells.length - 1]);
    expect(checkCollision(board, s, head)).toBeNull();
  });
});

describe('classic world', () => {
  it('never spawns fruit on the snake', () => {
    for (let seed = 1; seed < 200; seed++) {
      const w = new World({ seed, startLength: 12, start: { x: 14, y: 9 } });
      for (const f of w.fruits) {
        expect(w.snake.cells.some((c) => c.x === f.x && c.y === f.y)).toBe(false);
      }
    }
  });

  it('eating fruit grows the snake, scores a point and respawns fruit', () => {
    const w = new World({ seed: 7 });
    const head = w.snake.cells[0];
    w.fruits = [{ kind: 'apple', x: head.x + 1, y: head.y, age: 0 }];
    const events = w.step();
    expect(events.some((e) => e.type === 'eat')).toBe(true);
    expect(w.points).toBe(1);
    expect(w.fruits).toHaveLength(1);
    w.step();
    expect(w.snake.cells).toHaveLength(5);
  });

  it('a crash leaves the snake in place', () => {
    const w = new World({ start: { x: 23, y: 5 }, startDir: 'R' });
    const before = JSON.stringify(w.snake.cells);
    const events = w.step();
    expect(events[0]).toMatchObject({ type: 'crash', cause: 'wall' });
    expect(JSON.stringify(w.snake.cells)).toBe(before);
  });

  it('speeds up every 5 fruit and caps', () => {
    expect(classicStepMs(0)).toBe(classicStepMs(4));
    expect(classicStepMs(5)).toBeLessThan(classicStepMs(4));
    expect(classicStepMs(1000)).toBe(68);
  });
});

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });
});
