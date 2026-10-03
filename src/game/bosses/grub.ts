import { Board, Cell, cellKey, manhattan, sameCell } from '../board';
import { checkCoil, windingDegrees } from '../coil';
import type { Blocker } from '../collision';
import { BossBar, BossController, BossEvent, BossWorld, byHits, easedLonger, easedSlower, warnTime } from './bossKit';
import { GRUB, TRAPPED_BONUS_MAX } from './tuning';

/**
 * GRUB THE MOLE (Ch3): teaches TIMING.
 * Dirt shakes at one of the holes, Grub pops up, and you have a few seconds
 * to coil around him before he burrows again. Each coil makes him a bit quicker.
 *
 * State machine: hidden → telegraph → up → (hit | diving) → hidden ... → defeated
 */
export type GrubMode = 'hidden' | 'telegraph' | 'up' | 'hit' | 'diving' | 'defeated';

export interface Mound {
  x: number;
  y: number;
  ttl: number;
}

export interface GrubState {
  mode: GrubMode;
  timer: number;
  hole: number;
  lastHole: number;
  health: number;
  hits: number;
  /** Leave a mound when the current dive finishes. */
  moundOnDive: boolean;
  mounds: Mound[];
  /** Seconds in the current mode (for animation). */
  age: number;
  /** Extra seconds granted this appearance because Pip had him half-wrapped. */
  bonus: number;
  /** Length of the current appearance (for the countdown bar). */
  upFor: number;
  /** Next time, pop up near Pip (revenge for his sister). */
  revenge: boolean;
  /** Multiplier on his pauses underground (below 1 = more often). */
  pace: number;
}

export interface GrubOptions {
  /** Shorter appearances when he comes back for revenge in Ch6. */
  upTime?: number[];
  hiddenTime?: number[];
  health?: number;
  label?: string;
  firstDelay?: number;
}

export class Grub implements BossController {
  readonly id = 'grub' as const;
  s: GrubState;
  private upTime: number[];
  private hiddenTime: number[];
  readonly label: string;

  constructor(
    private board: Board,
    opts: GrubOptions = {},
  ) {
    this.upTime = opts.upTime ?? GRUB.upTime;
    this.hiddenTime = opts.hiddenTime ?? GRUB.hiddenTime;
    this.label = opts.label ?? 'GRUB';
    const health = opts.health ?? GRUB.health;
    this.s = {
      mode: 'hidden',
      timer: opts.firstDelay ?? GRUB.firstDelay,
      hole: -1,
      lastHole: -1,
      health,
      hits: 0,
      moundOnDive: false,
      mounds: [],
      age: 0,
      bonus: 0,
      upFor: 0,
      revenge: false,
      pace: 1,
    };
    this.maxHealth = health;
  }

  readonly maxHealth: number;

  get holeCell(): Cell | null {
    return this.s.hole >= 0 ? this.board.holes[this.s.hole] : null;
  }

  /** Is Grub physically above ground (can be coiled / crashed into)? */
  get isUp(): boolean {
    return this.s.mode === 'up' || this.s.mode === 'hit' || this.s.mode === 'diving';
  }

  bars(): BossBar[] {
    return [{ label: this.label, health: this.s.health, max: this.maxHealth, color: '#b07ad6' }];
  }

  defeated(): boolean {
    return this.s.mode === 'defeated';
  }

  private setMode(mode: GrubMode, timer: number): void {
    this.s.mode = mode;
    this.s.timer = timer;
    this.s.age = 0;
  }

  private pickHole(w: BossWorld): number {
    const body = new Set(w.snake.map((c) => cellKey(c.x, c.y)));
    const ok = (i: number, allowLast: boolean): boolean => {
      const h = this.board.holes[i];
      if (!allowLast && i === this.s.lastHole) return false;
      if (body.has(cellKey(h.x, h.y))) return false;
      if (this.s.mounds.some((m) => m.x === h.x && m.y === h.y)) return false;
      return manhattan(h, w.head) >= GRUB.minHoleDistFromHead;
    };
    for (const allowLast of [false, true]) {
      const options = this.board.holes.map((_, i) => i).filter((i) => ok(i, allowLast));
      if (!options.length) continue;
      if (this.s.revenge) {
        // Revenge: the hole nearest Pip (but never right in his face).
        this.s.revenge = false;
        return options.reduce((a, b) => (manhattan(this.board.holes[b], w.head) < manhattan(this.board.holes[a], w.head) ? b : a));
      }
      // Prefer holes Pip can actually reach in time.
      const near = options.filter((i) => manhattan(this.board.holes[i], w.head) <= GRUB.preferHoleDist);
      return w.rng.pick(near.length ? near : options);
    }
    return -1;
  }

  update(dt: number, w: BossWorld): BossEvent[] {
    const ev: BossEvent[] = [];
    const s = this.s;
    s.age += dt;
    for (const m of s.mounds) m.ttl -= dt;
    s.mounds = s.mounds.filter((m) => m.ttl > 0);
    if (s.mode === 'defeated') return ev;
    s.timer -= dt;
    if (s.timer > 0) return ev;

    switch (s.mode) {
      case 'hidden': {
        const hole = this.pickHole(w);
        if (hole < 0) {
          s.timer = 0.3;
          break;
        }
        s.hole = hole;
        this.setMode('telegraph', warnTime(GRUB.telegraph, w.mercy));
        ev.push({ type: 'telegraph', at: this.holeCell!, who: this.label });
        break;
      }
      case 'telegraph': {
        const h = this.holeCell!;
        if (w.snake.some((c) => sameCell(c, h))) {
          // Pip is lying across the hole: wait for the body to clear.
          s.timer = 0.15;
          break;
        }
        this.setMode('up', easedLonger(byHits(this.upTime, s.hits), w.mercy));
        s.bonus = 0;
        s.upFor = s.timer;
        ev.push({ type: 'surface', at: h, who: this.label });
        break;
      }
      case 'up':
        if (this.halfWrapped(w) && s.bonus < TRAPPED_BONUS_MAX) {
          // Pip is mid-coil: he panics instead of escaping.
          s.timer = 0.25;
          s.bonus += 0.25;
          s.upFor += 0.25;
          break;
        }
        s.moundOnDive = s.hits >= 1;
        this.setMode('diving', 0.35);
        ev.push({ type: 'burrow', at: this.holeCell!, who: this.label });
        break;
      case 'hit':
        s.moundOnDive = false;
        this.setMode('diving', 0.35);
        ev.push({ type: 'burrow', at: this.holeCell!, who: this.label });
        break;
      case 'diving': {
        const h = this.holeCell!;
        if (s.moundOnDive) {
          s.mounds.push({ x: h.x, y: h.y, ttl: GRUB.moundTime });
          ev.push({ type: 'hazard', at: h, kind: 'mound' });
        }
        s.lastHole = s.hole;
        s.hole = -1;
        this.setMode('hidden', easedSlower(byHits(this.hiddenTime, s.hits), w.mercy) * s.pace);
        break;
      }
    }
    return ev;
  }

  /** Pop up near Pip soon (telegraphed as usual). */
  revengeNear(): void {
    if (this.s.mode === 'defeated') return;
    this.s.revenge = true;
    if (this.s.mode === 'hidden') this.s.timer = Math.min(this.s.timer, 0.6);
  }

  /** Is Pip partway round him (a third of a lap or more)? Then he panics instead of escaping. */
  halfWrapped(w: BossWorld): boolean {
    const h = this.holeCell;
    if (!h) return false;
    return windingDegrees(w.snake, h) >= 120;
  }

  afterStep(w: BossWorld): BossEvent[] {
    if (this.s.mode !== 'up') return [];
    const h = this.holeCell!;
    const res = checkCoil(w.board, w.snake, [h], GRUB.maxPocket);
    if (!res.coiled) return [];
    this.s.health--;
    this.s.hits++;
    const ev: BossEvent[] = [{ type: 'coiled', at: h, pocket: res.pocket, who: this.label, health: this.s.health }];
    if (this.s.health <= 0) {
      this.setMode('defeated', 0);
      ev.push({ type: 'defeated', at: h, who: this.label });
    } else {
      this.setMode('hit', GRUB.hitStun);
    }
    return ev;
  }

  blockers(): Blocker[] {
    const out: Blocker[] = [];
    const h = this.holeCell;
    if (h && this.isUp) out.push({ cause: 'boss', hits: (c) => sameCell(c, h) });
    if (this.s.mounds.length) {
      const mounds = this.s.mounds;
      out.push({ cause: 'hazard', hits: (c) => mounds.some((m) => m.x === c.x && m.y === c.y) });
    }
    return out;
  }

  reserved(x: number, y: number): boolean {
    return this.board.holes.some((h) => h.x === x && h.y === y) || this.s.mounds.some((m) => m.x === x && m.y === y);
  }

  focus(): Cell | null {
    return this.s.mode === 'hidden' || this.s.mode === 'defeated' ? null : this.holeCell;
  }

  /** Snake cells or fruit can't sit on these. */
  get holes(): Cell[] {
    return this.board.holes;
  }

  snapshot(): GrubState {
    return JSON.parse(JSON.stringify(this.s));
  }

  restore(data: unknown): void {
    this.s = JSON.parse(JSON.stringify(data)) as GrubState;
  }
}
