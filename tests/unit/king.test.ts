import { describe, expect, it } from 'vitest';
import { BOARD_H, BOARD_W, Cell, parseBoard } from '../../src/game/board';
import { HollowKing, ringOf } from '../../src/game/bosses/hollowKing';
import { KING, KING_MAP } from '../../src/game/bosses/tuning';
import { BossWorld } from '../../src/game/bosses/bossKit';
import { ringAround } from '../../src/game/coil';
import { Rng } from '../../src/engine/rng';
import { validate } from '../../src/save/save';

const board = parseBoard(KING_MAP);
const pip: Cell[] = [
  { x: 2, y: 7 },
  { x: 1, y: 7 },
  { x: 0, y: 7 },
];
const bw = (snake: Cell[] = pip, seed = 4, mercy = 0): BossWorld => ({ board, snake, head: snake[0], rng: new Rng(seed), mercy, fruits: [] });

function step(k: HollowKing, w: BossWorld, seconds: number, until?: () => boolean) {
  const out: string[] = [];
  for (let t = 0; t < seconds && !(until && until()); t += 1 / 120) out.push(...k.update(1 / 120, w).map((e) => (e.type === 'hazard' ? e.kind : e.type)));
  return out;
}

function coil(k: HollowKing) {
  k.k.mode = 'idle';
  return k.afterStep(bw(ringAround(k.k.x, k.k.y, 2, 2)));
}

describe('the Hollow King', () => {
  it('is 2×2 and a ring around all four cells coils him', () => {
    const k = new HollowKing(board);
    expect(k.cells()).toHaveLength(4);
    const ev = coil(k);
    expect(ev[0]).toMatchObject({ type: 'coiled', who: 'KING', health: 2 });
  });

  it('three coils per phase, three phases, then he falls', () => {
    const k = new HollowKing(board);
    const lines: string[] = [];
    for (let i = 0; i < 9; i++) {
      const ev = coil(k);
      for (const e of ev) if (e.type === 'line') lines.push(e.text);
      if (i < 8) expect(k.defeated()).toBe(false);
    }
    expect(lines).toHaveLength(2);
    expect(k.defeated()).toBe(true);
  });

  it('can start at a later phase (mini-checkpoint)', () => {
    const k = new HollowKing(board, 3);
    expect(k.k.phase).toBe(3);
    expect(k.bars()[0].label).toBe('KING III');
    expect(validate({ story: { kingPhase: 3 } }).story.kingPhase).toBe(3);
    expect(validate({ story: { kingPhase: 7 } }).story.kingPhase).toBe(3);
  });

  it('phase 1 crows: each lane flashes for at least 0.8 s and never starts on Pip’s head', () => {
    for (let seed = 1; seed < 15; seed++) {
      const k = new HollowKing(board);
      const w = bw(pip, seed);
      step(k, w, KING.crowEvery[0] + 0.05);
      expect(k.k.lanes.length).toBe(1);
      const lane = k.k.lanes[0];
      expect(lane.state).toBe('warn');
      expect(k.laneHas(lane, w.head)).toBe(false);
      let warned = 0;
      while (k.k.lanes[0]?.state === 'warn') {
        k.update(1 / 120, w);
        warned += 1 / 120;
      }
      expect(warned).toBeGreaterThanOrEqual(0.8);
      // While flying, the lane is a hazard.
      const flying = k.blockers().find((b) => b.cause === 'hazard')!;
      const inLane = lane.axis === 'row' ? { x: 10, y: lane.index } : { x: lane.index, y: 7 };
      expect(flying.hits(inLane)).toBe(true);
    }
  });

  it('phase 2: old foes pop out of the holes (warned first), and he teleports with a shadow', () => {
    const k = new HollowKing(board, 2);
    const ev = step(k, bw(), KING.teleportEvery + 2);
    expect(ev).toContain('surface');
    expect(ev).toContain('telegraph');
    expect(k.k.lanes).toHaveLength(0); // no crows in phase 2
  });

  it('phase 3: the arena crumbles inward, never below the minimum and never onto Pip', () => {
    const k = new HollowKing(board, 3);
    const center: Cell[] = [
      { x: 9, y: 7 },
      { x: 8, y: 7 },
      { x: 7, y: 7 },
    ];
    step(k, bw(center), 120);
    expect(k.k.rings).toBe(KING.maxRings);
    for (let y = 0; y < BOARD_H; y++) for (let x = 0; x < BOARD_W; x++) expect(k.crumbled(x, y)).toBe(ringOf(x, y) < KING.maxRings);

    // Pip hugging the outer edge: the ring crumbles around him, but his cells stay open until he's off them.
    const k2 = new HollowKing(board, 3);
    const edge: Cell[] = [
      { x: 0, y: 7 },
      { x: 0, y: 8 },
      { x: 0, y: 9 },
    ];
    step(k2, bw(edge), 25, () => k2.k.rings > 0);
    expect(k2.k.rings).toBe(1);
    for (const c of edge) expect(k2.crumbled(c.x, c.y)).toBe(false);
    expect(k2.crumbled(0, 6)).toBe(false); // just ahead of his head (moving up)
    expect(k2.crumbled(0, 2)).toBe(true); // the rest of the ring is gone
    step(k2, bw(center), 1);
    for (const c of edge) expect(k2.crumbled(c.x, c.y)).toBe(true);
  });

  it('after a coil he vanishes and comes back far from Pip', () => {
    const k = new HollowKing(board);
    coil(k);
    expect(k.k.mode).toBe('hit');
    step(k, bw(), KING.hitTime + KING.goneTime + KING.reappearWarn + 0.3, () => k.k.mode === 'idle');
    expect(k.k.mode).toBe('idle');
    expect(Math.abs(k.k.x - pip[0].x) + Math.abs(k.k.y - pip[0].y)).toBeGreaterThanOrEqual(KING.reappearMinDist);
  });

  it('snapshot survives JSON', () => {
    const k = new HollowKing(board, 3);
    step(k, bw(), 25);
    const c = new HollowKing(board);
    c.restore(JSON.parse(JSON.stringify(k.snapshot())));
    expect(c.k).toEqual(k.k);
  });
});
