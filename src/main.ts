import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import { App } from './app';
import { PlayScene } from './scenes/PlayScene';
import { FONT_DIALOG, FONT_PIXEL } from './engine/renderer';

declare global {
  interface Window {
    /** Read-only peek at the game for automated tests and debugging. */
    __HISSTORY__?: () => Record<string, unknown>;
  }
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  // Wait for the pixel fonts so text never flashes in the wrong font.
  try {
    await Promise.all([document.fonts.load(`8px ${FONT_PIXEL}`), document.fonts.load(`10px ${FONT_DIALOG}`)]);
  } catch {
    /* fonts are a nicety; keep going */
  }
  const app = new App(canvas);
  const play = new PlayScene(app);
  app.scenes.go(play, true);
  app.loop.start();
  canvas.focus();

  window.__HISSTORY__ = () => {
    const s = app.scenes.current;
    const info: Record<string, unknown> = { scene: s?.name, top: app.scenes.top?.name };
    if (s instanceof PlayScene) {
      info.state = s.state;
      info.length = s.world.snake.cells.length;
      info.points = s.world.points;
      info.head = s.world.snake.cells[0];
      info.dir = s.world.snake.dir;
    }
    return info;
  };
}

boot();
