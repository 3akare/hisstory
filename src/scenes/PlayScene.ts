import { BASE, BiomeId, BIOMES } from '../art/palettes';
import { Scene } from '../engine/scenes';
import { Action, ACTION_DIR, dpadDir, PointerInfo } from '../engine/input';
import { Fx } from '../engine/fx';
import { TILE } from '../engine/renderer';
import type { App } from '../app';
import { Dir } from '../game/board';
import { queueTurn } from '../game/snake';
import { classicStepMs, World, WorldEvent } from '../game/world';
import { drawBoard, drawFruit, drawSnake, PIP_LOOK, WHITE_LOOK } from './draw';
import { drawDpad, drawHudBar } from './hud';

type PlayState = 'ready' | 'playing' | 'dead';

/** Classic mode: endless snake, one life, chase the best score. */
export class PlayScene extends Scene {
  readonly name = 'play';
  world!: World;
  fx = new Fx();
  biome: BiomeId = 'orchard';
  state: PlayState = 'ready';
  private stepAcc = 0;
  private t = 0;
  private deadTime = 0;
  private dpadPressed: Dir | null = null;
  private dpadPointer: number | null = null;
  best = 0;

  constructor(app: App) {
    super(app);
  }

  enter(): void {
    this.reset();
  }

  reset(): void {
    this.world = new World({ seed: this.app.debug && this.app.params.has('seed') ? Number(this.app.params.get('seed')) : undefined });
    this.state = 'ready';
    this.stepAcc = 0;
    this.deadTime = 0;
    this.fx.clear();
  }

  get stepMs(): number {
    return classicStepMs(this.world.eaten);
  }

  // ---- input ---------------------------------------------------------------

  private steer(dir: Dir): void {
    if (this.state === 'dead') return;
    if (this.state === 'ready') {
      // The first press starts the run (any direction except straight back).
      if (dir === 'L') return;
      this.state = 'playing';
    }
    queueTurn(this.world.snake, dir);
  }

  onAction(action: Action, repeat: boolean): void {
    if (this.state === 'dead') {
      if (!repeat && this.deadTime > 0.6 && (action === 'confirm' || ACTION_DIR[action])) this.reset();
      return;
    }
    const dir = ACTION_DIR[action];
    if (dir && !repeat) this.steer(dir);
    else if (action === 'confirm' && this.state === 'ready') this.steer('R');
  }

  onPointerDown(p: PointerInfo): void {
    if (this.state === 'dead') {
      if (this.deadTime > 0.6) this.reset();
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
    this.fx.update(dt);
    this.world.tick(dt);
    if (this.state === 'dead') {
      this.deadTime += dt;
      return;
    }
    if (this.state !== 'playing') return;
    this.stepAcc += dt * 1000;
    // Usually one step at most per update; the loop guards against huge catch-ups.
    while (this.stepAcc >= this.stepMs && this.state === 'playing') {
      this.stepAcc -= this.stepMs;
      this.handle(this.world.step());
    }
  }

  private cellCenter(x: number, y: number): { x: number; y: number } {
    const { boardX, boardY } = this.app.renderer.layout;
    return { x: boardX + x * TILE + 4, y: boardY + y * TILE + 4 };
  }

  private handle(events: WorldEvent[]): void {
    for (const e of events) {
      if (e.type === 'eat') {
        const c = this.cellCenter(e.fruit.x, e.fruit.y);
        this.fx.burst(c.x, c.y, [BASE.R, BASE.Y, BASE.W, BASE.O], 14, 70);
        this.fx.float('+1', c.x, c.y - 6, BASE.Y);
        this.fx.shake(1, 0.08);
      } else if (e.type === 'crash') {
        this.state = 'dead';
        this.stepAcc = 0;
        const head = this.world.snake.cells[0];
        const c = this.cellCenter(head.x, head.y);
        this.fx.burst(c.x, c.y, [BASE.G, BASE.h, BASE.W], 24, 90);
        this.fx.shake(4, 0.4);
        this.fx.flash('#ffffff', 0.5);
        this.best = Math.max(this.best, this.world.points);
      }
    }
  }

  // ---- drawing -----------------------------------------------------------------

  draw(): void {
    const r = this.app.renderer;
    const L = r.layout;
    const off = this.fx.shakeOffset();
    r.offsetX = off.x;
    r.offsetY = off.y;
    r.begin(BIOMES[this.biome].backdrop);

    drawHudBar(r, this.biome);
    r.text(`SCORE ${String(this.world.points).padStart(3, '0')}`, L.boardX, L.hudY, { color: '#fff1e8' });
    r.text(`BEST ${String(Math.max(this.best, this.world.points)).padStart(3, '0')}`, L.boardX + 192, L.hudY, { align: 'right', color: BASE.Y });

    drawBoard(r, this.world.board, this.biome, this.t);
    drawFruit(r, this.world.fruits, this.t, this.biome);
    const alpha = this.state === 'playing' ? Math.min(1, this.stepAcc / this.stepMs) : this.state === 'dead' ? 0 : 1;
    const flicker = this.state === 'dead' && Math.floor(this.deadTime * 10) % 2 === 0 && this.deadTime < 0.8;
    drawSnake(r, this.world.snake, alpha, flicker ? WHITE_LOOK : PIP_LOOK, this.t);
    this.fx.drawParticles(r);

    r.offsetX = 0;
    r.offsetY = 0;
    r.applyTransform();
    drawDpad(r, this.dpadPressed);

    const cx = L.boardX + 96;
    const cy = L.boardY + 72;
    if (this.state === 'ready') {
      const blink = Math.floor(this.t * 2) % 2 === 0;
      r.panel(cx - 80, cy - 14, 160, 28);
      r.text('CLASSIC', cx, cy - 8, { align: 'center', color: BASE.Y });
      if (blink) r.text(L.touch ? 'TAP AN ARROW' : 'PRESS A DIRECTION', cx, cy + 3, { align: 'center' });
    } else if (this.state === 'dead' && this.deadTime > 0.5) {
      r.panel(cx - 80, cy - 22, 160, 44);
      r.text('GAME OVER', cx, cy - 15, { align: 'center', color: BASE.R });
      r.text(`SCORE ${this.world.points}`, cx, cy - 3, { align: 'center' });
      if (Math.floor(this.t * 2) % 2 === 0) r.text(L.touch ? 'TAP TO RETRY' : 'PRESS ENTER', cx, cy + 9, { align: 'center', color: '#c2c3c7' });
    }
    this.fx.drawFlash(r);
  }
}
