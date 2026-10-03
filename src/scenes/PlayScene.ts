import { BASE, BIOMES } from '../art/palettes';
import { SPRITES } from '../art/sprites';
import { Scene } from '../engine/scenes';
import { Action, ACTION_DIR, dpadDir, PointerInfo } from '../engine/input';
import { Fx } from '../engine/fx';
import { BOARD_PX_H, BOARD_PX_W, TILE } from '../engine/renderer';
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
import { LevelSnapshot, restoreLevel, snapshotLevel } from '../game/snapshot';
import { drawBoard, drawFruit, drawSnake, PIP_LOOK, WHITE_LOOK } from './draw';
import { drawBoss } from './bossDraw';
import { drawDpad, drawHudBar, drawMeter } from './hud';
import { MusicButton } from '../engine/ui';
import { GameOverScene } from './GameOverScene';
import { HomeScene } from './HomeScene';
import { PauseScene } from './PauseScene';

export type PlayState = 'ready' | 'countdown' | 'playing' | 'dead' | 'out' | 'won';

/** Seconds after a respawn during which bosses and hazards can't hurt you. */
const GHOST_TIME = 1.2;
/** How long the "lost a life" blink lasts before you can steer again. */
const RESPAWN_BLINK = 0.9;
/** "3-2-1" after resuming. */
const COUNTDOWN = 1.5;
/** Story levels save a snapshot this often while playing. */
const AUTOSAVE_EVERY = 3;

export interface PlayHooks {
  /** Story chapter number, if this is a Story level. */
  chapterId?: number;
  /** Chapter cleared or boss defeated. */
  onWin?(scene: PlayScene): void;
  /** Out of lives (Story). */
  onOut?(scene: PlayScene): void;
  /** Leave to the map or home (from the pause menu). */
  onQuit?(scene: PlayScene): void;
  /** Restart this level from scratch. */
  onRestart?(scene: PlayScene): void;
  /** A saved snapshot to resume from. */
  resume?: unknown;
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
  private musicBtn = new MusicButton();
  private pauseRect = { x: 0, y: 0, w: 13, h: 12 };
  private gameOverShown = false;
  private autosaveT = 0;
  /** What state to go back to when the pause menu closes. */
  private pausedFrom: PlayState | null = null;

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
    this.app.audio.music(this.level.music);
    if (this.hooks.resume !== undefined && this.restore(this.hooks.resume)) {
      // Back from a saved game: open paused, so nothing happens until you're ready.
      this.pausedFrom = 'playing';
      // Frozen under the menu (no "press a direction" panel); RESUME runs the 3-2-1.
      this.setState('countdown');
      this.app.scenes.push(new PauseScene(this.app, this, 'WELCOME BACK'));
    }
  }

  // ---- saving mid-level -----------------------------------------------------------

  snapshot(): LevelSnapshot {
    return snapshotLevel(this.world, this.boss, this.livesLostThisFight, this.hintTime);
  }

  /** Put a snapshot back. Returns false (and keeps a fresh level) if it doesn't look right. */
  restore(data: unknown): boolean {
    try {
      const extra = restoreLevel(this.world, this.boss, data);
      if (!extra) return false;
      this.livesLostThisFight = extra.livesLost;
      this.hintTime = extra.hint;
      this.refreshBossRules();
      return true;
    } catch {
      this.reset();
      return false;
    }
  }

  /** Story only: write the mid-level snapshot so closing the tab loses nothing. */
  saveSnapshot(): void {
    const id = this.hooks.chapterId;
    if (!id) return;
    if (this.state !== 'playing' && this.state !== 'ready' && this.state !== 'countdown') return;
    this.app.save.data.story.resume = { chapter: id, data: this.snapshot() };
    this.app.save.save();
  }

  private clearSnapshot(): void {
    if (!this.hooks.chapterId) return;
    this.app.save.data.story.resume = null;
    this.app.save.save();
  }

  // ---- pause ----------------------------------------------------------------------

  pause(): void {
    if (this.state !== 'playing' && this.state !== 'ready' && this.state !== 'countdown') return;
    if (this.app.scenes.top !== this) return;
    this.pausedFrom = this.state === 'countdown' ? 'playing' : this.state;
    this.saveSnapshot();
    this.app.scenes.push(new PauseScene(this.app, this));
  }

  resumeFromPause(): void {
    if (this.pausedFrom === 'playing') this.setState('countdown');
    this.pausedFrom = null;
  }

  restartLevel(): void {
    this.clearSnapshot();
    if (this.hooks.onRestart) this.hooks.onRestart(this);
    else {
      this.app.scenes.pop();
      this.reset();
    }
  }

  quit(): void {
    if (this.hooks.onQuit) this.hooks.onQuit(this);
    else this.app.scenes.go(new HomeScene(this.app));
  }

  /** The tab was hidden or the page is closing: pause and save. */
  onHidden(): void {
    this.saveSnapshot();
    this.pause();
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
    this.gameOverShown = false;
    this.best = this.app.save.data.classic.best;
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
    if (this.state === 'countdown') {
      queueTurn(this.world.snake, dir);
      return;
    }
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
      if (this.hooks.onOut) return; // the Out of Lives screen takes over
      else {
        this.lives = freshLives();
        this.reset();
      }
    }
  }

  onAction(action: Action, repeat: boolean): void {
    if ((action === 'back' || action === 'pause') && !repeat) {
      if (this.state === 'dead' || this.state === 'won' || this.state === 'out') return;
      this.pause();
      return;
    }
    if (this.state === 'dead' || this.state === 'won' || this.state === 'out') {
      if (!repeat && (action === 'confirm' || ACTION_DIR[action])) this.continueAfterEnd();
      return;
    }
    const dir = ACTION_DIR[action];
    if (dir && !repeat) this.steer(dir);
    else if (action === 'confirm' && this.state === 'ready') this.steer(this.world.snake.dir);
  }

  onPointerDown(p: PointerInfo): void {
    if (this.musicBtn.hit(p.x, p.y)) {
      this.app.toggleMusic();
      return;
    }
    const pr = this.pauseRect;
    if (p.x >= pr.x - 3 && p.x < pr.x + pr.w + 3 && p.y >= pr.y - 2 && p.y < pr.y + pr.h + 4) {
      this.pause();
      return;
    }
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
    if (this.state === 'dead' && !this.gameOverShown && this.stateTime > 0.75) {
      this.gameOverShown = true;
      const prevBest = this.app.save.data.classic.best;
      const score = this.world.points;
      const newBest = score > prevBest;
      if (newBest) {
        this.app.save.data.classic.best = score;
        this.app.save.save();
      }
      this.app.scenes.push(new GameOverScene(this.app, score, Math.max(prevBest, score), newBest));
    }
    if (this.state === 'out' && this.hooks.onOut && !this.gameOverShown && this.stateTime > 0.8) {
      this.gameOverShown = true;
      this.hooks.onOut(this);
    }
    if (this.state === 'countdown' && this.stateTime >= COUNTDOWN) this.setState('playing');
    if (this.state !== 'playing') return;

    this.autosaveT += dt;
    if (this.autosaveT >= AUTOSAVE_EVERY) {
      this.autosaveT = 0;
      this.saveSnapshot();
    }
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
        this.app.audio.sfx('eat');
        if (!this.isClassic) this.gainPoints(1, c);
        if (this.level.kind === 'chapter' && this.level.meterTarget && this.world.eaten >= this.level.meterTarget) this.clearChapter();
      } else if (e.type === 'crash') {
        this.crash(e.cause);
      }
    }
  }

  /** Write Story progress (lives, score) to the save. Classic keeps nothing mid-run. */
  persist(): void {
    if (!this.isClassic) this.app.save.save();
  }

  private clearChapter(): void {
    const { boardX, boardY } = this.app.renderer.layout;
    for (let i = 0; i < 4; i++) {
      this.fx.burst(boardX + 20 + i * 40, boardY + 40 + (i % 2) * 40, [BASE.Y, BASE.W, BASE.G, BASE.R], 20, 110, { life: 0.9 });
    }
    this.fx.flash('#ffd94a', 0.4);
    this.fx.shake(2, 0.3);
    this.app.audio.music(null);
    this.app.audio.jingle('jingle-clear');
    this.setState('won');
    this.clearSnapshot();
  }

  private gainPoints(n: number, at: { x: number; y: number }): void {
    const extra = addPoints(this.lives, n);
    this.persist();
    if (extra > 0) {
      this.fx.float('1UP!', at.x, at.y - 14, BASE.G);
      this.app.audio.sfx('oneUp');
    }
  }

  private crash(cause: string): void {
    const head = this.world.snake.cells[0];
    const c = this.cellCenter(head);
    this.fx.burst(c.x, c.y, [BASE.G, BASE.h, BASE.W], 24, 90);
    this.fx.shake(4, 0.4);
    this.fx.flash('#ffffff', 0.55);
    this.stepAcc = 0;
    this.app.audio.sfx('crash');
    if (this.isClassic) {
      this.best = Math.max(this.best, this.world.points);
      this.setState('dead');
      return;
    }
    this.livesLostThisFight++;
    if (cause === 'boss' && this.level.hint) this.hintTime = 3;
    const result = loseLife(this.lives);
    this.persist();
    if (result === 'out') {
      this.app.audio.jingle('jingle-game-over');
      this.setState('out');
      this.clearSnapshot();
      return;
    }
    this.app.audio.sfx('lifeLost');
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
          this.app.audio.sfx('telegraph');
          this.fx.burst(c.x, c.y, ['#9a6a3e', '#5a3622'], 6, 30, { gravity: 120, life: 0.4 });
          break;
        case 'surface':
          this.fx.burst(c.x, c.y, ['#9a6a3e', '#5a3622', '#c2c3c7'], 10, 50, { gravity: 160 });
          this.fx.shake(1, 0.1);
          this.app.audio.sfx('surface');
          break;
        case 'coiled':
          this.app.audio.sfx('coilHit');
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
          this.app.audio.sfx('bossDefeat');
          this.app.audio.music(null);
          setTimeout(() => this.app.audio.jingle('jingle-victory'), 700);
          this.setState('won');
          this.clearSnapshot();
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

  /** Debug: clear the level right now (chapter meter full, or boss defeated). */
  debugWin(): void {
    if (this.state !== 'playing' && this.state !== 'ready') return;
    if (this.level.kind === 'chapter') {
      this.world.eaten = this.level.meterTarget ?? 0;
      this.clearChapter();
    } else if (this.boss instanceof Grub) {
      this.boss.s.health = 0;
      this.boss.s.mode = 'defeated';
      this.handleBoss([{ type: 'defeated', at: this.world.snake.cells[0] }]);
    }
  }

  /** Debug: lose a life as if Pip crashed. */
  debugCrash(): void {
    if (this.state === 'playing' || this.state === 'ready') this.crash('wall');
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
    if (this.boss) drawBoss(r, this.boss, this.t, this.world.snake.cells);

    const alpha =
      this.state === 'playing' || this.state === 'countdown' ? Math.min(1, this.stepAcc / this.stepMs) : this.state === 'ready' && !this.respawning ? 1 : 0;
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
    r.text(`x${this.lives.lives}`, L.boardX + 8, L.hudY, { color: '#fff1e8' });
    r.text(String(this.lives.score).padStart(4, '0'), L.boardX + 34, L.hudY, { color: BASE.Y });
    if (this.level.kind === 'chapter' && this.level.meterTarget) {
      drawMeter(r, L.boardX + BOARD_PX_W - 88, L.hudY, 88, this.world.eaten, this.level.meterTarget, BASE.R, 'FRUIT');
    }
    if (this.boss) {
      const bars = this.boss.bars();
      const area = 88;
      const w = area / bars.length;
      bars.forEach((b, i) => drawMeter(r, L.boardX + BOARD_PX_W - area + i * w, L.hudY, w - (bars.length > 1 ? 3 : 0), b.health, b.max, b.color, bars.length > 1 ? undefined : b.label));
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
    const cy = L.boardY + BOARD_PX_H / 2;
    const pw = 152;
    const blink = Math.floor(this.t * 2) % 2 === 0;
    const go = L.touch ? 'TAP TO CONTINUE' : 'PRESS ENTER';

    if (this.state === 'ready') {
      if (this.respawning) {
        if (this.stateTime >= RESPAWN_BLINK && blink) r.text(L.touch ? 'TAP AN ARROW' : 'PRESS A DIRECTION', cx, L.boardY + BOARD_PX_H - 14, { align: 'center' });
      } else {
        r.panel(cx - pw / 2, cy - 14, pw, 28);
        r.text(this.level.title, cx, cy - 8, { align: 'center', color: BASE.Y });
        if (blink) r.text(L.touch ? 'TAP AN ARROW' : 'PRESS A DIRECTION', cx, cy + 3, { align: 'center' });
      }
    } else if (this.state === 'out' && !this.hooks.onOut && this.stateTime > 0.5) {
      r.panel(cx - pw / 2, cy - 22, pw, 44);
      r.text('OUT OF LIVES', cx, cy - 15, { align: 'center', color: BASE.R });
      r.text('BACK TO CHECKPOINT', cx, cy - 3, { align: 'center' });
      if (blink) r.text(go, cx, cy + 9, { align: 'center', color: '#c2c3c7' });
    } else if (this.state === 'won' && this.stateTime > 0.8) {
      r.panel(cx - pw / 2, cy - 22, pw, 44);
      const title = this.boss ? `${this.boss.bars()[0].label} DEFEATED!` : 'CHAPTER CLEAR!';
      r.text(title, cx, cy - 15, { align: 'center', color: BASE.Y });
      r.text(`SCORE ${this.lives.score}`, cx, cy - 3, { align: 'center' });
      if (blink) r.text(go, cx, cy + 9, { align: 'center', color: '#c2c3c7' });
    }

    if (this.hintTime > 0 && this.level.hint && (this.state === 'playing' || this.state === 'ready')) {
      const a = Math.min(1, this.hintTime * 2);
      const lines = this.level.hint.split('\n');
      const w = Math.max(...lines.map((l) => r.measure(l))) + 12;
      const h = lines.length * 10 + 5;
      const y = L.boardY + BOARD_PX_H - h - 4;
      r.ctx.globalAlpha = a;
      r.panel(cx - w / 2, y, w, h, '#2a1a3a', BASE.Y, 0.9 * a);
      r.ctx.globalAlpha = 1;
      lines.forEach((l, i) => r.text(l, cx, y + 4 + i * 10, { align: 'center', color: BASE.Y, alpha: a }));
    }
    if (this.invincible) r.text('INVINCIBLE', L.boardX + 2, L.boardY + 2, { color: BASE.C, size: 8 });
    this.musicBtn.place(L.w);
    this.musicBtn.draw(r, this.app.musicOn);
    // Pause button, left of the music button.
    this.pauseRect = { x: L.w - 31, y: 2, w: 13, h: 12 };
    r.rect(this.pauseRect.x, 2, 13, 12, '#0b0b14', 0.5);
    r.sprite('pauseIcon', SPRITES.pauseIcon, this.pauseRect.x + 4, 4);
    if (this.state === 'countdown') {
      // 3, 2, 1, each for a third of the countdown.
      const n = Math.max(1, 3 - Math.floor((this.stateTime / COUNTDOWN) * 3));
      r.text(String(n), L.boardX + BOARD_PX_W / 2, L.boardY + BOARD_PX_H / 2 - 8, { align: 'center', size: 16, color: BASE.Y });
    }
  }
}
