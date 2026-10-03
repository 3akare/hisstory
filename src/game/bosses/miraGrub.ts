import { add, Board, BOARD_W, Cell, cellKey, Dir, isWall, manhattan, sameCell } from '../board';
import { checkCoil, windingDegrees } from '../coil';
import type { Blocker } from '../collision';
import { BossBar, BossController, BossEvent, BossWorld, easedSlower, warnTime } from './bossKit';
import { Grub } from './grub';
import { GRUB_RETURNS, MIRA, TRAPPED_BONUS_MAX } from './tuning';

/**
 * MIRA + GRUB RETURNS (Ch6): teaches SPLIT ATTENTION.
 * Mira walks the surface heading for the fruit to steal it, leaving a
 * crumbling trail. Grub pops out of holes like before, just quicker.
 * Coil Mira and Grub surfaces near you for revenge. Both bars must fall.
 */
export type MiraMode = 'walk' | 'panic' | 'hit' | 'diving' | 'hidden' | 'emerge' | 'defeated';

export interface MiraState {
  x: number;
  y: number;
  mode: MiraMode;
  timer: number;
  stepT: number;
  health: number;
  hits: number;
  trail: { x: number; y: number; ttl: number }[];
  bonus: number;
  facing: Dir;
  age: number;
}

const DIRS: Dir[] = ['U', 'R', 'D', 'L'];

export class MiraGrub implements BossController {
  readonly id = 'miraGrub' as const;
  readonly grub: Grub;
  m: MiraState;

  constructor(private board: Board) {
    this.grub = new Grub(board, { ...GRUB_RETURNS, label: 'GRUB' });
    this.m = {
      ...MIRA.start,
      mode: 'walk',
      timer: 0,
      stepT: 0,
      health: MIRA.health,
      hits: 0,
      trail: [],
      bonus: 0,
      facing: 'L',
      age: 0,
    };
  }

  get miraUp(): boolean {
    return this.m.mode === 'walk' || this.m.mode === 'panic' || this.m.mode === 'hit' || this.m.mode === 'diving';
  }

  get miraCell(): Cell {
    return { x: this.m.x, y: this.m.y };
  }

  bars(): BossBar[] {
    return [
      { label: 'MIRA', health: this.m.health, max: MIRA.health, color: '#ff4fd8' },
      { label: 'GRUB', health: this.grub.s.health, max: this.grub.maxHealth, color: '#b07ad6' },
    ];
  }

  defeated(): boolean {
    return this.m.mode === 'defeated' && this.grub.defeated();
  }

  private setMode(mode: MiraMode, timer: number): void {
    this.m.mode = mode;
    this.m.timer = timer;
    this.m.age = 0;
  }

  /** Can Mira stand here? */
  private free(c: Cell, w: BossWorld): boolean {
    if (isWall(this.board, c.x, c.y)) return false;
    if (w.snake.some((s) => sameCell(s, c))) return false;
    if (this.grub.s.mounds.some((m) => m.x === c.x && m.y === c.y)) return false;
    const gh = this.grub.holeCell;
    if (gh && this.grub.isUp && sameCell(gh, c)) return false;
    return true;
  }

  /** One step along the shortest path to the nearest fruit (or a wander if there's no way). */
  private nextMove(w: BossWorld): Cell | null {
    const start = this.miraCell;
    const targets = new Set((w.fruits ?? []).map((f) => cellKey(f.x, f.y)));
    if (targets.size) {
      const prev = new Map<number, number>([[cellKey(start.x, start.y), -1]]);
      const q: Cell[] = [start];
      for (let i = 0; i < q.length; i++) {
        const c = q[i];
        const k = cellKey(c.x, c.y);
        if (targets.has(k) && i > 0) {
          // Walk back to the first step.
          let cur = k;
          while (prev.get(cur) !== cellKey(start.x, start.y)) cur = prev.get(cur)!;
          return { x: cur % BOARD_W, y: Math.floor(cur / BOARD_W) };
        }
        for (const d of DIRS) {
          const n = add(c, d);
          const nk = cellKey(n.x, n.y);
          if (prev.has(nk) || !this.free(n, w)) continue;
          prev.set(nk, k);
          q.push(n);
        }
      }
    }
    const options = DIRS.map((d) => add(start, d)).filter((c) => this.free(c, w));
    return options.length ? w.rng.pick(options) : null;
  }

  private halfWrapped(w: BossWorld): boolean {
    return windingDegrees(w.snake, this.miraCell) >= 120;
  }

  update(dt: number, w: BossWorld): BossEvent[] {
    const ev: BossEvent[] = [];
    const m = this.m;
    m.age += dt;
    for (const t of m.trail) t.ttl -= dt;
    m.trail = m.trail.filter((t) => t.ttl > 0);

    // Grub does his own thing.
    for (const e of this.grub.update(dt, w)) ev.push(e.type === 'defeated' ? { type: 'knockout', at: e.at, who: 'GRUB' } : e);

    if (m.mode === 'defeated') return ev;
    const alone = this.grub.defeated();
    switch (m.mode) {
      case 'walk':
      case 'panic': {
        if (this.halfWrapped(w) && m.bonus < TRAPPED_BONUS_MAX) {
          // Pip is circling her: she freezes up in panic.
          m.mode = 'panic';
          m.bonus += dt;
          break;
        }
        m.mode = 'walk';
        m.stepT += dt;
        const stepTime = easedSlower(alone ? MIRA.stepTimeAlone : MIRA.stepTime, w.mercy);
        if (m.stepT < stepTime) break;
        m.stepT = 0;
        const next = this.nextMove(w);
        if (!next) break;
        m.trail.push({ x: m.x, y: m.y, ttl: MIRA.trailTime });
        m.facing = next.x > m.x ? 'R' : next.x < m.x ? 'L' : next.y > m.y ? 'D' : 'U';
        m.x = next.x;
        m.y = next.y;
        if ((w.fruits ?? []).some((f) => f.x === m.x && f.y === m.y)) ev.push({ type: 'steal', at: { x: m.x, y: m.y }, who: 'MIRA' });
        break;
      }
      case 'hit':
        m.timer -= dt;
        if (m.timer <= 0) {
          this.setMode('diving', 0.4);
          ev.push({ type: 'burrow', at: this.miraCell, who: 'MIRA' });
        }
        break;
      case 'diving':
        m.timer -= dt;
        if (m.timer <= 0) this.setMode('hidden', MIRA.hiddenTime);
        break;
      case 'hidden': {
        m.timer -= dt;
        if (m.timer > 0) break;
        // Pick a spot far from Pip to come back up.
        const spots: Cell[] = [];
        for (let y = 1; y < 14; y++)
          for (let x = 1; x < 19; x++) {
            const c = { x, y };
            if (this.free(c, w) && manhattan(c, w.head) >= MIRA.emergeMinDist && !this.board.holes.some((h) => sameCell(h, c))) spots.push(c);
          }
        const at = spots.length ? w.rng.pick(spots) : this.miraCell;
        m.x = at.x;
        m.y = at.y;
        this.setMode('emerge', warnTime(MIRA.emergeWarn, w.mercy));
        ev.push({ type: 'telegraph', at, who: 'MIRA' });
        break;
      }
      case 'emerge':
        m.timer -= dt;
        if (m.timer <= 0) {
          if (!this.free(this.miraCell, w)) {
            m.timer = 0.15;
            break;
          }
          this.setMode('walk', 0);
          m.bonus = 0;
          ev.push({ type: 'surface', at: this.miraCell, who: 'MIRA' });
        }
        break;
    }
    return ev;
  }

  afterStep(w: BossWorld): BossEvent[] {
    const ev: BossEvent[] = [];
    for (const e of this.grub.afterStep(w)) ev.push(e.type === 'defeated' ? { type: 'knockout', at: e.at, who: 'GRUB' } : e);
    if (this.grub.defeated() && this.m.mode !== 'defeated') this.grub.s.pace = GRUB_RETURNS.paceAlone;

    if (this.m.mode === 'walk' || this.m.mode === 'panic') {
      const res = checkCoil(w.board, w.snake, [this.miraCell], MIRA.maxPocket);
      if (res.coiled) {
        this.m.health--;
        this.m.hits++;
        ev.push({ type: 'coiled', at: this.miraCell, pocket: res.pocket, who: 'MIRA', health: this.m.health });
        if (this.m.health <= 0) {
          this.setMode('defeated', 0);
          this.m.trail = [];
          ev.push({ type: 'knockout', at: this.miraCell, who: 'MIRA' });
          this.grub.s.pace = GRUB_RETURNS.paceAlone;
        } else {
          this.setMode('hit', MIRA.hitStun);
          // Her brother comes up near you for revenge.
          this.grub.revengeNear();
        }
      }
    }
    if (this.defeated()) {
      const at = ev.find((e) => e.type === 'knockout')?.at ?? this.miraCell;
      ev.push({ type: 'defeated', at, who: 'MIRA + GRUB' });
    }
    return ev;
  }

  blockers(): Blocker[] {
    const out = this.grub.blockers();
    if (this.miraUp) {
      const c = this.miraCell;
      out.push({ cause: 'boss', hits: (p) => sameCell(p, c) });
    }
    if (this.m.trail.length) {
      const trail = this.m.trail;
      out.push({ cause: 'hazard', hits: (p) => trail.some((t) => t.x === p.x && t.y === p.y) });
    }
    return out;
  }

  reserved(x: number, y: number): boolean {
    return (
      this.grub.reserved(x, y) ||
      (this.m.mode !== 'defeated' && this.m.x === x && this.m.y === y) ||
      this.m.trail.some((t) => t.x === x && t.y === y)
    );
  }

  focus(): Cell | null {
    return this.m.mode === 'defeated' ? this.grub.focus() : this.miraCell;
  }

  snapshot(): unknown {
    return JSON.parse(JSON.stringify({ m: this.m, g: this.grub.snapshot() }));
  }

  restore(data: unknown): void {
    const d = data as { m: MiraState; g: unknown };
    this.m = JSON.parse(JSON.stringify(d.m));
    this.grub.restore(d.g);
  }
}
