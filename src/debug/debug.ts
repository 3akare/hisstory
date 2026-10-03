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
  });
  window.__HISSTORY_DEBUG__ = {
    wrapBoss: () => play()?.debugWrapBoss() ?? false,
    invincible: (on: boolean) => {
      const p = play();
      if (p) p.invincible = on;
    },
  };
}
