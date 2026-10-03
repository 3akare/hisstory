import { BASE, BIOMES } from '../art/palettes';
import { Scene } from '../engine/scenes';
import { Action, PointerInfo } from '../engine/input';
import { Menu, MusicButton } from '../engine/ui';
import type { App } from '../app';
import { ATTRACT_MAX_LENGTH, chooseDir } from '../game/attractAI';
import { bossLevel, CLASSIC_LEVEL } from '../game/level';
import { World } from '../game/world';
import { drawBoard, drawFruit, drawSnake } from './draw';
import { PlayScene } from './PlayScene';

const ATTRACT_STEP_MS = 105;

/** Where the title, menu and footer sit. Phones get the buttons low, near the thumb. */
export function homeLayout(portrait: boolean, h: number): { title: number; menu: number; foot: number } {
  return portrait ? { title: 66, menu: 184, foot: h - 64 } : { title: 14, menu: 54, foot: 110 };
}

/**
 * The title screen: a self-playing snake under a dark overlay, the HISSTORY
 * logo, Story / Classic, and the music toggle. The snake song starts on the
 * first key press or tap (browsers block sound until then).
 */
export class HomeScene extends Scene {
  readonly name = 'home';
  private demo!: World;
  private stepAcc = 0;
  private t = 0;
  private menu: Menu;
  private music = new MusicButton();

  constructor(app: App) {
    super(app);
    this.menu = new Menu(
      [
        { label: 'STORY', onPress: () => this.start('story') },
        { label: 'CLASSIC', onPress: () => this.start('classic') },
      ],
      () => this.app.audio.sfx('menuMove'),
    );
  }

  enter(): void {
    this.newDemo();
    this.app.audio.music('theme');
  }

  private newDemo(): void {
    this.demo = new World({ startLength: 5, fruitCount: 2, start: { x: 4, y: 3 }, startDir: 'R' });
    this.stepAcc = 0;
  }

  private start(mode: 'story' | 'classic'): void {
    this.app.audio.sfx('menuConfirm');
    // Story mode's chapter map arrives in the next slice; for now Story opens the Grub fight.
    const level = mode === 'classic' ? CLASSIC_LEVEL : bossLevel('grub');
    this.app.scenes.go(new PlayScene(this.app, level));
  }

  onAction(a: Action, repeat: boolean): void {
    if (a === 'up') this.menu.move(-1);
    else if (a === 'down') this.menu.move(1);
    else if (a === 'confirm' && !repeat) this.menu.confirm();
  }

  onPointerDown(p: PointerInfo): void {
    if (this.music.hit(p.x, p.y)) {
      this.app.toggleMusic();
      return;
    }
    this.menu.press(p.x, p.y);
  }

  onPointerMove(p: PointerInfo): void {
    this.menu.hover(p.x, p.y);
  }

  update(dt: number): void {
    this.t += dt;
    this.demo.tick(dt);
    this.stepAcc += dt * 1000;
    while (this.stepAcc >= ATTRACT_STEP_MS) {
      this.stepAcc -= ATTRACT_STEP_MS;
      const s = this.demo.snake;
      s.queue = [];
      const d = chooseDir(this.demo);
      if (d !== s.dir) s.queue.push(d);
      const ev = this.demo.step();
      if (ev.some((e) => e.type === 'crash') || s.cells.length > ATTRACT_MAX_LENGTH) this.newDemo();
    }
  }

  draw(): void {
    const r = this.app.renderer;
    const L = r.layout;
    r.begin(BIOMES.orchard.backdrop);
    // The demo game, then a dark veil over everything.
    drawBoard(r, this.demo.board, 'orchard', this.t);
    drawFruit(r, this.demo.fruits, this.t);
    drawSnake(r, this.demo.snake, Math.min(1, this.stepAcc / ATTRACT_STEP_MS), undefined, this.t);
    r.rect(0, 0, L.w, L.h, '#06060c', 0.62);

    const cx = L.w / 2;
    const P = homeLayout(L.portrait, L.h);
    this.drawTitle(cx, P.title);
    r.text('SNAKE HAS A STORY NOW', cx, P.title + 24, { align: 'center', color: '#c2c3c7', size: 8 });

    this.menu.layout(cx, P.menu, 112, 20, 6);
    this.menu.draw(r, this.t);

    const best = this.app.save.data.classic.best;
    if (!this.app.audio.unlocked && Math.floor(this.t * 1.5) % 2 === 0) {
      r.text(L.touch ? 'TAP FOR SOUND' : 'PRESS ANY KEY FOR SOUND', cx, P.foot, { align: 'center', color: BASE.Y });
    }
    if (best > 0) r.text(`CLASSIC BEST ${best}`, cx, P.foot + 12, { align: 'center', color: '#83769c' });
    if (!this.app.save.available) r.text('PROGRESS WON\'T BE SAVED', cx, P.foot + 24, { align: 'center', color: BASE.R });

    this.music.place(L.w);
    this.music.draw(r, this.app.musicOn);
  }

  /** "HISSTORY" with the SS in snake green, letters gently bobbing like a slither. */
  private drawTitle(cx: number, y: number): void {
    const r = this.app.renderer;
    const title = 'HISSTORY';
    const size = 16;
    const w = r.measure(title, size);
    let x = cx - w / 2;
    for (let i = 0; i < title.length; i++) {
      const ch = title[i];
      const bob = Math.round(Math.sin(this.t * 3 - i * 0.6) * 1.5);
      const green = i === 2 || i === 3;
      r.text(ch, x, y + bob, { size, color: green ? BASE.G : BASE.W, shadow: green ? '#1c5a22' : '#3b2d4f' });
      x += r.measure(ch, size);
    }
  }
}
