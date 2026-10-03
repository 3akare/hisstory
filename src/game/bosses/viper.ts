import { add, Board, BOARD_H, BOARD_W, Cell, cellKey, Dir, isWall, manhattan, OPPOSITE, sameCell } from '../board';
import { checkCoil, windingDegrees } from '../coil';
import type { Blocker } from '../collision';
import { placeSnake } from '../snake';
import { BossBar, BossController, BossEvent, BossWorld, byHits, easedSlower, warnTime } from './bossKit';
import { TRAPPED_BONUS_MAX, VIPER } from './tuning';

/**
 * VIPER (Ch9): the King's daughter, a rival snake who races Pip for fruit.
 *  - Her body is a wall to you (and yours to her).
 *  - If her head runs into YOUR body she's stunned: cut her off!
 *  - Circle her head (or seal it in) to wound her: she shrinks and slithers off.
 *  - Every ~10 s she lunges: her path flashes, then she dashes 3 tiles.
 */
export type ViperMode = 'race' | 'warn' | 'lunge' | 'stunned' | 'hit' | 'gone' | 'arrive' | 'defeated';

export interface ViperState {
  cells: Cell[];
  dir: Dir;
  grow: number;
  prevTail: Cell;
  mode: ViperMode;
  timer: number;
  stepT: number;
  health: number;
  hits: number;
  lungeT: number;
  lungePath: Cell[];
  lungeStep: number;
  panicT: number;
  age: number;
}

const DIRS: Dir[] = ['U', 'R', 'D', 'L'];

export class Viper implements BossController {
  readonly id = 'viper' as const;
  v: ViperState;

  constructor(private board: Board) {
    const start = placeSnake(VIPER.start, 'L', VIPER.startLength, (x, y) => isWall(board, x, y));
    this.v = {
      cells: start.cells,
      dir: 'L',
      grow: 0,
      prevTail: { ...start.cells[start.cells.length - 1] },
      mode: 'race',
      timer: 0,
      stepT: 0,
      health: VIPER.health,
      hits: 0,
      lungeT: VIPER.lungeEvery[0],
      lungePath: [],
      lungeStep: 0,
      panicT: 0,
      age: 0,
    };
  }

  get head(): Cell {
    return this.v.cells[0];
  }

  /** Is she physically on the board? */
  get present(): boolean {
    return this.v.mode !== 'gone' && this.v.mode !== 'arrive' && this.v.mode !== 'defeated';
  }

  bars(): BossBar[] {
    return [{ label: 'VIPER', health: this.v.health, max: VIPER.health, color: '#2fd6a0' }];
  }

  defeated(): boolean {
    return this.v.mode === 'defeated';
  }

  private setMode(mode: ViperMode, timer = 0): void {
    this.v.mode = mode;
    this.v.timer = timer;
    this.v.age = 0;
  }

  private ownBody(c: Cell, ignoreTail: boolean): boolean {
    const n = ignoreTail && this.v.grow === 0 ? this.v.cells.length - 1 : this.v.cells.length;
    for (let i = 0; i < n; i++) if (sameCell(this.v.cells[i], c)) return true;
    return false;
  }

  /** Free space reachable from `start` (to avoid trapping herself). */
  private space(start: Cell, w: BossWorld, limit: number): number {
    const blocked = new Set<number>([...this.v.cells.slice(0, -1), ...w.snake].map((c) => cellKey(c.x, c.y)));
    const seen = new Set<number>([cellKey(start.x, start.y)]);
    const q = [start];
    for (let i = 0; i < q.length && seen.size < limit; i++) {
      for (const d of DIRS) {
        const n = add(q[i], d);
        const k = cellKey(n.x, n.y);
        if (seen.has(k) || blocked.has(k) || isWall(this.board, n.x, n.y)) continue;
        seen.add(k);
        q.push(n);
      }
    }
    return seen.size;
  }

  private fruitDist(start: Cell, w: BossWorld): number {
    const targets = new Set((w.fruits ?? []).map((f) => cellKey(f.x, f.y)));
    if (!targets.size) return 99;
    const blocked = new Set<number>([...this.v.cells, ...w.snake].map((c) => cellKey(c.x, c.y)));
    const dist = new Map<number, number>([[cellKey(start.x, start.y), 0]]);
    const q = [start];
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      const d = dist.get(cellKey(c.x, c.y))!;
      if (targets.has(cellKey(c.x, c.y))) return d;
      for (const dir of DIRS) {
        const n = add(c, dir);
        const k = cellKey(n.x, n.y);
        if (dist.has(k) || blocked.has(k) || isWall(this.board, n.x, n.y)) continue;
        dist.set(k, d + 1);
        q.push(n);
      }
    }
    return 99;
  }

  /** Greedy racer: safe moves first, then the nearest fruit, then straight ahead. */
  chooseDir(w: BossWorld): Dir {
    const head = this.head;
    const need = this.v.cells.length + 2;
    let best: { d: Dir; score: number } | null = null;
    for (const d of DIRS) {
      if (d === OPPOSITE[this.v.dir]) continue;
      const n = add(head, d);
      if (isWall(this.board, n.x, n.y) || this.ownBody(n, true) || w.snake.some((c) => sameCell(c, n))) continue;
      const safe = this.space(n, w, need + 1) >= need;
      const score = (safe ? 0 : 1000) + this.fruitDist(n, w) + (d === this.v.dir ? -0.4 : 0) + (manhattan(n, w.head) <= 1 ? 50 : 0); // don't drive into Pip's face
      if (!best || score < best.score) best = { d, score };
    }
    return best?.d ?? this.v.dir;
  }

  /** Move the head one cell in `dir`. Returns events (steal, stun). */
  private move(dir: Dir, w: BossWorld): BossEvent[] {
    const next = add(this.head, dir);
    this.v.dir = dir;
    if (w.snake.some((c) => sameCell(c, next))) {
      // Ran into Pip's body: dazed. That's the opening to coil her.
      this.setMode('stunned', VIPER.stunTime);
      return [{ type: 'stun', at: next, who: 'VIPER' }];
    }
    if (isWall(this.board, next.x, next.y) || this.ownBody(next, true)) {
      this.setMode('stunned', VIPER.stunTime * 0.6);
      return [{ type: 'stun', at: this.head, who: 'VIPER' }];
    }
    this.v.cells.unshift(next);
    if (this.v.grow > 0) {
      this.v.grow--;
      this.v.prevTail = { ...this.v.cells[this.v.cells.length - 1] };
    } else this.v.prevTail = this.v.cells.pop()!;
    if ((w.fruits ?? []).some((f) => sameCell(f, next))) {
      this.v.grow++;
      return [{ type: 'steal', at: next, who: 'VIPER' }];
    }
    return [];
  }

  private halfWrapped(w: BossWorld): boolean {
    return windingDegrees(w.snake, this.head) >= 120;
  }

  /** The straightest run of `len` free cells from her head (for the lunge). */
  private lungePath(): { dir: Dir; path: Cell[] } {
    let best = { dir: this.v.dir, path: [] as Cell[] };
    for (const d of [this.v.dir, ...DIRS.filter((x) => x !== this.v.dir && x !== OPPOSITE[this.v.dir])]) {
      const path: Cell[] = [];
      let c = this.head;
      for (let i = 0; i < VIPER.lungeLength; i++) {
        c = add(c, d);
        if (isWall(this.board, c.x, c.y) || this.ownBody(c, false)) break;
        path.push(c);
      }
      if (path.length > best.path.length) best = { dir: d, path };
    }
    return best;
  }

  update(dt: number, w: BossWorld): BossEvent[] {
    const v = this.v;
    const ev: BossEvent[] = [];
    v.age += dt;
    switch (v.mode) {
      case 'race': {
        v.lungeT -= dt;
        if (v.lungeT <= 0) {
          const { dir, path } = this.lungePath();
          if (path.length >= 2) {
            v.dir = dir;
            v.lungePath = path;
            this.setMode('warn', warnTime(VIPER.lungeWarn, w.mercy));
            ev.push({ type: 'telegraph', at: path[path.length - 1], who: 'VIPER' });
            break;
          }
          v.lungeT = 1;
        }
        const panic = this.halfWrapped(w) && v.panicT < TRAPPED_BONUS_MAX;
        if (panic) v.panicT += dt;
        else if (!this.halfWrapped(w)) v.panicT = 0;
        v.stepT += dt;
        const stepTime = easedSlower(VIPER.stepTime, w.mercy) * (panic ? VIPER.panicSlow : 1);
        if (v.stepT >= stepTime) {
          v.stepT = 0;
          ev.push(...this.move(this.chooseDir(w), w));
        }
        break;
      }
      case 'warn':
        v.timer -= dt;
        if (v.timer <= 0) {
          this.setMode('lunge');
          v.lungeStep = 0;
          v.stepT = 0;
        }
        break;
      case 'lunge':
        v.stepT += dt;
        while (v.stepT >= VIPER.lungeStepTime && v.mode === 'lunge') {
          v.stepT -= VIPER.lungeStepTime;
          const next = add(this.head, v.dir);
          if (isWall(this.board, next.x, next.y) || this.ownBody(next, true)) {
            v.lungeStep = VIPER.lungeLength;
          } else ev.push(...this.move(v.dir, w));
          v.lungeStep++;
          if (v.mode === 'lunge' && v.lungeStep >= VIPER.lungeLength) {
            this.setMode('race');
            v.lungeT = byHits(VIPER.lungeEvery, v.hits);
            v.lungePath = [];
          }
        }
        break;
      case 'stunned':
        v.timer -= dt;
        if (v.timer <= 0) {
          this.setMode('race');
          v.lungePath = [];
        }
        break;
      case 'hit':
        v.timer -= dt;
        if (v.timer <= 0) this.setMode('gone', VIPER.goneTime);
        break;
      case 'gone': {
        v.timer -= dt;
        if (v.timer > 0) break;
        // Slither back in somewhere far from Pip.
        const spots: Cell[] = [];
        for (let y = 1; y < BOARD_H - 1; y++)
          for (let x = 1; x < BOARD_W - 1; x++) {
            const c = { x, y };
            if (isWall(this.board, x, y) || w.snake.some((s) => sameCell(s, c)) || manhattan(c, w.head) < VIPER.arriveMinDist) continue;
            spots.push(c);
          }
        const at = spots.length ? w.rng.pick(spots) : VIPER.start;
        const dir: Dir = at.x < BOARD_W / 2 ? 'R' : 'L';
        const placed = placeSnake(at, dir, v.cells.length, (x, y) => isWall(this.board, x, y) || w.snake.some((s) => s.x === x && s.y === y));
        v.cells = placed.cells;
        v.grow = placed.grow;
        v.prevTail = { ...placed.cells[placed.cells.length - 1] };
        v.dir = dir;
        this.setMode('arrive', warnTime(VIPER.arriveWarn, w.mercy));
        ev.push({ type: 'telegraph', at, who: 'VIPER' });
        break;
      }
      case 'arrive':
        v.timer -= dt;
        if (v.timer <= 0) {
          if (v.cells.some((c) => w.snake.some((s) => sameCell(s, c)))) {
            v.timer = 0.2;
            break;
          }
          this.setMode('race');
          v.lungeT = Math.max(v.lungeT, 3);
          ev.push({ type: 'surface', at: this.head, who: 'VIPER' });
        }
        break;
      case 'defeated':
        break;
    }
    return ev;
  }

  afterStep(w: BossWorld): BossEvent[] {
    if (!this.present || this.v.mode === 'hit') return [];
    const head = this.head;
    const res = checkCoil(w.board, w.snake, [head], VIPER.maxPocket);
    if (!res.coiled) return [];
    const v = this.v;
    v.health--;
    v.hits++;
    // She shrinks by 3 (never below 3).
    const target = Math.max(3, v.cells.length - VIPER.shrinkOnHit);
    while (v.cells.length > target) v.cells.pop();
    v.grow = 0;
    v.prevTail = { ...v.cells[v.cells.length - 1] };
    v.panicT = 0;
    const ev: BossEvent[] = [{ type: 'coiled', at: head, pocket: res.pocket, who: 'VIPER', health: v.health }];
    if (v.health <= 0) {
      this.setMode('defeated');
      ev.push({ type: 'defeated', at: head, who: 'VIPER' });
    } else this.setMode('hit', VIPER.hitTime);
    return ev;
  }

  blockers(): Blocker[] {
    if (!this.present) return [];
    const cells = this.v.cells;
    return [{ cause: 'rival', hits: (c) => cells.some((s) => sameCell(s, c)) }];
  }

  reserved(x: number, y: number): boolean {
    return this.v.cells.some((c) => c.x === x && c.y === y);
  }

  focus(): Cell | null {
    return this.present ? this.head : null;
  }

  snapshot(): unknown {
    return JSON.parse(JSON.stringify(this.v));
  }

  restore(data: unknown): void {
    this.v = JSON.parse(JSON.stringify(data)) as ViperState;
  }
}

