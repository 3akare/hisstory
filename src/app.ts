import { AudioEngine } from './audio/audioEngine';
import { GameLoop } from './engine/loop';
import { Input } from './engine/input';
import { Renderer } from './engine/renderer';
import { SceneManager } from './engine/scenes';
import { SaveStore } from './save/save';

/**
 * The shared services every scene can reach: drawing, input, the scene stack,
 * sound and the save file.
 */
export class App {
  readonly renderer: Renderer;
  readonly input: Input;
  readonly scenes: SceneManager;
  readonly loop: GameLoop;
  readonly save: SaveStore;
  readonly audio: AudioEngine;
  readonly params = new URLSearchParams(location.search);
  readonly debug = this.params.get('debug') === '1';

  constructor(canvas: HTMLCanvasElement) {
    this.save = new SaveStore();
    this.audio = new AudioEngine(this.save.data.settings.music);
    this.renderer = new Renderer(canvas);
    this.input = new Input(this.renderer);
    this.input.onFirstGesture(() => this.audio.unlock());
    this.scenes = new SceneManager(this);
    this.input.handler = this.scenes;
    this.loop = new GameLoop({
      update: (dt) => this.scenes.update(dt),
      render: () => this.scenes.draw(),
    });
  }

  get musicOn(): boolean {
    return this.save.data.settings.music;
  }

  toggleMusic(): void {
    const on = !this.save.data.settings.music;
    this.save.data.settings.music = on;
    this.audio.setMusic(on);
    this.save.save();
  }
}
