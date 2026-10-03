import type { App } from '../app';
import { PlayScene } from '../scenes/PlayScene';

declare global {
  interface Window {
    /** Debug controls (only with ?debug=1), used by tests and for recording the demo. */
    __HISSTORY_DEBUG__?: Record<string, (...args: never[]) => unknown>;
  }
}

/**
 * Developer tools, loaded only with ?debug=1:
 *   I  toggle invincibility (bosses and hazards can't hurt you)
 *   K  wrap Pip around the boss (runs the real coil check)
 *   O  show the coil target overlay
 *   N  clear the current level (win)
 */
export function installDebug(app: App): void {
  if (!app.debug) return;
  const play = (): PlayScene | null => (app.scenes.current instanceof PlayScene ? app.scenes.current : null);
  window.addEventListener('keydown', (e) => {
    const p = play();
    if (!p) return;
    if (e.code === 'KeyI') p.invincible = !p.invincible;
    if (e.code === 'KeyK') p.debugWrapBoss();
    if (e.code === 'KeyO') p.showPockets = !p.showPockets;
    if (e.code === 'KeyN') p.debugWin();
  });
  window.__HISSTORY_DEBUG__ = {
    wrapBoss: () => play()?.debugWrapBoss() ?? false,
    /** Put an apple two cells in front of Pip. */
    fruitAhead: () => {
      const p = play();
      if (!p) return false;
      const s = p.world.snake;
      const v = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[s.dir];
      const h = s.cells[0];
      p.world.fruits = [{ kind: 'apple', x: h.x + v[0] * 2, y: h.y + v[1] * 2, age: 1 }];
      return true;
    },
    resetSave: () => app.save.reset(),
    win: () => play()?.debugWin(),
    crash: () => play()?.debugCrash(),
    invincible: (on: boolean) => {
      const p = play();
      if (p) p.invincible = on;
    },
  };
}
