import { BASE } from '../art/palettes';
import { Scene } from '../engine/scenes';
import { Action, PointerInfo } from '../engine/input';
import { Menu } from '../engine/ui';
import { BOARD_PX_H, BOARD_PX_W } from '../engine/renderer';
import type { App } from '../app';
import { CLASSIC_LEVEL } from '../game/level';
import { HomeScene } from './HomeScene';
import { PlayScene } from './PlayScene';

/** Classic's end screen: score, best, "New best!", Retry / Home. Drawn over the frozen game. */
export class GameOverScene extends Scene {
  readonly name = 'gameover';
  overlay = true;
  private t = 0;
  private menu: Menu;

  constructor(
    app: App,
    readonly score: number,
    readonly best: number,
    readonly newBest: boolean,
  ) {
    super(app);
    this.menu = new Menu(
      [
        { label: 'RETRY', onPress: () => this.go('retry') },
        { label: 'HOME', onPress: () => this.go('home') },
      ],
      () => this.app.audio.sfx('menuMove'),
    );
  }

  enter(): void {
    this.app.audio.jingle(this.newBest ? 'jingle-new-best' : 'jingle-game-over');
  }

  private go(where: 'retry' | 'home'): void {
    if (this.t < 0.4) return;
    this.app.audio.sfx('menuConfirm');
    this.app.scenes.go(where === 'retry' ? new PlayScene(this.app, CLASSIC_LEVEL) : new HomeScene(this.app));
  }

  onAction(a: Action, repeat: boolean): void {
    if (repeat) return;
    if (a === 'up' || a === 'left') this.menu.move(-1);
    else if (a === 'down' || a === 'right') this.menu.move(1);
    else if (a === 'confirm') this.menu.confirm();
    else if (a === 'back') this.go('home');
  }

  onPointerDown(p: PointerInfo): void {
    this.menu.press(p.x, p.y);
  }

  onPointerMove(p: PointerInfo): void {
    this.menu.hover(p.x, p.y);
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(): void {
    const r = this.app.renderer;
    const L = r.layout;
    r.applyTransform(false);
    r.rect(0, 0, L.w, L.h, '#06060c', Math.min(0.55, this.t * 2));
    const cx = L.boardX + BOARD_PX_W / 2;
    const cy = L.boardY + BOARD_PX_H / 2;
    const pop = Math.min(1, this.t * 5);
    const pw = 148;
    const ph = 100;
    const py = cy - ph / 2 + Math.round((1 - pop) * 12);
    r.panel(cx - pw / 2, py, pw, ph);
    r.text('GAME OVER', cx, py + 8, { align: 'center', color: BASE.R, size: 8 });
    r.text(`SCORE ${this.score}`, cx, py + 22, { align: 'center' });
    if (this.newBest) {
      if (Math.floor(this.t * 4) % 2 === 0) r.text('NEW BEST!', cx, py + 34, { align: 'center', color: BASE.Y });
    } else {
      r.text(`BEST ${this.best}`, cx, py + 34, { align: 'center', color: '#c2c3c7' });
    }
    this.menu.layout(cx, py + 48, 96, 18, 4);
    this.menu.draw(r, this.t);
  }
}
