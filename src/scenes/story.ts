import type { App } from '../app';
import { chapter } from '../game/chapters';
import { completeChapter, outOfLives } from '../game/progress';
import { SCRIPT } from '../story/script';
import { ChapterMapScene } from './ChapterMapScene';
import { CutsceneScene } from './CutsceneScene';
import { OutOfLivesScene } from './OutOfLivesScene';
import { PlayScene } from './PlayScene';
import { EndingScene } from './EndingScene';

/**
 * How Story mode's screens connect:
 *   Map → intro cutscene → play → (clear) → outro cutscene → Map
 *                                → (out of lives) → Out of Lives → Map at the checkpoint
 * Lives and score live in the save, so replays share them (learner's rule).
 */
export function openMap(app: App, focus?: number): void {
  app.scenes.go(new ChapterMapScene(app, focus, (id) => playChapter(app, id)));
}

export function playChapter(app: App, id: number, skipIntro = false): void {
  const ch = chapter(id);
  const story = app.save.data.story;
  story.started = true;
  // A saved mid-level game for this chapter? Pick up exactly where you left off.
  const resume = story.resume && story.resume.chapter === id ? story.resume.data : undefined;
  if (!resume) story.resume = null;
  app.save.save();
  const start = () =>
    app.scenes.go(
      new PlayScene(app, ch.level(), story, {
        chapterId: id,
        resume,
        onQuit: () => openMap(app, id),
        kingPhase: story.kingPhase,
        onKingPhase: (phase) => {
          // The finale's mini-checkpoint: run out of lives and you restart at this phase.
          story.kingPhase = phase;
          app.save.save();
        },
        onRestart: () => playChapter(app, id, true),
        onWin: () => {
          const next = completeChapter(story, id);
          story.resume = null;
          if (id === 10) story.kingPhase = 1;
          app.save.save();
          const outro = SCRIPT[id]?.outro ?? [];
          // The finale ends with the credits; everything else goes back to the map.
          const back = () => (id === 10 ? app.scenes.go(new EndingScene(app)) : openMap(app, next ?? id));
          if (outro.length) app.scenes.go(new CutsceneScene(app, outro, ch.biome, back));
          else back();
        },
        onOut: () => {
          const cp = outOfLives(story);
          app.save.save();
          app.scenes.push(new OutOfLivesScene(app, cp, () => openMap(app, cp)));
        },
      }),
    );
  const intro = SCRIPT[id]?.intro ?? [];
  if (intro.length && !skipIntro && !resume) app.scenes.go(new CutsceneScene(app, intro, ch.biome, start, 'map'));
  else start();
}
