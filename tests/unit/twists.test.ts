import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../../src/game/chapters';
import { completeChapter, isUnlocked, nextChapter } from '../../src/game/progress';
import { createTwists, PoisonTwist } from '../../src/game/twists';
import { World } from '../../src/game/world';
import { defaultSave, validate } from '../../src/save/save';

describe('poison fruit (Ch2)', () => {
  it('shrinks Pip by 2 (never below 3) and drains the meter by 1, with no points', () => {
    const w = new World({ seed: 1, startLength: 7, start: { x: 10, y: 7 } });
    w.eaten = 4;
    w.points = 4;
    const h = w.snake.cells[0];
    w.fruits = [{ kind: 'poison', x: h.x + 1, y: h.y, age: 0 }];
    const ev = w.step();
    expect(ev.find((e) => e.type === 'eat')).toMatchObject({ fruit: { kind: 'poison' } });
    expect(w.snake.cells).toHaveLength(5);
    expect(w.eaten).toBe(3);
    expect(w.points).toBe(4);

    const small = new World({ seed: 1, startLength: 4, start: { x: 10, y: 7 } });
    const h2 = small.snake.cells[0];
    small.fruits = [{ kind: 'poison', x: h2.x + 1, y: h2.y, age: 0 }];
    small.step();
    expect(small.snake.cells).toHaveLength(3);
    expect(small.eaten).toBe(0);
  });

  it('always keeps a good apple on the board and never more than one poison', () => {
    for (let seed = 1; seed < 60; seed++) {
      const w = new World({ seed, fruitCount: 0 });
      const t = new PoisonTwist();
      w.kindFor = (x) => t.fruitKind(x);
      w.fruitCount = 2;
      for (let round = 0; round < 20; round++) {
        w.fruits = w.fruits.slice(1); // "eat" one
        w.fillFruit();
        expect(w.fruits.filter((f) => f.kind === 'apple').length).toBeGreaterThanOrEqual(1);
        expect(w.fruits.filter((f) => f.kind === 'poison').length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('builds twists by id', () => {
    expect(createTwists(['poison']).map((t) => t.id)).toEqual(['poison']);
    expect(createTwists()).toEqual([]);
  });
});

describe('Act I unlock order', () => {
  it('goes 1 → 2 → 3', () => {
    expect(nextChapter(1)).toBe(2);
    expect(nextChapter(2)).toBe(3);
    const s = defaultSave().story;
    completeChapter(s, 1);
    expect(isUnlocked(s, 2)).toBe(true);
    expect(isUnlocked(s, 3)).toBe(false);
    completeChapter(s, 2);
    expect(isUnlocked(s, 3)).toBe(true);
  });

  it('a Milestone 1 save (Ch1 → Grub, no Ch2 yet) keeps its progress', () => {
    // Saved when Grub followed Ch1 directly: Ch1 and Ch3 cleared, checkpoint on Grub.
    const old = validate({ story: { completed: [true, false, true], checkpoint: 3, highestUnlocked: 3, started: true } }).story;
    expect(isUnlocked(old, 1)).toBe(true);
    expect(isUnlocked(old, 2)).toBe(true); // newly slotted in, playable
    expect(isUnlocked(old, 3)).toBe(true); // Grub stays replayable
    expect(old.completed[2]).toBe(true);
  });

  it('every built chapter uses a known song', async () => {
    const { TRACKS } = await import('../../src/audio/tracks');
    for (const c of CHAPTERS.filter((c) => c.available)) expect(TRACKS[c.level().music], `ch${c.id}`).toBeDefined();
  });
});
