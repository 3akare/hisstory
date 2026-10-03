import { add, Board, BOARD_H, BOARD_W, Cell, Dir, isWall, manhattan, sameCell } from '../board';
import { checkCoil, windingDegrees } from '../coil';
import type { Blocker } from '../collision';
import { BossBar, BossController, BossEvent, BossWorld, easedSlower, warnTime } from './bossKit';
import { KING, KING_SPOTS, TRAPPED_BONUS_MAX } from './tuning';

/**
 * THE HOLLOW KING (Ch10): the finale. A 2×2 boss, 3 phases × 3 coils.
 *   Phase 1 (Crows): he drifts; crows sweep whole rows/columns (the lane flashes first).
 *   Phase 2 (Old foes): Grub and Mira pop out of holes as hazards; he teleports (shadow first).
 *   Phase 3 (The Hollowing): the arena's outer ring crumbles inward; he moves faster; crows return.
 * Each phase is a mini-checkpoint (the save remembers which phase you reached).
 */
export type KingMode = 'idle' | 'teleportWarn' | 'hit' | 'gone' | 'reappear' | 'phaseBreak' | 'defeated';

export interface Lane {
  axis: 'row' | 'col';
  index: number;
  state: 'warn' | 'fly';
  timer: number;
}

export interface Cameo {
  who: 'grub' | 'mira';
  x: number;
  y: number;
  state: 'warn' | 'up';
  timer: number;
}

export interface KingState {
  x: number;
  y: number;
  phase: 1 | 2 | 3;
  health: number;
  mode: KingMode;
  timer: number;
  driftT: number;
  crowT: number;
  lanes: Lane[];
  teleportT: number;
  target: Cell | null;
  cameoT: number;
  cameos: Cameo[];
  crumbleT: number;
  rings: number;
  crumbleWarn: number;
  /** Cells of a crumbled ring that Pip was on: they stay open until he moves off. */
  spared: Cell[];
  /** The cells just ahead of Pip's head stay open this long after a crumble. */
  spareT: number;
  panicT: number;
  age: number;
}

const DIRS: Dir[] = ['U', 'R', 'D', 'L'];

/** Distance from the outer edge: 0 = the outermost ring. */
export const ringOf = (x: number, y: number): number => Math.min(x, y, BOARD_W - 1 - x, BOARD_H - 1 - y);

export class HollowKing implements BossController {
  readonly id = 'king' as const;
  k: KingState;

  constructor(
    private board: Board,
    startPhase: 1 | 2 | 3 = 1,
  ) {
    this.k = {
      ...KING_SPOTS[4],
      phase: startPhase,
      health: KING.healthPerPhase,
      mode: 'idle',
      timer: 0,
      driftT: 0,
      crowT: KING.crowEvery[startPhase - 1] || 99,
      lanes: [],
      teleportT: KING.teleportEvery,
      target: null,
      cameoT: 2,
      cameos: [],
      crumbleT: 8,
      rings: 0,
      crumbleWarn: 0,
      spared: [],
      spareT: 0,
      panicT: 0,
      age: 0,
    };
  }

  /** His four cells. */
  cells(at: Cell = this.k): Cell[] {
    return [
      { x: at.x, y: at.y },
      { x: at.x + 1, y: at.y },
      { x: at.x, y: at.y + 1 },
      { x: at.x + 1, y: at.y + 1 },
    ];
  }

  get center(): { x: number; y: number } {
    return { x: this.k.x + 0.5, y: this.k.y + 0.5 };
  }

  get present(): boolean {
    return this.k.mode === 'idle' || this.k.mode === 'teleportWarn' || this.k.mode === 'hit' || this.k.mode === 'phaseBreak';
  }

  bars(): BossBar[] {
    return [{ label: `KING ${['I', 'II', 'III'][this.k.phase - 1]}`, health: this.k.health, max: KING.healthPerPhase, color: '#8b5cf6' }];
  }

  defeated(): boolean {
    return this.k.mode === 'defeated';
  }

  private setMode(mode: KingMode, timer = 0): void {
    this.k.mode = mode;
    this.k.timer = timer;
    this.k.age = 0;
  }

  /** Is a cell part of the crumbled (now solid) edge? */
  crumbled(x: number, y: number): boolean {
    return this.k.rings > 0 && ringOf(x, y) < this.k.rings && !this.k.spared.some((c) => c.x === x && c.y === y);
  }

  /** The ring that's cracking right now (during the warning), or -1. */
  get cracking(): number {
    return this.k.crumbleWarn > 0 ? this.k.rings : -1;
  }

  private fits(at: Cell, w: BossWorld): boolean {
    return this.cells(at).every(
      (c) =>
        !isWall(this.board, c.x, c.y) &&
        !this.crumbled(c.x, c.y) &&
        !this.board.holes.some((h) => sameCell(h, c)) &&
        !w.snake.some((s) => sameCell(s, c)),
    );
  }

  private halfWrapped(w: BossWorld): boolean {
    return windingDegrees(w.snake, this.center) >= 120;
  }

  private pickLane(w: BossWorld): Lane {
    for (let tries = 0; tries < 20; tries++) {
      const axis = w.rng.chance(0.5) ? 'row' : 'col';
      const index = axis === 'row' ? w.rng.int(1, BOARD_H - 2) : w.rng.int(1, BOARD_W - 2);
      // Never sweep the lane Pip's head is in right now.
      if ((axis === 'row' && w.head.y === index) || (axis === 'col' && w.head.x === index)) continue;
      return { axis, index, state: 'warn', timer: warnTime(KING.crowWarn, w.mercy) };
    }
    return { axis: 'row', index: 0, state: 'warn', timer: KING.crowWarn };
  }

  laneHas(l: Lane, c: Cell): boolean {
    return l.axis === 'row' ? c.y === l.index : c.x === l.index;
  }

  private farSpot(w: BossWorld): Cell | null {
    const spots = KING_SPOTS.filter((s) => this.fits(s, w) && manhattan(s, w.head) >= KING.reappearMinDist);
    const any = KING_SPOTS.filter((s) => this.fits(s, w));
    return (spots.length ? w.rng.pick(spots) : any.length ? w.rng.pick(any) : null) ?? null;
  }

  update(dt: number, w: BossWorld): BossEvent[] {
    const k = this.k;
    const ev: BossEvent[] = [];
    k.age += dt;
    if (k.mode === 'defeated') return ev;

    // Crows (phases 1 and 3).
    const crowEvery = KING.crowEvery[k.phase - 1];
    if (crowEvery > 0 && k.mode !== 'phaseBreak') {
      k.crowT -= dt;
      if (k.crowT <= 0) {
        k.crowT = easedSlower(crowEvery, w.mercy);
        const lane = this.pickLane(w);
        k.lanes.push(lane);
        ev.push({ type: 'hazard', at: lane.axis === 'row' ? { x: 0, y: lane.index } : { x: lane.index, y: 0 }, kind: 'crowWarn' });
      }
    }
    for (const l of k.lanes) {
      l.timer -= dt;
      if (l.state === 'warn' && l.timer <= 0) {
        l.state = 'fly';
        l.timer = KING.crowFly;
        ev.push({ type: 'hazard', at: l.axis === 'row' ? { x: 0, y: l.index } : { x: l.index, y: 0 }, kind: 'crow' });
      }
    }
    k.lanes = k.lanes.filter((l) => !(l.state === 'fly' && l.timer <= 0));

    // Old foes (phase 2).
    if (k.phase === 2 && k.mode !== 'phaseBreak') {
      k.cameoT -= dt;
      if (k.cameoT <= 0) {
        k.cameoT = easedSlower(KING.cameoEvery, w.mercy);
        const free = this.board.holes.filter((h) => !w.snake.some((s) => sameCell(s, h)) && manhattan(h, w.head) >= 3 && !k.cameos.some((c) => sameCell(c, h)));
        if (free.length) {
          const h = w.rng.pick(free);
          k.cameos.push({ who: w.rng.chance(0.5) ? 'grub' : 'mira', x: h.x, y: h.y, state: 'warn', timer: warnTime(KING.cameoWarn, w.mercy) });
        }
      }
    }
    for (const c of k.cameos) {
      c.timer -= dt;
      if (c.state === 'warn' && c.timer <= 0) {
        if (w.snake.some((s) => sameCell(s, c))) c.timer = 0.15;
        else {
          c.state = 'up';
          c.timer = KING.cameoUp;
          ev.push({ type: 'surface', at: { x: c.x, y: c.y }, who: c.who.toUpperCase() });
        }
      }
    }
    k.cameos = k.cameos.filter((c) => !(c.state === 'up' && c.timer <= 0));

    // The Hollowing (phase 3).
    if (k.phase === 3 && k.mode !== 'phaseBreak' && k.rings < KING.maxRings) {
      if (k.crumbleWarn > 0) {
        k.crumbleWarn -= dt;
        if (k.crumbleWarn <= 0) {
          const ring = k.rings;
          // Never crumble onto Pip: the cells he's on (and the two ahead of his head) stay open until he's off them.
          const dir = w.snake.length > 1 ? (['U', 'D', 'L', 'R'] as Dir[]).find((d) => sameCell(add(w.snake[1], d), w.head)) : undefined;
          const ahead = dir ? [add(w.head, dir), add(add(w.head, dir), dir)] : [];
          k.spared = [...w.snake, ...ahead].filter((c) => ringOf(c.x, c.y) <= ring).map((c) => ({ x: c.x, y: c.y }));
          k.spareT = 1;
          k.rings++;
          ev.push({ type: 'hazard', at: { x: ring, y: ring }, kind: 'crumble' });
        }
      } else {
        k.crumbleT -= dt;
        if (k.crumbleT <= 0) {
          k.crumbleT = KING.crumbleEvery;
          k.crumbleWarn = warnTime(KING.crumbleWarn, w.mercy);
          ev.push({ type: 'hazard', at: { x: k.rings, y: k.rings }, kind: 'crumbleWarn' });
        }
      }
    }

    // Spared edge cells crumble as soon as Pip has moved off them.
    if (k.spareT > 0) k.spareT -= dt;
    if (k.spared.length) k.spared = k.spared.filter((c) => w.snake.some((s) => sameCell(s, c)) || k.spareT > 0);

    // The King himself.
    switch (k.mode) {
      case 'idle': {
        if (k.phase === 2) {
          k.teleportT -= dt;
          if (k.teleportT <= 0) {
            const to = this.farSpot(w);
            if (to) {
              k.target = to;
              this.setMode('teleportWarn', warnTime(KING.teleportWarn, w.mercy));
              ev.push({ type: 'telegraph', at: to, who: 'KING' });
              break;
            }
            k.teleportT = 1;
          }
        }
        if (this.halfWrapped(w) && k.panicT < TRAPPED_BONUS_MAX) {
          k.panicT += dt; // frozen while you circle him
          break;
        }
        if (!this.halfWrapped(w)) k.panicT = 0;
        k.driftT += dt;
        if (k.driftT >= easedSlower(KING.driftTime[k.phase - 1], w.mercy)) {
          k.driftT = 0;
          const opts = DIRS.map((d) => add(k, d)).filter((c) => this.fits(c, w) && ringOf(c.x, c.y) >= 2 && ringOf(c.x + 1, c.y + 1) >= 2);
          if (opts.length) {
            const c = w.rng.pick(opts);
            k.x = c.x;
            k.y = c.y;
          }
        }
        break;
      }
      case 'teleportWarn':
        k.timer -= dt;
        if (k.timer <= 0) {
          if (k.target && this.fits(k.target, w)) {
            k.x = k.target.x;
            k.y = k.target.y;
            ev.push({ type: 'surface', at: { x: k.x, y: k.y }, who: 'KING' });
          }
          k.target = null;
          k.teleportT = easedSlower(KING.teleportEvery, w.mercy);
          this.setMode('idle');
        }
        break;
      case 'hit':
        k.timer -= dt;
        if (k.timer <= 0) this.setMode('gone', KING.goneTime);
        break;
      case 'gone': {
        k.timer -= dt;
        if (k.timer > 0) break;
        const to = this.farSpot(w);
        if (!to) {
          k.timer = 0.2;
          break;
        }
        k.target = to;
        this.setMode('reappear', warnTime(KING.reappearWarn, w.mercy));
        ev.push({ type: 'telegraph', at: to, who: 'KING' });
        break;
      }
      case 'reappear':
        k.timer -= dt;
        if (k.timer <= 0) {
          if (!k.target || !this.fits(k.target, w)) {
            this.setMode('gone', 0.1);
            break;
          }
          k.x = k.target.x;
          k.y = k.target.y;
          k.target = null;
          k.panicT = 0;
          this.setMode('idle');
          ev.push({ type: 'surface', at: { x: k.x, y: k.y }, who: 'KING' });
        }
        break;
      case 'phaseBreak':
        k.timer -= dt;
        if (k.timer <= 0) {
          this.setMode('idle');
          k.crowT = KING.crowEvery[k.phase - 1] || 99;
          k.teleportT = KING.teleportEvery;
          k.crumbleT = 6;
        }
        break;
    }
    return ev;
  }

  afterStep(w: BossWorld): BossEvent[] {
    const k = this.k;
    if (k.mode !== 'idle' && k.mode !== 'teleportWarn') return [];
    const res = checkCoil(w.board, w.snake, this.cells(), KING.maxPocket);
    if (!res.coiled) return [];
    k.health--;
    const at = { x: k.x, y: k.y };
    const ev: BossEvent[] = [{ type: 'coiled', at, pocket: res.pocket, who: 'KING', health: k.health }];
    if (k.health > 0) {
      this.setMode('hit', KING.hitTime);
      return ev;
    }
    if (k.phase === 3) {
      this.setMode('defeated');
      k.lanes = [];
      k.cameos = [];
      ev.push({ type: 'defeated', at, who: 'THE HOLLOW KING' });
      return ev;
    }
    // Next phase: a short break while he speaks, then it gets harder.
    k.phase = (k.phase + 1) as 2 | 3;
    k.health = KING.healthPerPhase;
    k.lanes = [];
    k.cameos = [];
    this.setMode('phaseBreak', KING.phaseBreak);
    ev.push({ type: 'line', who: 'KING', text: k.phase === 2 ? 'OLD FRIENDS... ATTACK!' : 'THEN I WILL HOLLOW\nOUT THE WORLD ITSELF!' });
    return ev;
  }

  blockers(): Blocker[] {
    const out: Blocker[] = [];
    const k = this.k;
    if (this.present && k.mode !== 'phaseBreak') {
      const cells = this.cells();
      out.push({ cause: 'boss', hits: (c) => cells.some((b) => sameCell(b, c)) });
    }
    const flying = k.lanes.filter((l) => l.state === 'fly');
    if (flying.length) out.push({ cause: 'hazard', hits: (c) => flying.some((l) => this.laneHas(l, c)) });
    const ups = k.cameos.filter((c) => c.state === 'up');
    if (ups.length) out.push({ cause: 'hazard', hits: (c) => ups.some((u) => sameCell(u, c)) });
    if (k.rings > 0) out.push({ cause: 'wall', hits: (c) => this.crumbled(c.x, c.y) });
    return out;
  }

  reserved(x: number, y: number): boolean {
    const k = this.k;
    if (this.board.holes.some((h) => h.x === x && h.y === y)) return true;
    if (this.crumbled(x, y) || (this.cracking >= 0 && ringOf(x, y) === this.cracking)) return true;
    if (this.present && this.cells().some((c) => c.x === x && c.y === y)) return true;
    return !!k.target && this.cells(k.target).some((c) => c.x === x && c.y === y);
  }

  focus(): Cell | null {
    return this.present ? { x: this.k.x, y: this.k.y } : null;
  }

  snapshot(): unknown {
    return JSON.parse(JSON.stringify(this.k));
  }

  restore(data: unknown): void {
    this.k = JSON.parse(JSON.stringify(data)) as KingState;
  }
}
