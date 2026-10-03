import { describe, expect, it } from 'vitest';
import { CHAPTERS, ChapterDef } from '../../src/game/chapters';
import { completeChapter, isUnlocked, nextChapter, normalizeCheckpoint, outOfLives, suggestedChapter } from '../../src/game/progress';
import { addPoints, loseLife } from '../../src/game/lives';
import { defaultSave } from '../../src/save/save';
import { SPRITES } from '../../src/art/sprites';
import { PORTRAITS } from '../../src/art/portraits';
import { SCRIPT } from '../../src/story/script';

/** A copy of the chapter list with everything built (the finished game). */
const ALL: ChapterDef[] = CHAPTERS.map((c) => ({ ...c, available: true }));

describe('story progress', () => {
  it('starts with only Chapter 1 open', () => {
    const s = defaultSave().story;
    expect(isUnlocked(s, 1)).toBe(true);
    for (let id = 2; id <= 10; id++) expect(isUnlocked(s, id), `ch${id}`).toBe(false);
  });

  it('clearing a chapter unlocks the next one and ticks it', () => {
    const s = defaultSave().story;
    expect(completeChapter(s, 1, ALL)).toBe(2);
    expect(s.completed[0]).toBe(true);
    expect(isUnlocked(s, 2, ALL)).toBe(true);
    expect(isUnlocked(s, 3, ALL)).toBe(false);
  });

  it('skips chapters that are not built yet (Milestone 1: Ch1 → Grub)', () => {
    const s = defaultSave().story;
    const next = completeChapter(s, 1);
    const built = CHAPTERS.filter((c) => c.available).map((c) => c.id);
    expect(next).toBe(built[1]);
    expect(isUnlocked(s, built[1])).toBe(true);
  });

  it('beating a boss sets the checkpoint to the chapter after it', () => {
    const s = defaultSave().story;
    completeChapter(s, 1, ALL);
    completeChapter(s, 2, ALL);
    expect(s.checkpoint).toBe(1);
    completeChapter(s, 3, ALL); // Grub
    expect(s.checkpoint).toBe(4);
  });

  it('replaying an early boss never moves the checkpoint backwards', () => {
    const s = defaultSave().story;
    for (let id = 1; id <= 6; id++) completeChapter(s, id, ALL);
    expect(s.checkpoint).toBe(7);
    completeChapter(s, 3, ALL);
    expect(s.checkpoint).toBe(7);
  });

  it('out of lives: back to the checkpoint with 3 lives, unlocks kept', () => {
    const s = defaultSave().story;
    for (let id = 1; id <= 4; id++) completeChapter(s, id, ALL);
    s.lives = 1;
    loseLife(s);
    expect(s.lives).toBe(0);
    expect(outOfLives(s)).toBe(4);
    expect(s.lives).toBe(3);
    expect(isUnlocked(s, 5, ALL)).toBe(true);
  });

  it('replays share lives and score with the save (learner rule)', () => {
    const s = defaultSave().story;
    completeChapter(s, 1, ALL);
    // Replay chapter 1: points still count toward extra lives, deaths still cost real lives.
    addPoints(s, 50);
    expect(s.lives).toBe(4);
    loseLife(s);
    expect(s.lives).toBe(3);
    expect(s.score).toBe(50);
  });

  it('suggests the first open chapter you have not cleared', () => {
    const s = defaultSave().story;
    expect(suggestedChapter(s, ALL)).toBe(1);
    completeChapter(s, 1, ALL);
    expect(suggestedChapter(s, ALL)).toBe(2);
    expect(nextChapter(10, ALL)).toBeNull();
  });

  it('a checkpoint on a beaten boss moves forward once the next chapter is built', () => {
    const s = defaultSave().story;
    const m1 = CHAPTERS.map((c) => ({ ...c, available: c.id === 1 || c.id === 3 }));
    completeChapter(s, 1, m1);
    completeChapter(s, 3, m1);
    expect(s.checkpoint).toBe(3); // nothing after Grub yet
    normalizeCheckpoint(s, ALL);
    expect(s.checkpoint).toBe(4);
  });

  it('clearing the final chapter marks the story finished', () => {
    const s = defaultSave().story;
    for (let id = 1; id <= 10; id++) completeChapter(s, id, ALL);
    expect(s.finished).toBe(true);
  });
});

describe('art and script data', () => {
  it('every sprite row in a sprite has the same width', () => {
    for (const [name, def] of Object.entries(SPRITES)) {
      const w = def.rows[0].length;
      for (const row of def.rows) expect(row.length, name).toBe(w);
    }
  });

  it('portraits are 16×16 in both moods', () => {
    for (const [name, p] of Object.entries(PORTRAITS)) {
      for (const def of [p.neutral, p.angry]) {
        expect(def.rows, name).toHaveLength(16);
        for (const row of def.rows) expect(row.length, name).toBe(16);
      }
    }
  });

  it('every built chapter has an intro and an outro', () => {
    for (const c of CHAPTERS.filter((c) => c.available)) {
      expect(SCRIPT[c.id]?.intro.length, `ch${c.id} intro`).toBeGreaterThan(0);
      expect(SCRIPT[c.id]?.outro.length, `ch${c.id} outro`).toBeGreaterThan(0);
    }
  });

  it('every built chapter level is valid (map size, meter or boss)', () => {
    for (const c of CHAPTERS.filter((c) => c.available)) {
      const lvl = c.level();
      if (lvl.map) {
        expect(lvl.map).toHaveLength(15);
        for (const row of lvl.map) expect(row).toHaveLength(20);
      }
      expect(lvl.kind === 'boss' ? !!lvl.boss : !!lvl.meterTarget, `ch${c.id}`).toBe(true);
    }
  });
});
