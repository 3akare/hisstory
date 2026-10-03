import { BASE, BIOMES } from '../art/palettes';
import { SPRITES } from '../art/sprites';
import { Scene } from '../engine/scenes';
import { Action, ACTION_DIR, dpadDir, PointerInfo } from '../engine/input';
import { Fx } from '../engine/fx';
import { BOARD_PX_W, TILE } from '../engine/renderer';
import type { App } from '../app';
import { Cell, Dir, isWall, OPPOSITE, parseBoard, sameCell } from '../game/board';
import { checkCollision } from '../game/collision';
import { BossController, BossEvent, BossWorld } from '../game/bosses/bossKit';
import { Grub } from '../game/bosses/grub';
import { GRUB } from '../game/bosses/tuning';
import { ringAround } from '../game/coil';
import { LevelConfig } from '../game/level';
import { addPoints, COIL_POINTS, freshLives, LivesState, loseLife, mercyLevel } from '../game/lives';
import { placeSnake, queueTurn } from '../game/snake';
import { classicStepMs, World, WorldEvent } from '../game/world';
import { drawBoard, drawFruit, drawSnake, PIP_LOOK, WHITE_LOOK } from './draw';
import { drawBoss } from './bossDraw';
import { drawDpad, drawHudBar, drawMeter } from './hud';

export type PlayState = 'ready' | 'playing' | 'dead' | 'out' | 'won';

/** Seconds after a respawn during which bosses and hazards can't hurt you. */
const GHOST_TIME = 1.2;
/** How long the "lost a life" blink lasts before you can steer again. */
const RESPAWN_BLINK = 0.9;

export interface PlayHooks {
  /** Chapter cleared or boss defeated. */
  onWin?(scene: PlayScene): void;
  /** Out of lives (Story). */
  onOut?(scene: PlayScene): void;
}

export function createBoss(level: LevelConfig, world: World): BossController | null {
  switch (level.boss) {
    case 'grub':
      return new Grub(world.board);
    default:
      return null;
  }
}

/**
 * One level being played: Classic, a Story chapter, or a boss fight.
 * Owns the World (rules), the boss controller, lives, and all the juice.
 */
export class PlayScene extends Scene {
  readonly name = 'play';
  world!: World;
  boss: BossController | null = null;
  fx = new Fx();
  state: PlayState = 'ready';
  lives: LivesState;
  best = 0;
  livesLostThisFight = 0;
  invincible = false;
  private stepAcc = 0;
  private t = 0;
  private stateTime = 0;
  private ghost = 0;
  private respawning = false;
  private hintTime = 0;
  private pocketFx: { cells: Cell[]; t: number } | null = null;
  private dpadPressed: Dir | null = null;
  private dpadPointer: number | null = null;
  showPockets = false;

  constructor(
    app: App,
    readonly level: LevelConfig,
    lives?: LivesState,
    private hooks: PlayHooks = {},
  ) {
    super(app);
    this.lives = lives ?? freshLives();
  }

  get isClassic(): boolean {
    return this.level.kind === 'classic';
  }

  get mercy(): number {
    return mercyLevel(this.livesLostThisFight);
  }

  enter(): void {
    this.reset();
  }

  reset(): void {
    const seed = this.app.params.has('seed') ? Number(this.app.params.get('seed')) : undefined;
    this.world = new World({
      board: parseBoard(this.level.map),
      start: this.level.start,
      startDir: this.level.startDir,
      startLength: this.level.startLength,
      fruitCount: 0,
      seed,
    });
    this.boss = createBoss(this.level, this.world);
    this.wireBoss();
    this.world.fruitCount = this.level.fruitCount;
    this.world.fillFruit();
    this.setState('ready');
    this.respawning = false;
    this.stepAcc = 0;
    this.ghost = 0;
    this.livesLostThisFight = 0;
    this.hintTime = this.level.hint ? 6.5 : 0;
    this.pocketFx = null;
    this.fx.clear();
  }

  private setState(s: PlayState): void {
    this.state = s;
    this.stateTime = 0;
  }

  /** Point the world's collision/spawn rules at the boss. */
  private wireBoss(): void {
    const boss = this.boss;
    if (!boss) return;
    this.world.reserved = (x, y) => boss.reserved(x, y);
    this.refreshBossRules();
  }

  private refreshBossRules(): void {
    const boss = this.boss;
    if (!boss) return;
    this.world.blockers = this.ghost > 0 || this.invincible ? [] : boss.blockers();
    const f = boss.focus();
    this.world.avoid = f ? { cell: f, dist: GRUB.fruitDistance } : undefined;
  }

  get stepMs(): number {
    return this.isClassic ? classicStepMs(this.world.eaten) : this.level.stepMs;
  }

  private bossWorld(): BossWorld {
    return { board: this.world.board, snake: this.world.snake.cells, head: this.world.snake.cells[0], rng: this.world.rng, mercy: this.mercy };
  }

  // ---- input ---------------------------------------------------------------

  private steer(dir: Dir): void {
    if (this.state !== 'ready' && this.state !== 'playing') return;
    if (this.state === 'ready') {
      if (this.respawning && this.stateTime < RESPAWN_BLINK) return;
      const neck = this.world.snake.cells[1];
      const head = this.world.snake.cells[0];
      // Don't start by turning straight into your own neck.
      if (neck && sameCell(neck, { x: head.x + (dir === 'R' ? 1 : dir === 'L' ? -1 : 0), y: head.y + (dir === 'D' ? 1 : dir === 'U' ? -1 : 0) })) return;
      if (this.respawning) this.ghost = GHOST_TIME;
      this.respawning = false;
      this.setState('playing');
      if (dir !== this.world.snake.dir) this.world.snake.queue = [dir];
      return;
    }
    queueTurn(this.world.snake, dir);
  }

  private continueAfterEnd(): void {
    if (this.stateTime < 0.7) return;
    if (this.state === 'dead') this.reset();
    else if (this.state === 'won') {
      if (this.hooks.onWin) this.hooks.onWin(this);
      else this.reset();
    } else if (this.state === 'out') {
      if (this.hooks.onOut) this.hooks.onOut(this);
      else {
        this.lives = freshLives();
        this.reset();
      }
    }
  }

  onAction(action: Action, repeat: boolean): void {
    if (this.state === 'dead' || this.state === 'won' || this.state === 'out') {
      if (!repeat && (action === 'confirm' || ACTION_DIR[action])) this.continueAfterEnd();
      return;
    }
    const dir = ACTION_DIR[action];
    if (dir && !repeat) this.steer(dir);
    else if (action === 'confirm' && this.state === 'ready') this.steer(this.world.snake.dir);
  }

  onPointerDown(p: PointerInfo): void {
    if (this.state === 'dead' || this.state === 'won' || this.state === 'out') {
      this.continueAfterEnd();
      return;
    }
    const d = dpadDir(this.app.renderer.layout, p.x, p.y);
    if (d) {
      this.dpadPointer = p.id;
      this.dpadPressed = d;
      this.steer(d);
    }
  }

  onPointerMove(p: PointerInfo): void {
    if (p.id !== this.dpadPointer) return;
    const d = dpadDir(this.app.renderer.layout, p.x, p.y);
    if (d && d !== this.dpadPressed) {
      this.dpadPressed = d;
      this.steer(d);
    }
  }

  onPointerUp(p: PointerInfo): void {
    if (p.id === this.dpadPointer) {
      this.dpadPointer = null;
      this.dpadPressed = null;
    }
  }

  // ---- simulation ------------------------------------------------------------

  update(dt: number): void {
    this.t += dt;
    this.stateTime += dt;
    this.fx.update(dt);
    this.world.tick(dt);
    if (this.hintTime > 0 && this.state === 'playing') this.hintTime -= dt;
    if (this.pocketFx) {
      this.pocketFx.t += dt;
      if (this.pocketFx.t > 0.7) this.pocketFx = null;
    }
    if (this.state !== 'playing') return;

    if (this.ghost > 0) this.ghost -= dt;
    if (this.boss) {
      this.handleBoss(this.boss.update(dt, this.bossWorld()));
      this.refreshBossRules();
    }
    this.stepAcc += dt * 1000;
    while (this.stepAcc >= this.stepMs && this.state === 'playing') {
      this.stepAcc -= this.stepMs;
      this.refreshBossRules();
      if (this.invincible) this.autoDodge();
      this.handle(this.world.step());
      if (this.boss && this.state === 'playing') this.handleBoss(this.boss.afterStep(this.bossWorld()));
    }
  }

  cellCenter(c: Cell): { x: number; y: number } {
    const { boardX, boardY } = this.app.renderer.layout;
    return { x: boardX + c.x * TILE + 4, y: boardY + c.y * TILE + 4 };
  }

  private handle(events: WorldEvent[]): void {
    for (const e of events) {
      if (e.type === 'eat') {
        const c = this.cellCenter(e.fruit);
        this.fx.burst(c.x, c.y, [BASE.R, BASE.Y, BASE.W, BASE.O], 14, 70);
        this.fx.float('+1', c.x, c.y - 6, BASE.Y);
        this.fx.shake(1, 0.08);
        if (!this.isClassic) this.gainPoints(1, c);
      } else if (e.type === 'crash') {
        this.crash(e.cause);
      }
    }
  }

  private gainPoints(n: number, at: { x: number; y: number }): void {
    const extra = addPoints(this.lives, n);
    if (extra > 0) this.fx.float('1UP!', at.x, at.y - 14, BASE.G);
  }

  private crash(cause: string): void {
    const head = this.world.snake.cells[0];
    const c = this.cellCenter(head);
    this.fx.burst(c.x, c.y, [BASE.G, BASE.h, BASE.W], 24, 90);
    this.fx.shake(4, 0.4);
    this.fx.flash('#ffffff', 0.55);
    this.stepAcc = 0;
    if (this.isClassic) {
      this.best = Math.max(this.best, this.world.points);
      this.setState('dead');
      return;
    }
    this.livesLostThisFight++;
    if (cause === 'boss' && this.level.hint) this.hintTime = 3;
    if (loseLife(this.lives) === 'out') {
      this.setState('out');
      return;
    }
    this.respawn();
  }

  /** Back to the level start with your length and progress kept, paused until you steer. */
  private respawn(): void {
    const len = this.world.snake.cells.length + this.world.snake.grow;
    const blocked = (x: number, y: number) =>
      isWall(this.world.board, x, y) || (this.boss?.reserved(x, y) ?? false) || this.world.fruits.some((f) => f.x === x && f.y === y);
    this.world.snake = placeSnake(this.level.start, this.level.startDir, len, blocked);
    this.respawning = true;
    this.setState('ready');
  }

  private handleBoss(events: BossEvent[]): void {
    for (const e of events) {
      if (e.type === 'line') continue;
      const c = this.cellCenter(e.at);
      switch (e.type) {
        case 'telegraph':
          this.fx.burst(c.x, c.y, ['#9a6a3e', '#5a3622'], 6, 30, { gravity: 120, life: 0.4 });
          break;
        case 'surface':
          this.fx.burst(c.x, c.y, ['#9a6a3e', '#5a3622', '#c2c3c7'], 10, 50, { gravity: 160 });
          this.fx.shake(1, 0.1);
          break;
        case 'coiled':
          this.pocketFx = { cells: e.pocket, t: 0 };
          this.fx.burst(c.x, c.y, [BASE.Y, BASE.W, BASE.G, BASE.h], 30, 110);
          this.fx.float('COIL!', c.x, c.y - 10, BASE.Y);
          this.fx.shake(3, 0.3);
          this.fx.flash('#ffd94a', 0.35);
          this.gainPoints(COIL_POINTS, c);
          break;
        case 'defeated':
          this.fx.burst(c.x, c.y, [BASE.Y, BASE.W, BASE.R, BASE.O, BASE.G], 60, 140, { life: 0.9 });
          this.fx.shake(5, 0.6);
          this.fx.flash('#ffffff', 0.7);
          this.setState('won');
          break;
        default:
          break;
      }
    }
  }

  // ---- debug helpers (?debug=1) ---------------------------------------------------

  /** Debug invincibility: if the next move would crash, turn to a safe direction instead. */
  private autoDodge(): void {
    const snake = this.world.snake;
    const tryDir = (d: Dir) => {
      const head = snake.cells[0];
      const v = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[d];
      const next = { x: head.x + v[0], y: head.y + v[1] };
      return checkCollision(this.world.board, snake, next, this.world.blockers) === null;
    };
    const planned = snake.queue[0] ?? snake.dir;
    if (tryDir(planned)) return;
    const options = (['U', 'D', 'L', 'R'] as Dir[]).filter((d) => d !== OPPOSITE[snake.dir] && tryDir(d));
    if (options.length) {
      snake.queue = [];
      snake.dir = options[0];
    }
  }

  /** Wrap Pip around the boss right now and run the real coil check. */
  debugWrapBoss(): boolean {
    const boss = this.boss;
    if (!(boss instanceof Grub) || boss.s.mode !== 'up') return false;
    const h = boss.holeCell!;
    const ring = ringAround(h.x, h.y);
    const snake = this.world.snake;
    snake.cells = ring;
    snake.prevTail = { ...ring[ring.length - 1] };
    snake.grow = 0;
    snake.queue = [];
    const a = ring[1];
    const b = ring[0];
    snake.dir = b.x > a.x ? 'R' : b.x < a.x ? 'L' : b.y > a.y ? 'D' : 'U';
    this.handleBoss(boss.afterStep(this.bossWorld()));
    return true;
  }

  // ---- drawing -----------------------------------------------------------------

  draw(): void {
    const r = this.app.renderer;
    const off = this.fx.shakeOffset();
    r.offsetX = off.x;
    r.offsetY = off.y;
    r.begin(BIOMES[this.level.biome].backdrop);

    this.drawHud();
    drawBoard(r, this.world.board, this.level.biome, this.t);
    drawFruit(r, this.world.fruits, this.t, this.level.biome);
    if (this.boss) drawBoss(r, this.boss, this.t);

    const alpha = this.state === 'playing' ? Math.min(1, this.stepAcc / this.stepMs) : this.state === 'ready' && !this.respawning ? 1 : 0;
    let look = PIP_LOOK;
    const blinking =
      (this.state === 'dead' && this.stateTime < 0.8) ||
      (this.state === 'ready' && this.respawning) ||
      (this.state === 'playing' && this.ghost > 0);
    if (blinking && Math.floor(this.t * 12) % 2 === 0) look = WHITE_LOOK;
    if (!(this.respawning && this.state === 'ready' && Math.floor(this.t * 12) % 4 === 0)) drawSnake(r, this.world.snake, alpha, look, this.t);

    if (this.pocketFx) this.drawPocket(this.pocketFx.cells, 1 - this.pocketFx.t / 0.7);
    if (this.showPockets) this.drawDebugPocket();
    this.fx.drawParticles(r);

    r.offsetX = 0;
    r.offsetY = 0;
    r.applyTransform();
    drawDpad(r, this.dpadPressed);
    this.drawOverlays();
    this.fx.drawFlash(r);
  }

  private drawHud(): void {
    const r = this.app.renderer;
    const L = r.layout;
    drawHudBar(r, this.level.biome);
    if (this.isClassic) {
      r.text(`SCORE ${String(this.world.points).padStart(3, '0')}`, L.boardX, L.hudY, { color: '#fff1e8' });
      r.text(`BEST ${String(Math.max(this.best, this.world.points)).padStart(3, '0')}`, L.boardX + BOARD_PX_W, L.hudY, { align: 'right', color: BASE.Y });
      return;
    }
    r.sprite('heart', SPRITES.heart, L.boardX, L.hudY + 1);
    r.text(`x${this.lives.lives}`, L.boardX + 9, L.hudY, { color: '#fff1e8' });
    r.text(String(this.lives.score).padStart(4, '0'), L.boardX + 40, L.hudY, { color: BASE.Y });
    if (this.boss) {
      const bars = this.boss.bars();
      const w = 108 / bars.length;
      bars.forEach((b, i) => drawMeter(r, L.boardX + BOARD_PX_W - 108 + i * w, L.hudY, w - (bars.length > 1 ? 4 : 0), b.health, b.max, b.color, bars.length > 1 ? undefined : b.label));
    }
  }

  private drawPocket(cells: Cell[], a: number): void {
    const r = this.app.renderer;
    const { boardX: ox, boardY: oy } = r.layout;
    for (const c of cells) {
      const x = ox + c.x * TILE;
      const y = oy + c.y * TILE;
      r.rect(x, y, TILE, TILE, BASE.Y, 0.35 * a);
      r.rect(x, y, TILE, 1, BASE.W, 0.6 * a);
    }
  }

  private drawDebugPocket(): void {
    const boss = this.boss;
    if (!(boss instanceof Grub) || !boss.holeCell) return;
    const r = this.app.renderer;
    const h = boss.holeCell;
    const { boardX: ox, boardY: oy } = r.layout;
    r.rect(ox + h.x * TILE, oy + h.y * TILE, TILE, TILE, '#4fd8ff', 0.4);
  }

  private drawOverlays(): void {
    const r = this.app.renderer;
    const L = r.layout;
    const cx = L.boardX + BOARD_PX_W / 2;
    const cy = L.boardY + 72;
    const blink = Math.floor(this.t * 2) % 2 === 0;
    const go = L.touch ? 'TAP TO CONTINUE' : 'PRESS ENTER';

    if (this.state === 'ready') {
      if (this.respawning) {
        if (this.stateTime >= RESPAWN_BLINK && blink) r.text(L.touch ? 'TAP AN ARROW' : 'PRESS A DIRECTION', cx, L.boardY + 124, { align: 'center' });
      } else {
        r.panel(cx - 84, cy - 14, 168, 28);
        r.text(this.level.title, cx, cy - 8, { align: 'center', color: BASE.Y });
        if (blink) r.text(L.touch ? 'TAP AN ARROW' : 'PRESS A DIRECTION', cx, cy + 3, { align: 'center' });
      }
    } else if (this.state === 'dead' && this.stateTime > 0.5) {
      r.panel(cx - 80, cy - 22, 160, 44);
      r.text('GAME OVER', cx, cy - 15, { align: 'center', color: BASE.R });
      r.text(`SCORE ${this.world.points}`, cx, cy - 3, { align: 'center' });
      if (blink) r.text(L.touch ? 'TAP TO RETRY' : 'PRESS ENTER', cx, cy + 9, { align: 'center', color: '#c2c3c7' });
    } else if (this.state === 'out' && this.stateTime > 0.5) {
      r.panel(cx - 84, cy - 22, 168, 44);
      r.text('OUT OF LIVES', cx, cy - 15, { align: 'center', color: BASE.R });
      r.text('BACK TO CHECKPOINT', cx, cy - 3, { align: 'center' });
      if (blink) r.text(go, cx, cy + 9, { align: 'center', color: '#c2c3c7' });
    } else if (this.state === 'won' && this.stateTime > 0.8) {
      r.panel(cx - 84, cy - 22, 168, 44);
      const title = this.boss ? `${this.boss.bars()[0].label} DEFEATED!` : 'CHAPTER CLEAR!';
      r.text(title, cx, cy - 15, { align: 'center', color: BASE.Y });
      r.text(`SCORE ${this.lives.score}`, cx, cy - 3, { align: 'center' });
      if (blink) r.text(go, cx, cy + 9, { align: 'center', color: '#c2c3c7' });
    }

    if (this.hintTime > 0 && this.level.hint && (this.state === 'playing' || this.state === 'ready')) {
      const a = Math.min(1, this.hintTime * 2);
      const w = r.measure(this.level.hint) + 12;
      const y = L.boardY + 144 - 20;
      r.ctx.globalAlpha = a;
      r.panel(cx - w / 2, y, w, 15, '#2a1a3a', BASE.Y, 0.9 * a);
      r.ctx.globalAlpha = 1;
      r.text(this.level.hint, cx, y + 4, { align: 'center', color: BASE.Y, alpha: a });
    }
    if (this.invincible) r.text('INVINCIBLE', L.boardX + 2, L.boardY + 2, { color: BASE.C, size: 8 });
  }
}
