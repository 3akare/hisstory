import { GameLoop } from './engine/loop';
import { Input } from './engine/input';
import { Renderer } from './engine/renderer';
import { SceneManager } from './engine/scenes';

/**
 * The shared services every scene can reach: drawing, input, the scene stack.
 * (Audio and saving join in later slices.)
 */
export class App {
  readonly renderer: Renderer;
  readonly input: Input;
  readonly scenes: SceneManager;
  readonly loop: GameLoop;
  readonly params = new URLSearchParams(location.search);
  readonly debug = this.params.get('debug') === '1';

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(this.renderer);
    this.scenes = new SceneManager(this);
    this.input.handler = this.scenes;
    this.loop = new GameLoop({
      update: (dt) => this.scenes.update(dt),
      render: () => this.scenes.draw(),
    });
  }
}
