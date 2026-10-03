import { describe, expect, it } from 'vitest';
import { parseBar, Song, stepsDue, STEPS_PER_BAR } from '../../src/audio/sequencer';
import { noteFreq } from '../../src/audio/synth';
import { TRACKS } from '../../src/audio/tracks';
import { CORRUPT_KEY, defaultSave, KeyValueStore, SAVE_KEY, SaveStore, validate } from '../../src/save/save';
import { chooseDir } from '../../src/game/attractAI';
import { World } from '../../src/game/world';

describe('songs', () => {
  const channels = ['lead', 'harmony', 'bass', 'drums'] as const;
  for (const [name, song] of Object.entries(TRACKS)) {
    it(`${name}: every bar has 16 steps and every note is real`, () => {
      for (const ch of channels) {
        for (const bar of (song as Song)[ch] ?? []) {
          const events = parseBar(bar);
          for (const e of events) {
            expect(e.step + e.len).toBeLessThanOrEqual(STEPS_PER_BAR);
            if (ch === 'drums') expect(e.value).toMatch(/^[ksohct](\+[ksohct])*$/);
            else expect(noteFreq(e.value), `${name}/${ch}: ${e.value}`).toBeGreaterThan(20);
          }
        }
      }
    });
  }

  it('has a theme, the orchard, Grub’s boss song and the jingles', () => {
    for (const n of ['theme', 'orchard', 'boss-grub', 'jingle-clear', 'jingle-coil', 'jingle-life-lost', 'jingle-game-over', 'jingle-new-best', 'jingle-victory']) {
      expect(TRACKS[n], n).toBeDefined();
    }
  });

  it('parses holds and rests', () => {
    expect(parseBar('C5 - - . E5 . . . . . . . . . G5 -')).toEqual([
      { step: 0, len: 3, value: 'C5' },
      { step: 4, len: 1, value: 'E5' },
      { step: 14, len: 2, value: 'G5' },
    ]);
    expect(() => parseBar('C5 D5')).toThrow();
  });

  it('turns note names into frequencies', () => {
    expect(noteFreq('A4')).toBeCloseTo(440);
    expect(noteFreq('A5')).toBeCloseTo(880);
    expect(noteFreq('C#5')).toBeCloseTo(554.37, 1);
    expect(noteFreq('Eb5')).toBeCloseTo(noteFreq('D#5'));
  });
});

describe('lookahead scheduler', () => {
  const step = 0.1;
  it('schedules nothing when the next step is beyond the lookahead window', () => {
    expect(stepsDue(1.2, 1.0, 0.12, step)).toBe(0);
  });
  it('schedules every step that starts inside the window', () => {
    // window is [now, now + 0.12) = up to 1.12; steps at 1.0 and 1.1 are due.
    expect(stepsDue(1.0, 1.0, 0.12, step)).toBe(2);
  });
  it('catches up after a stall instead of drifting', () => {
    expect(stepsDue(1.0, 1.5, 0.12, step)).toBe(7);
  });
});

class FakeStorage implements KeyValueStore {
  map = new Map<string, string>();
  fail = false;
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.fail) throw new Error('blocked');
    this.map.set(k, v);
  }
}

describe('save', () => {
  it('round-trips settings and best score', () => {
    const fs = new FakeStorage();
    const a = new SaveStore(fs);
    a.data.settings.music = false;
    a.data.classic.best = 42;
    a.save();
    const b = new SaveStore(fs);
    expect(b.data.settings.music).toBe(false);
    expect(b.data.classic.best).toBe(42);
  });

  it('fills missing fields from defaults (old or partial saves)', () => {
    const d = validate({ classic: { best: 7 } });
    expect(d.classic.best).toBe(7);
    expect(d.settings.music).toBe(true);
    expect(d.story.lives).toBe(3);
    expect(d.story.completed).toHaveLength(10);
  });

  it('clamps nonsense values', () => {
    const d = validate({ story: { lives: 999, highestUnlocked: -3, checkpoint: 'x' } });
    expect(d.story.lives).toBe(9);
    expect(d.story.highestUnlocked).toBe(1);
    expect(d.story.checkpoint).toBe(1);
  });

  it('sets a corrupt save aside and starts fresh instead of crashing', () => {
    const fs = new FakeStorage();
    fs.map.set(SAVE_KEY, '{not json');
    const s = new SaveStore(fs);
    expect(s.recovered).toBe(true);
    expect(s.data).toEqual(defaultSave());
    expect(fs.map.get(CORRUPT_KEY)).toBe('{not json');
  });

  it('runs in memory when storage is blocked', () => {
    const fs = new FakeStorage();
    fs.fail = true;
    const s = new SaveStore(fs);
    expect(s.available).toBe(false);
    s.data.classic.best = 5;
    expect(() => s.save()).not.toThrow();
  });

  it('runs in memory when there is no storage at all', () => {
    const s = new SaveStore(null);
    expect(s.available).toBe(false);
    expect(s.data.classic.best).toBe(0);
  });
});

describe('attract-mode AI', () => {
  it('survives 2,000 steps (resetting when it gets long, like the home screen)', () => {
    for (const seed of [1, 2, 3]) {
      let world = new World({ seed, startLength: 5, fruitCount: 2, start: { x: 4, y: 3 }, startDir: 'R' });
      let deaths = 0;
      for (let i = 0; i < 2000; i++) {
        const s = world.snake;
        s.queue = [];
        const d = chooseDir(world);
        if (d !== s.dir) s.queue.push(d);
        const ev = world.step();
        if (ev.some((e) => e.type === 'crash')) deaths++;
        if (ev.some((e) => e.type === 'crash') || s.cells.length > 25) {
          world = new World({ seed: seed + i, startLength: 5, fruitCount: 2, start: { x: 4, y: 3 }, startDir: 'R' });
        }
      }
      expect(deaths, `seed ${seed}`).toBe(0);
    }
  });
});
