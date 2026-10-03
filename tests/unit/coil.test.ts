import { describe, expect, it } from 'vitest';
import { BOARD_H, BOARD_W, Cell, parseBoard } from '../../src/game/board';
import { checkCoil, COIL_DEGREES, ringAround, sealedIn, windingDegrees } from '../../src/game/coil';
import { TRAPPED_BONUS_MAX } from '../../src/game/bosses/tuning';
import { Grub } from '../../src/game/bosses/grub';
import { BossWorld } from '../../src/game/bosses/bossKit';
import { GRUB } from '../../src/game/bosses/tuning';
import { Rng } from '../../src/engine/rng';
import { addPoints, freshLives, loseLife, MAX_LIVES, mercyLevel, refillLives } from '../../src/game/lives';
import { placeSnake } from '../../src/game/snake';

const open = parseBoard();

describe('coil detection', () => {
  it('a full ring around the boss is a coil', () => {
    const res = checkCoil(open, ringAround(10, 8), [{ x: 10, y: 8 }], 16);
    expect(res.coiled).toBe(true);
    expect(res.pocket).toEqual([{ x: 10, y: 8 }]);
  });

  it('a minimal 7-cell loop (corners optional on one side) still seals', () => {
    // N, NE, E, SE, S, SW, W: the NW corner is a diagonal gap, which a 4-way fill can't pass.
    const loop: Cell[] = [
      { x: 9, y: 8 },
      { x: 9, y: 9 },
      { x: 10, y: 9 },
      { x: 11, y: 9 },
      { x: 11, y: 8 },
      { x: 11, y: 7 },
      { x: 10, y: 7 },
    ];
    expect(checkCoil(open, loop, [{ x: 10, y: 8 }], 16).coiled).toBe(true);
  });

  it('circling most of the way round counts, even with a gap (no precision needed)', () => {
    const ring = ringAround(10, 8);
    ring.splice(1, 1); // a gap right above the boss
    expect(checkCoil(open, ring, [{ x: 10, y: 8 }], 16).coiled).toBe(true);
  });

  it('a big loose circle far from the boss counts too', () => {
    const big = ringAround(7, 4, 6, 6); // 8×8 loop with the boss in the middle
    expect(windingDegrees(big, { x: 10, y: 7 })).toBeGreaterThan(COIL_DEGREES);
    expect(checkCoil(open, big, [{ x: 10, y: 7 }], 16).coiled).toBe(true);
  });

  it('three-quarters of a lap is not yet a coil', () => {
    // Around (10,8): from the left side, over the top, down the right, along the bottom to the middle.
    const arc: Cell[] = [
      { x: 10, y: 9 },
      { x: 11, y: 9 },
      { x: 11, y: 8 },
      { x: 11, y: 7 },
      { x: 10, y: 7 },
      { x: 9, y: 7 },
      { x: 9, y: 8 },
    ];
    const deg = windingDegrees(arc, { x: 10, y: 8 });
    expect(deg).toBeLessThan(COIL_DEGREES);
    expect(deg).toBeGreaterThan(200);
    expect(checkCoil(open, arc, [{ x: 10, y: 8 }], 0).coiled).toBe(false);
  });

  it('going out and back the same way cancels out', () => {
    const zig: Cell[] = [
      { x: 9, y: 7 },
      { x: 10, y: 7 },
      { x: 11, y: 7 },
      { x: 12, y: 7 },
    ];
    expect(windingDegrees([...zig, ...[...zig].reverse()], { x: 10, y: 8 })).toBeLessThan(1);
  });

  it('pinning the boss against the arena wall counts', () => {
    // Boss on the top edge at (10,0); body wraps the three open sides.
    const body: Cell[] = [
      { x: 9, y: 0 },
      { x: 9, y: 1 },
      { x: 10, y: 1 },
      { x: 11, y: 1 },
      { x: 11, y: 0 },
    ];
    expect(checkCoil(open, body, [{ x: 10, y: 0 }], 16).coiled).toBe(true);
  });

  it('cutting the board in half is not a coil (pocket too big)', () => {
    const wall: Cell[] = [];
    for (let y = 0; y < 15; y++) wall.push({ x: 12, y });
    expect(checkCoil(open, wall, [{ x: 5, y: 5 }], 16).coiled).toBe(false);
  });

  it('sealed-in pockets respect maxPocket', () => {
    const ring = ringAround(10, 8, 3, 3); // 3×3 pocket = 9 cells
    expect(sealedIn(open, ring, [{ x: 11, y: 9 }], 16).coiled).toBe(true);
    expect(sealedIn(open, ring, [{ x: 11, y: 9 }], 8).coiled).toBe(false);
  });

  it('walls alone never count without Pip in the seal', () => {
    const b = parseBoard(['', '.###', '.#.#', '.###']);
    expect(checkCoil(b, [{ x: 20, y: 15 }], [{ x: 2, y: 2 }], 16).coiled).toBe(false);
  });
});

function bossWorld(snake: Cell[], rng = new Rng(1), mercy = 0): BossWorld {
  return { board: parseBoard(GRUB.map), snake, head: snake[0], rng, mercy };
}

/** Run the boss forward until `pred` holds (or give up). */
function runUntil(g: Grub, w: BossWorld, pred: () => boolean, maxSeconds = 20): number {
  let t = 0;
  while (!pred() && t < maxSeconds) {
    g.update(1 / 120, w);
    t += 1 / 120;
  }
  return t;
}

describe('Grub', () => {
  const farSnake: Cell[] = [
    { x: 22, y: 0 },
    { x: 21, y: 0 },
    { x: 20, y: 0 },
  ];

  it('telegraphs for at least 0.8 s before surfacing', () => {
    const g = new Grub(parseBoard(GRUB.map));
    const w = bossWorld(farSnake);
    runUntil(g, w, () => g.s.mode === 'telegraph');
    const warn = runUntil(g, w, () => g.s.mode === 'up');
    expect(warn).toBeGreaterThanOrEqual(0.8);
  });

  it('stays up 7 s, then 6 s and 5 s as he takes hits', () => {
    const board = parseBoard(GRUB.map);
    const g = new Grub(board);
    const w = bossWorld(farSnake);
    const upTimes: number[] = [];
    for (let hit = 0; hit < 3; hit++) {
      runUntil(g, w, () => g.s.mode === 'up');
      upTimes.push(g.s.timer);
      const h = g.holeCell!;
      // Coil him.
      const ev = g.afterStep({ ...w, snake: ringAround(h.x, h.y), head: ringAround(h.x, h.y)[0] });
      expect(ev[0]).toMatchObject({ type: 'coiled' });
    }
    expect(upTimes.map((t) => Math.round(t * 10) / 10)).toEqual([7, 6, 5]);
    expect(g.defeated()).toBe(true);
  });

  it('cannot be coiled while hidden or telegraphing', () => {
    const g = new Grub(parseBoard(GRUB.map));
    const w = bossWorld(farSnake);
    runUntil(g, w, () => g.s.mode === 'telegraph');
    const h = g.holeCell!;
    expect(g.afterStep({ ...w, snake: ringAround(h.x, h.y) })).toEqual([]);
  });

  it('never surfaces right next to Pip’s head', () => {
    const board = parseBoard(GRUB.map);
    for (let seed = 1; seed < 40; seed++) {
      const hole = board.holes[0];
      const snake = [{ x: hole.x + 1, y: hole.y }, { x: hole.x + 2, y: hole.y }];
      const g = new Grub(board);
      const w = bossWorld(snake, new Rng(seed));
      runUntil(g, w, () => g.s.mode === 'telegraph');
      expect(g.holeCell).not.toEqual(hole);
    }
  });

  it('leaves a temporary dirt mound when he burrows after his first hit', () => {
    const g = new Grub(parseBoard(GRUB.map));
    const w = bossWorld(farSnake);
    runUntil(g, w, () => g.s.mode === 'up');
    expect(g.s.mounds).toHaveLength(0);
    let h = g.holeCell!;
    g.afterStep({ ...w, snake: ringAround(h.x, h.y) });
    runUntil(g, w, () => g.s.mode === 'hidden');
    expect(g.s.mounds).toHaveLength(0); // no mound when diving after a hit
    runUntil(g, w, () => g.s.mode === 'up');
    h = g.holeCell!;
    runUntil(g, w, () => g.s.mode === 'hidden'); // let him burrow normally
    expect(g.s.mounds).toEqual([expect.objectContaining({ x: h.x, y: h.y })]);
    expect(g.blockers().some((b) => b.cause === 'hazard' && b.hits(h))).toBe(true);
    runUntil(g, w, () => g.s.mounds.length === 0, 6);
    expect(g.s.mounds).toHaveLength(0);
  });

  it('panics instead of diving while Pip is partway round him, but only for a while', () => {
    const g = new Grub(parseBoard(GRUB.map));
    const w = bossWorld(farSnake);
    runUntil(g, w, () => g.s.mode === 'up');
    const h = g.holeCell!;
    // Half a lap around him.
    const half: Cell[] = [
      { x: h.x - 1, y: h.y + 1 },
      { x: h.x - 1, y: h.y },
      { x: h.x - 1, y: h.y - 1 },
      { x: h.x, y: h.y - 1 },
      { x: h.x + 1, y: h.y - 1 },
    ];
    const wrapped = { ...w, snake: half, head: half[half.length - 1] };
    const stayed = runUntil(g, wrapped, () => g.s.mode !== 'up', 30);
    expect(stayed).toBeGreaterThan(GRUB.upTime[0] + TRAPPED_BONUS_MAX - 0.3);
    expect(stayed).toBeLessThan(GRUB.upTime[0] + TRAPPED_BONUS_MAX + 0.3);
  });

  it('prefers holes Pip can reach in time', () => {
    const board = parseBoard(GRUB.map);
    for (let seed = 1; seed < 30; seed++) {
      const g = new Grub(board);
      const w = bossWorld([{ x: 1, y: 1 }, { x: 0, y: 1 }], new Rng(seed));
      runUntil(g, w, () => g.s.mode === 'telegraph');
      const h = g.holeCell!;
      expect(Math.abs(h.x - 1) + Math.abs(h.y - 1)).toBeLessThanOrEqual(GRUB.preferHoleDist);
    }
  });

  it('hidden mercy gives longer warnings and longer windows', () => {
    const plain = new Grub(parseBoard(GRUB.map));
    const eased = new Grub(parseBoard(GRUB.map));
    const w0 = bossWorld(farSnake, new Rng(3), 0);
    const w2 = bossWorld(farSnake, new Rng(3), 2);
    runUntil(plain, w0, () => plain.s.mode === 'up');
    runUntil(eased, w2, () => eased.s.mode === 'up');
    expect(eased.s.timer).toBeGreaterThan(plain.s.timer);
  });

  it('snapshot and restore round-trip through JSON', () => {
    const g = new Grub(parseBoard(GRUB.map));
    const w = bossWorld(farSnake);
    runUntil(g, w, () => g.s.mode === 'up');
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    const g2 = new Grub(parseBoard(GRUB.map));
    g2.restore(snap);
    expect(g2.s).toEqual(g.s);
  });
});

describe('lives', () => {
  it('earns a life every 50 points, capped at 9', () => {
    const s = freshLives();
    expect(addPoints(s, 49)).toBe(0);
    expect(addPoints(s, 1)).toBe(1);
    expect(s.lives).toBe(4);
    addPoints(s, 1000);
    expect(s.lives).toBe(MAX_LIVES);
  });

  it('losing the last life is out; refill gives 3 again', () => {
    const s = freshLives();
    expect(loseLife(s)).toBe('respawn');
    expect(loseLife(s)).toBe('respawn');
    expect(loseLife(s)).toBe('out');
    refillLives(s);
    expect(s.lives).toBe(3);
  });

  it('mercy kicks in at 2 lives lost and stacks once more at 4', () => {
    expect([0, 1, 2, 3, 4, 9].map(mercyLevel)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe('respawn placement', () => {
  it('lays a long snake out without overlapping walls or itself', () => {
    const board = parseBoard(GRUB.map);
    const blocked = (x: number, y: number) => x < 0 || y < 0 || x >= BOARD_W || y >= BOARD_H || board.holes.some((h) => h.x === x && h.y === y);
    const s = placeSnake(GRUB.start, 'R', 30, blocked);
    expect(s.cells).toHaveLength(30);
    const keys = new Set(s.cells.map((c) => `${c.x},${c.y}`));
    expect(keys.size).toBe(30);
    for (const c of s.cells) expect(blocked(c.x, c.y)).toBe(false);
    for (let i = 1; i < s.cells.length; i++) {
      const a = s.cells[i - 1];
      const b = s.cells[i];
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
    }
    // Nothing in front of the head.
    for (let i = 1; i <= 3; i++) expect(keys.has(`${GRUB.start.x + i},${GRUB.start.y}`)).toBe(false);
  });
});
