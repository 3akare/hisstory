import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import { App } from './app';
import { PlayScene } from './scenes/PlayScene';
import { HomeScene } from './scenes/HomeScene';
import { openMap, playChapter } from './scenes/story';
import { normalizeCheckpoint } from './game/progress';
import { CutsceneScene } from './scenes/CutsceneScene';
import { ChapterMapScene } from './scenes/ChapterMapScene';
import { bossLevel, CLASSIC_LEVEL } from './game/level';
import { Grub } from './game/bosses/grub';
import { MiraGrub } from './game/bosses/miraGrub';
import { Viper } from './game/bosses/viper';
import { HollowKing } from './game/bosses/hollowKing';
import { installDebug } from './debug/debug';
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
  normalizeCheckpoint(app.save.data.story);
  // Debug shortcuts: ?debug=1&boss=grub, ?debug=1&scene=classic|map, ?debug=1&chapter=N
  const bossParam = app.debug ? app.params.get('boss') : null;
  const sceneParam = app.debug ? app.params.get('scene') : null;
  const chapterParam = app.debug ? Number(app.params.get('chapter')) : 0;
  if (chapterParam >= 1 && chapterParam <= 10) playChapter(app, chapterParam, true);
  else if (bossParam === 'grub') app.scenes.go(new PlayScene(app, bossLevel('grub')), true);
  else if (sceneParam === 'classic') app.scenes.go(new PlayScene(app, CLASSIC_LEVEL), true);
  else if (sceneParam === 'map') openMap(app);
  else app.scenes.go(new HomeScene(app), true);
  installDebug(app);
  app.loop.start();
  canvas.focus();

  window.__HISSTORY__ = () => {
    const s = app.scenes.current;
    const info: Record<string, unknown> = {
      scene: s?.name,
      top: app.scenes.top?.name,
      layout: app.renderer.layout,
      music: app.audio.current,
      musicOn: app.musicOn,
      audio: app.audio.ctx?.state ?? 'locked',
      best: app.save.data.classic.best,
      saveAvailable: app.save.available,
    };
    if (s instanceof PlayScene) {
      info.state = s.state;
      info.length = s.world.snake.cells.length;
      info.points = s.world.points;
      info.head = s.world.snake.cells[0];
      info.dir = s.world.snake.dir;
      info.lives = s.lives.lives;
      info.score = s.lives.score;
      if (s.boss) info.bossHealth = s.boss.bars().map((b) => b.health);
      if (s.boss instanceof Grub) info.bossMode = s.boss.s.mode;
      if (s.boss instanceof MiraGrub) {
        info.miraMode = s.boss.m.mode;
        info.bossMode = s.boss.grub.s.mode;
      }
      if (s.boss instanceof Viper) info.viperMode = s.boss.v.mode;
      if (s.boss instanceof HollowKing) {
        info.kingPhase = s.boss.k.phase;
        info.kingMode = s.boss.k.mode;
        info.kingLanes = s.boss.k.lanes.map((l) => l.state);
        info.kingRings = s.boss.k.rings;
        info.kingCracking = s.boss.cracking;
        info.kingCameos = s.boss.k.cameos.map((c) => c.state);
      }
      info.twists = s.twists.map((t) => t.id);
      info.fruitKinds = s.world.fruits.map((f) => f.kind);
      info.eaten = s.world.eaten;
      info.level = s.level.title;
    }
    if (s instanceof CutsceneScene) {
      info.line = s.index;
      info.cutsceneDone = s.done;
    }
    if (s instanceof ChapterMapScene) info.selected = s.selected;
    const st = app.save.data.story;
    info.story = { completed: st.completed, checkpoint: st.checkpoint, lives: st.lives, score: st.score };
    return info;
  };
}

boot();
