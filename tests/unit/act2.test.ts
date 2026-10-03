import { describe, expect, it } from 'vitest';
import { Cell, parseBoard } from '../../src/game/board';
import { isSafeLanding } from '../../src/game/fruit';
import { IceTwist, PortalTwist } from '../../src/game/twists';
import { World } from '../../src/game/world';
import { queueTurn } from '../../src/game/snake';
import { MiraGrub } from '../../src/game/bosses/miraGrub';
import { MIRA, MIRA_GRUB_MAP } from '../../src/game/bosses/tuning';
import { ringAround } from '../../src/game/coil';
import { BossWorld } from '../../src/game/bosses/bossKit';
import { Rng } from '../../src/engine/rng';

describe('ice (Ch4)', () => {
  it('a turn on ice happens one tile late', () => {
    const w = new World({ seed: 1, start: { x: 5, y: 7 }, startDir: 'R', startLength: 3 });
    const ice = new IceTwist([{ x: 5, y: 7 }]);
    queueTurn(w.snake, 'D');
    ice.beforeStep(w);
    w.step();
    expect(w.snake.cells[0]).toEqual({ x: 6, y: 7 }); // slid straight on
    ice.beforeStep(w);
    w.step();
    expect(w.snake.cells[0]).toEqual({ x: 6, y: 8 }); // then turned
  });

  it('off the ice, turns are instant', () => {
    const w = new World({ seed: 1, start: { x: 5, y: 7 }, startDir: 'R', startLength: 3 });
    const ice = new IceTwist([{ x: 15, y: 1 }]);
    queueTurn(w.snake, 'D');
    ice.beforeStep(w);
    w.step();
    expect(w.snake.cells[0]).toEqual({ x: 5, y: 8 });
  });
});

describe('portal fruit (Ch5)', () => {
  function portalWorld(seed: number) {
    const w = new World({ seed, fruitCount: 0, start: { x: 3, y: 7 }, startLength: 4 });
    const p = new PortalTwist();
    w.kindFor = (x) => p.fruitKind(x);
    w.fruitCount = 3;
    w.fillFruit();
    return w;
  }

  it('spawns a linked pair plus an apple', () => {
    const w = portalWorld(2);
    const portals = w.fruits.filter((f) => f.kind === 'portal');
    expect(portals).toHaveLength(2);
    expect(portals[0].pair).toBe(portals[1].pair);
    expect(w.fruits.filter((f) => f.kind === 'apple')).toHaveLength(1);
  });

  it('twins are always placed with 3 free cells in every direction', () => {
    for (let seed = 1; seed < 80; seed++) {
      const w = portalWorld(seed);
      for (const f of w.fruits.filter((f) => f.kind === 'portal')) {
        const others = (x: number, y: number) => x < 0 || y < 0 || x >= 20 || y >= 15 || w.snake.cells.some((c) => c.x === x && c.y === y);
        expect(isSafeLanding(f, others, 3), `seed ${seed}`).toBe(true);
      }
    }
  });

  it('eating one twin pops the head out of the other, same direction, and the body follows', () => {
    const w = portalWorld(5);
    const [a, b] = w.fruits.filter((f) => f.kind === 'portal');
    // Put the snake right next to twin A, heading into it.
    w.snake.cells = [
      { x: a.x - 1, y: a.y },
      { x: a.x - 2, y: a.y },
      { x: a.x - 3, y: a.y },
    ].filter((c) => c.x >= 0);
    if (w.snake.cells.length < 3) return; // twin too close to the wall for this setup
    w.snake.dir = 'R';
    const ev = w.step();
    expect(ev.find((e) => e.type === 'teleport')).toMatchObject({ to: { x: b.x, y: b.y } });
    expect(w.snake.cells[0]).toEqual({ x: b.x, y: b.y });
    expect(w.snake.dir).toBe('R');
    expect(w.eaten).toBe(1);
    // Both twins are gone and a fresh pair is on the board.
    expect(w.fruits.some((f) => f.x === a.x && f.y === a.y && f.pair === a.pair)).toBe(false);
    expect(w.fruits.filter((f) => f.kind === 'portal')).toHaveLength(2);
    // Next step continues from the twin.
    w.step();
    expect(w.snake.cells[0]).toEqual({ x: b.x + 1, y: b.y });
    expect(w.snake.cells.length).toBe(4);
  });
});

function bw(snake: Cell[], fruits: Cell[] = [], seed = 1, mercy = 0): BossWorld {
  return { board: parseBoard(MIRA_GRUB_MAP), snake, head: snake[0], rng: new Rng(seed), mercy, fruits };
}

describe('Mira + Grub (Ch6)', () => {
  const far: Cell[] = [
    { x: 1, y: 14 },
    { x: 0, y: 14 },
    { x: 0, y: 13 },
  ];

  it('Mira walks about one tile per two of Pip’s steps, towards the fruit', () => {
    const b = new MiraGrub(parseBoard(MIRA_GRUB_MAP));
    const fruit = { x: 15, y: 9 };
    const w = bw(far, [fruit]);
    const start = b.miraCell;
    let t = 0;
    while (t < MIRA.stepTime * 3 + 0.001) {
      b.update(1 / 120, w);
      t += 1 / 120;
    }
    const moved = Math.abs(b.m.x - start.x) + Math.abs(b.m.y - start.y);
    expect(moved).toBe(3);
    expect(b.m.y).toBeGreaterThan(start.y); // heading down towards the fruit
  });

  it('steals fruit she reaches, and leaves a dangerous trail behind her', () => {
    const b = new MiraGrub(parseBoard(MIRA_GRUB_MAP));
    const fruit = { x: MIRA.start.x, y: MIRA.start.y + 2 };
    const w = bw(far, [fruit]);
    const events: string[] = [];
    for (let i = 0; i < 120; i++) events.push(...b.update(1 / 120, w).map((e) => e.type));
    expect(events).toContain('steal');
    expect(b.m.trail.length).toBeGreaterThan(0);
    const tr = b.m.trail[0];
    expect(b.blockers().some((x) => x.cause === 'hazard' && x.hits(tr))).toBe(true);
  });

  it('coiling Mira sends Grub up near Pip for revenge', () => {
    const b = new MiraGrub(parseBoard(MIRA_GRUB_MAP));
    const ring = ringAround(b.m.x, b.m.y);
    const ev = b.afterStep(bw(ring));
    expect(ev[0]).toMatchObject({ type: 'coiled', who: 'MIRA', health: 2 });
    expect(b.grub.s.revenge).toBe(true);
  });

  it('both bars must fall before the fight is won', () => {
    const b = new MiraGrub(parseBoard(MIRA_GRUB_MAP));
    // Knock Mira out.
    for (let i = 0; i < 3; i++) {
      b.m.mode = 'walk';
      const ev = b.afterStep(bw(ringAround(b.m.x, b.m.y)));
      expect(ev.some((e) => e.type === 'coiled')).toBe(true);
    }
    expect(b.m.mode).toBe('defeated');
    expect(b.defeated()).toBe(false);
    // Now Grub.
    for (let i = 0; i < 3; i++) {
      let guard = 0;
      while (b.grub.s.mode !== 'up' && guard++ < 5000) b.update(1 / 120, bw(far));
      const h = b.grub.holeCell!;
      const ev = b.afterStep(bw(ringAround(h.x, h.y)));
      if (i === 2) expect(ev.some((e) => e.type === 'defeated')).toBe(true);
    }
    expect(b.defeated()).toBe(true);
  });

  it('freezes in panic while Pip is partway round her', () => {
    const b = new MiraGrub(parseBoard(MIRA_GRUB_MAP));
    const { x, y } = b.miraCell;
    const half: Cell[] = [
      { x: x - 1, y: y + 1 },
      { x: x - 1, y },
      { x: x - 1, y: y - 1 },
      { x, y: y - 1 },
      { x: x + 1, y: y - 1 },
    ];
    const w = bw(half, [{ x: 18, y: 13 }]);
    for (let i = 0; i < 60; i++) b.update(1 / 120, w);
    expect(b.m.mode).toBe('panic');
    expect(b.miraCell).toEqual({ x, y });
  });

  it('snapshot survives JSON', () => {
    const b = new MiraGrub(parseBoard(MIRA_GRUB_MAP));
    for (let i = 0; i < 200; i++) b.update(1 / 120, bw(far, [{ x: 5, y: 5 }]));
    const c = new MiraGrub(parseBoard(MIRA_GRUB_MAP));
    c.restore(JSON.parse(JSON.stringify(b.snapshot())));
    expect(c.m).toEqual(b.m);
    expect(c.grub.s).toEqual(b.grub.s);
  });
});
