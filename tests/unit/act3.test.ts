import { describe, expect, it } from 'vitest';
import { Cell, isWall, parseBoard } from '../../src/game/board';
import { SpeedRampTwist, WallGapsTwist, GATE_OPEN_TIME, RAMP_MIN_SCALE } from '../../src/game/twists';
import { World } from '../../src/game/world';
import { Viper } from '../../src/game/bosses/viper';
import { VIPER, VIPER_MAP } from '../../src/game/bosses/tuning';
import { BossWorld } from '../../src/game/bosses/bossKit';
import { ringAround } from '../../src/game/coil';
import { Rng } from '../../src/engine/rng';

describe('speed ramp (Ch7)', () => {
  it('each fruit speeds you up, down to a floor', () => {
    const w = new World({ seed: 1 });
    const t = new SpeedRampTwist();
    expect(t.stepScale(w)).toBe(1);
    w.eaten = 5;
    expect(t.stepScale(w)).toBeLessThan(1);
    w.eaten = 1000;
    expect(t.stepScale(w)).toBe(RAMP_MIN_SCALE);
  });
});

describe('wall gaps (Ch8)', () => {
  it('opens and closes on a timer, blinking first', () => {
    const w = new World({ seed: 1, start: { x: 2, y: 13 } });
    const g = new WallGapsTwist([{ x: 8, y: 4 }]);
    expect(g.open).toBe(true);
    g.update(GATE_OPEN_TIME - 1, w);
    expect(g.warning).toBe(true);
    g.update(1.01, w);
    expect(g.open).toBe(false);
    expect(g.blockers()[0].hits({ x: 8, y: 4 })).toBe(true);
  });

  it('never shuts on any part of Pip', () => {
    const w = new World({ seed: 1, start: { x: 9, y: 4 }, startDir: 'R', startLength: 3 });
    const g = new WallGapsTwist([{ x: 8, y: 4 }]); // Pip's body is on the gate
    for (let i = 0; i < 20; i++) g.update(1, w);
    expect(g.open).toBe(true);
    w.snake.cells = [{ x: 2, y: 13 }, { x: 1, y: 13 }];
    g.update(0.2, w);
    expect(g.open).toBe(false);
  });
});

const board = parseBoard(VIPER_MAP);
function bw(snake: Cell[], fruits: Cell[] = [], mercy = 0): BossWorld {
  return { board, snake, head: snake[0], rng: new Rng(3), mercy, fruits };
}
const farPip: Cell[] = [
  { x: 1, y: 14 },
  { x: 0, y: 14 },
  { x: 0, y: 13 },
];

function run(v: Viper, w: BossWorld, seconds: number, until?: () => boolean): void {
  for (let t = 0; t < seconds && !(until && until()); t += 1 / 120) v.update(1 / 120, w);
}

describe('Viper (Ch9)', () => {
  it('races for fruit and never drives into a wall when it has a choice', () => {
    const v = new Viper(board);
    const w = bw(farPip, [{ x: 10, y: 12 }]);
    let stuns = 0;
    for (let i = 0; i < 2000; i++) {
      const ev = v.update(1 / 120, w);
      if (ev.some((e) => e.type === 'stun')) stuns++;
      if (ev.some((e) => e.type === 'steal')) (w.fruits as Cell[])[0] = { x: (i * 7) % 18 + 1, y: (i * 3) % 13 + 1 };
      for (const c of v.v.cells) expect(isWall(board, c.x, c.y)).toBe(false);
    }
    expect(stuns).toBe(0);
  });

  it('eats (steals) fruit and grows', () => {
    const v = new Viper(board);
    const len = v.v.cells.length;
    const w = bw(farPip, [{ x: VIPER.start.x - 2, y: VIPER.start.y }]);
    const events: string[] = [];
    for (let i = 0; i < 240 && !events.includes('steal'); i++) events.push(...v.update(1 / 120, w).map((e) => e.type));
    expect(events).toContain('steal');
    run(v, bw(farPip, []), 0.5);
    expect(v.v.cells.length).toBe(len + 1);
  });

  it('lunges after a warning of at least 0.8 s', () => {
    const v = new Viper(board);
    v.v.lungeT = 0.01;
    const w = bw(farPip, []);
    run(v, w, 0.1);
    expect(v.v.mode).toBe('warn');
    expect(v.v.lungePath.length).toBeGreaterThanOrEqual(2);
    let warned = 0;
    while (v.v.mode === 'warn') {
      v.update(1 / 120, w);
      warned += 1 / 120;
    }
    expect(warned).toBeGreaterThanOrEqual(0.8);
    expect(v.v.mode).toBe('lunge');
  });

  it('running into Pip’s body stuns her', () => {
    const v = new Viper(board);
    v.v.cells = [{ x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 }];
    const h = v.head;
    // Pip's body directly in front of her (she's heading left).
    const wall: Cell[] = [
      { x: h.x - 1, y: h.y - 1 },
      { x: h.x - 1, y: h.y },
      { x: h.x - 1, y: h.y + 1 },
    ];
    v.v.mode = 'lunge';
    v.v.dir = 'L';
    const ev = v.update(VIPER.lungeStepTime + 0.001, bw([{ x: 1, y: 1 }, ...wall]));
    expect(ev.some((e) => e.type === 'stun')).toBe(true);
    expect(v.v.mode).toBe('stunned');
  });

  it('circling her head wounds her: -1 health, 3 shorter, then she slithers off', () => {
    const v = new Viper(board);
    v.v.cells = [{ x: 10, y: 11 }, { x: 11, y: 11 }, { x: 12, y: 11 }, { x: 13, y: 11 }, { x: 14, y: 11 }, { x: 15, y: 11 }, { x: 16, y: 11 }];
    const ring = ringAround(10, 11).filter((c) => !v.v.cells.some((s) => s.x === c.x && s.y === c.y));
    const ev = v.afterStep(bw(ring));
    expect(ev[0]).toMatchObject({ type: 'coiled', health: 3 });
    expect(v.v.cells.length).toBe(4);
    expect(v.v.mode).toBe('hit');
    run(v, bw(farPip), VIPER.hitTime + VIPER.goneTime + 0.1);
    expect(v.v.mode).toBe('arrive');
    expect(Math.abs(v.head.x - farPip[0].x) + Math.abs(v.head.y - farPip[0].y)).toBeGreaterThanOrEqual(VIPER.arriveMinDist);
  });

  it('lunges more often after two hits', () => {
    expect(VIPER.lungeEvery[2]).toBeLessThan(VIPER.lungeEvery[0]);
  });

  it('four coils and she’s defeated; snapshot survives JSON', () => {
    const v = new Viper(board);
    v.v.cells = [{ x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 }, { x: 13, y: 12 }];
    for (let i = 0; i < 4; i++) {
      v.v.mode = 'race';
      const h = v.head;
      const ring = ringAround(h.x, h.y).filter((c) => !v.v.cells.some((s) => s.x === c.x && s.y === c.y) && !isWall(board, c.x, c.y));
      v.afterStep(bw(ring));
    }
    expect(v.defeated()).toBe(true);
    const c = new Viper(board);
    c.restore(JSON.parse(JSON.stringify(v.snapshot())));
    expect(c.v).toEqual(v.v);
  });
});
