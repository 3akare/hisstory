import { BASE } from '../art/palettes';
import { Scene } from '../engine/scenes';
import { Action, PointerInfo } from '../engine/input';
import { Menu, MenuItem } from '../engine/ui';
import { BOARD_PX_H, BOARD_PX_W } from '../engine/renderer';
import type { App } from '../app';
import type { PlayScene } from './PlayScene';

/**
 * Pause menu over the frozen game: Resume, Restart, Quit, Music.
 * Resuming counts down 3-2-1 so you never come back straight into a crash.
 */
export class PauseScene extends Scene {
  readonly name = 'pause';
  overlay = true;
  private t = 0;
  private menu: Menu;
  private closing = false;

  constructor(
    app: App,
    private play: PlayScene,
    readonly title = 'PAUSED',
  ) {
    super(app);
    const items: MenuItem[] = [
      { label: 'RESUME', onPress: () => this.resume() },
      { label: 'RESTART', onPress: () => this.act(() => this.play.restartLevel()) },
      { label: play.isClassic ? 'QUIT' : 'MAP', onPress: () => this.act(() => this.play.quit()) },
      { label: this.musicLabel(), onPress: () => this.toggleMusic() },
    ];
    this.menu = new Menu(items, () => this.app.audio.sfx('menuMove'));
  }

  private musicLabel(): string {
    return this.app.musicOn ? 'MUSIC: ON' : 'MUSIC: OFF';
  }

  private toggleMusic(): void {
    this.app.toggleMusic();
    this.menu.items[3].label = this.musicLabel();
  }

  enter(): void {
    this.app.audio.sfx('pause');
  }

  private act(fn: () => void): void {
    if (this.closing) return;
    this.closing = true;
    this.app.audio.sfx('menuConfirm');
    fn();
  }

  resume(): void {
    if (this.closing) return;
    this.closing = true;
    this.app.audio.sfx('menuConfirm');
    this.app.scenes.pop();
    this.play.resumeFromPause();
  }

  onAction(a: Action, repeat: boolean): void {
    if (repeat) return;
    if (a === 'up') this.menu.move(-1);
    else if (a === 'down') this.menu.move(1);
    else if (a === 'confirm') this.menu.confirm();
    else if (a === 'pause' || a === 'back') this.resume();
  }

  onAnyKey(): void {}

  onPointerDown(p: PointerInfo): void {
    if (!this.menu.press(p.x, p.y) && this.app.renderer.layout.touch) {
      // Tapping outside the menu does nothing (avoids accidental resumes).
    }
  }

  onPointerMove(p: PointerInfo): void {
    this.menu.hover(p.x, p.y);
  }

  update(dt: number): void {
    this.t += dt;
    this.menu.items[3].label = this.musicLabel();
  }

  draw(): void {
    const r = this.app.renderer;
    const L = r.layout;
    r.applyTransform(false);
    r.rect(0, 0, L.w, L.h, '#06060c', Math.min(0.6, this.t * 3));
    const cx = L.boardX + BOARD_PX_W / 2;
    const cy = L.boardY + BOARD_PX_H / 2;
    const pw = 128;
    const ph = 114;
    const py = Math.round(cy - ph / 2);
    r.panel(cx - pw / 2, py, pw, ph);
    r.text(this.title, cx, py + 7, { align: 'center', color: BASE.Y });
    this.menu.layout(cx, py + 20, 108, 18, 4);
    this.menu.draw(r, this.t);
  }
}
