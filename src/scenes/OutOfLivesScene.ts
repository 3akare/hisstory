import { BASE } from '../art/palettes';
import { Scene } from '../engine/scenes';
import { Action, PointerInfo } from '../engine/input';
import { Menu } from '../engine/ui';
import { BOARD_PX_H, BOARD_PX_W } from '../engine/renderer';
import type { App } from '../app';
import { chapter } from '../game/chapters';

/** Story: out of lives. You go back to your checkpoint with 3 fresh lives. */
export class OutOfLivesScene extends Scene {
  readonly name = 'outoflives';
  overlay = true;
  private t = 0;
  private menu: Menu;

  constructor(
    app: App,
    readonly checkpoint: number,
    onContinue: () => void,
  ) {
    super(app);
    this.menu = new Menu([{ label: 'CONTINUE', onPress: () => this.t > 0.5 && onContinue() }]);
  }

  onAction(a: Action, repeat: boolean): void {
    if (!repeat && (a === 'confirm' || a === 'back')) this.menu.confirm();
  }

  onPointerDown(p: PointerInfo): void {
    if (!this.menu.press(p.x, p.y)) this.menu.confirm();
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(): void {
    const r = this.app.renderer;
    const L = r.layout;
    r.applyTransform(false);
    r.rect(0, 0, L.w, L.h, '#06060c', Math.min(0.6, this.t * 2));
    const cx = L.boardX + BOARD_PX_W / 2;
    const cy = L.boardY + BOARD_PX_H / 2;
    const pw = 152;
    const ph = 86;
    const py = cy - ph / 2 + Math.round((1 - Math.min(1, this.t * 5)) * 12);
    r.panel(cx - pw / 2, py, pw, ph, '#1a0f1a', BASE.R);
    r.text('OUT OF LIVES', cx, py + 8, { align: 'center', color: BASE.R });
    r.text('BACK TO CHECKPOINT', cx, py + 22, { align: 'center', color: '#c2c3c7' });
    r.text(`CH${this.checkpoint} ${chapter(this.checkpoint).name}`, cx, py + 34, { align: 'center', color: BASE.Y, font: 'dialog', size: 8 });
    r.text('WITH 3 LIVES', cx, py + 46, { align: 'center', color: '#fff1e8', font: 'dialog', size: 8 });
    this.menu.layout(cx, py + 60, 96, 18, 4);
    this.menu.draw(r, this.t, BASE.Y);
  }
}
