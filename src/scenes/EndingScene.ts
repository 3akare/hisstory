import { BASE, BIOMES } from '../art/palettes';
import { SPRITES } from '../art/sprites';
import { Scene } from '../engine/scenes';
import { Action, PointerInfo } from '../engine/input';
import { Fx } from '../engine/fx';
import { parseBoard } from '../game/board';
import type { App } from '../app';
import { drawBoard } from './draw';
import { HomeScene } from './HomeScene';

const CREDITS: [string, 'pixel' | 'dialog', string?][] = [
  ['THE ORCHARD', 'pixel', BASE.Y],
  ['BLOOMS AGAIN', 'pixel', BASE.Y],
  ['', 'dialog'],
  ['HISSTORY', 'pixel', BASE.G],
  ['Snake has a story now.', 'dialog'],
  ['', 'dialog'],
  ['STARRING', 'pixel', '#c2c3c7'],
  ['Pip, a small green snake', 'dialog'],
  ['', 'dialog'],
  ['WITH', 'pixel', '#c2c3c7'],
  ['Grub the Mole, Mira the Mole', 'dialog'],
  ['Viper, the Old Toad, the Crows', 'dialog'],
  ['and The Hollow King', 'dialog'],
  ['', 'dialog'],
  ['MADE BY HAND', 'pixel', '#c2c3c7'],
  ['Pixel art, chiptunes and code', 'dialog'],
  ['all written in TypeScript with', 'dialog'],
  ['Canvas and Web Audio', 'dialog'],
  ['', 'dialog'],
  ['SCORE', 'pixel', '#c2c3c7'],
  ['{score}', 'pixel', BASE.Y],
  ['', 'dialog'],
  ['', 'dialog'],
  ['THANKS FOR PLAYING!', 'pixel', BASE.G],
];

/** The ending: the orchard blooms, fruit rains down, credits roll. */
export class EndingScene extends Scene {
  readonly name = 'ending';
  private t = 0;
  private fx = new Fx();
  private board = parseBoard();

  constructor(app: App) {
    super(app);
  }

  enter(): void {
    this.app.audio.music(null);
    this.app.audio.jingle('jingle-victory');
    setTimeout(() => {
      if (this.app.scenes.current === this) this.app.audio.music('theme');
    }, 3200);
  }

  private get done(): boolean {
    return this.t > 4 + CREDITS.length * 1.05;
  }

  private leave(): void {
    if (this.t < 2) return;
    this.app.scenes.go(new HomeScene(this.app));
  }

  onAction(a: Action, repeat: boolean): void {
    if (!repeat && (a === 'confirm' || a === 'back')) this.leave();
  }

  onPointerDown(_p: PointerInfo): void {
    this.leave();
  }

  update(dt: number): void {
    this.t += dt;
    this.fx.update(dt);
    // Fruit and petals rain down over the orchard.
    const L = this.app.renderer.layout;
    if (Math.random() < dt * 6) {
      this.fx.burst(Math.random() * L.w, -4, [BASE.R, BASE.Y, BASE.W, BASE.M, BASE.G], 3, 10, { gravity: 30, life: 4, size: 2 });
    }
    if (this.done && this.t > 4 + CREDITS.length * 1.05 + 4) this.leave();
  }

  draw(): void {
    const r = this.app.renderer;
    const L = r.layout;
    r.begin(BIOMES.orchard.backdrop);
    drawBoard(r, this.board, 'orchard', this.t);
    // The orchard in full bloom: flowers and apples everywhere.
    for (let i = 0; i < 40; i++) {
      const x = L.boardX + ((i * 37) % 20) * 8;
      const y = L.boardY + ((i * 53) % 15) * 8;
      const bob = Math.sin(this.t * 2 + i) > 0.5 ? -1 : 0;
      r.sprite(i % 3 === 0 ? 'apple' : 'flower', i % 3 === 0 ? SPRITES.apple : SPRITES.flower, x, y + bob);
    }
    r.rect(0, 0, L.w, L.h, '#06060c', 0.45);
    this.fx.drawParticles(r);

    // Rolling credits.
    const score = String(this.app.save.data.story.score);
    const cx = L.w / 2;
    const scroll = Math.max(0, this.t - 2.5) * 12;
    CREDITS.forEach(([text, font, color], i) => {
      const y = Math.round(L.h * 0.7 - scroll + i * 12);
      if (y < -12 || y > L.h + 12) return;
      const fade = Math.min(1, Math.min(y, L.h - y) / 20);
      r.text(text.replace('{score}', score), cx, y, { align: 'center', font, size: font === 'dialog' ? 10 : 8, color: color ?? '#fff1e8', alpha: Math.max(0, fade) });
    });
    // Pip, happy, at the bottom.
    r.sprite('pipHead', SPRITES.pipHead, cx - 4, L.h - 14 + (Math.floor(this.t * 4) % 2), 'orchard');
    if (this.t > 3 && Math.floor(this.t * 1.5) % 2 === 0) r.text(L.touch ? 'TAP TO FINISH' : 'PRESS ENTER', L.w - 4, L.h - 10, { align: 'right', color: '#83769c', font: 'dialog', size: 8 });
  }
}
