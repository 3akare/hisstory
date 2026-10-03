import { describe, expect, it } from 'vitest';
import { parseBoard } from '../../src/game/board';
import { Grub } from '../../src/game/bosses/grub';
import { GRUB } from '../../src/game/bosses/tuning';
import { restoreLevel, snapshotLevel } from '../../src/game/snapshot';
import { World } from '../../src/game/world';
import { queueTurn } from '../../src/game/snake';
import { validate } from '../../src/save/save';

function grubLevel(seed: number) {
  const world = new World({ board: parseBoard(GRUB.map), start: GRUB.start, startLength: GRUB.startLength, fruitCount: 2, seed });
  const boss = new Grub(world.board);
  world.reserved = (x, y) => boss.reserved(x, y);
  return { world, boss };
}

const bw = (w: World) => ({ board: w.board, snake: w.snake.cells, head: w.snake.cells[0], rng: w.rng, mercy: 0 });

describe('mid-level snapshots', () => {
  it('a mid-Grub-fight snapshot survives JSON and plays on identically', () => {
    const a = grubLevel(9);
    // Play a bit: steer around and let Grub surface.
    for (let i = 0; i < 300; i++) {
      a.boss.update(1 / 120, bw(a.world));
      if (i % 15 === 0) {
        queueTurn(a.world.snake, i % 60 < 30 ? 'D' : 'R');
        const ev = a.world.step();
        if (ev.some((e) => e.type === 'crash')) break;
      }
    }
    const saved = JSON.parse(JSON.stringify(snapshotLevel(a.world, a.boss, 1, 2)));
    const b = grubLevel(1234); // different seed: everything must come from the snapshot
    const extra = restoreLevel(b.world, b.boss, saved);
    expect(extra).toEqual({ livesLost: 1, hint: 2 });
    expect(b.world.snake.cells).toEqual(a.world.snake.cells);
    expect(b.world.fruits).toEqual(a.world.fruits);
    expect(b.boss.s).toEqual(a.boss.s);
    // Same future: step both the same way.
    for (let i = 0; i < 5; i++) {
      a.world.step();
      b.world.step();
      a.boss.update(0.5, bw(a.world));
      b.boss.update(0.5, bw(b.world));
    }
    expect(b.world.snake.cells).toEqual(a.world.snake.cells);
    expect(b.world.fruits).toEqual(a.world.fruits);
    expect(b.boss.s).toEqual(a.boss.s);
  });

  it('rejects junk and leaves the level untouched', () => {
    const a = grubLevel(1);
    const before = JSON.stringify(a.world.snake);
    for (const junk of [null, 42, {}, { v: 2 }, { v: 1, snake: { cells: [] }, fruits: [] }, { v: 1, snake: { cells: [{ x: 'a' }, {}] }, fruits: [] }]) {
      expect(restoreLevel(a.world, a.boss, junk)).toBeNull();
    }
    expect(JSON.stringify(a.world.snake)).toBe(before);
  });

  it('the save keeps a resume entry and drops a broken one', () => {
    expect(validate({ story: { resume: { chapter: 3, data: { v: 1 } } } }).story.resume).toEqual({ chapter: 3, data: { v: 1 } });
    expect(validate({ story: { resume: { chapter: 99, data: {} } } }).story.resume).toBeNull();
    expect(validate({ story: { resume: 'nope' } }).story.resume).toBeNull();
  });
});
