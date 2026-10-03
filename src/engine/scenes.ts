import type { Action, InputHandler, PointerInfo } from './input';
import type { App } from '../app';

/**
 * A screen of the game (Home, Map, Cutscene, Play, ...).
 * Exactly one scene is in charge; overlays (Pause) sit on top of it.
 */
export abstract class Scene implements InputHandler {
  /** Overlay scenes let the scene below keep drawing (but not updating). */
  overlay = false;
  /** Name used by tests and debug tools. */
  abstract readonly name: string;

  constructor(protected app: App) {}

  enter(): void {}
  exit(): void {}
  /** Called when an overlay above this scene is removed. */
  resume(): void {}
  update(_dt: number): void {}
  /** The tab was hidden or the page is closing (save, pause). */
  onHidden(): void {}
  abstract draw(): void;

  onAction?(action: Action, repeat: boolean): void;
  onAnyKey?(): void;
  onPointerDown?(p: PointerInfo): void;
  onPointerMove?(p: PointerInfo): void;
  onPointerUp?(p: PointerInfo): void;
}

const FADE_TIME = 0.22;

/** A stack of scenes with fade-through-black transitions. */
export class SceneManager implements InputHandler {
  private stack: Scene[] = [];
  private pending: Scene | null = null;
  private fade = 0; // 0 = clear, 1 = black
  private fadeDir: -1 | 0 | 1 = 0;

  constructor(private app: App) {}

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get current(): Scene | undefined {
    // The base (non-overlay) scene.
    for (let i = this.stack.length - 1; i >= 0; i--) if (!this.stack[i].overlay) return this.stack[i];
    return undefined;
  }

  get transitioning(): boolean {
    return this.fadeDir !== 0;
  }

  /** Input is ignored only while fading OUT (the old scene is leaving); the new scene can be used while it fades in. */
  private get blocked(): boolean {
    return this.fadeDir === 1;
  }

  /** Replace everything with `scene`, fading through black. */
  go(scene: Scene, instant = false): void {
    if (instant || this.stack.length === 0) {
      this.replaceAll(scene);
      this.fade = instant ? 0 : 1;
      this.fadeDir = instant ? 0 : -1;
      return;
    }
    this.pending = scene;
    this.fadeDir = 1;
  }

  push(scene: Scene): void {
    this.stack.push(scene);
    scene.enter();
  }

  pop(): void {
    const s = this.stack.pop();
    s?.exit();
    this.top?.resume();
  }

  private replaceAll(scene: Scene): void {
    while (this.stack.length) this.stack.pop()!.exit();
    this.stack.push(scene);
    scene.enter();
  }

  update(dt: number): void {
    if (this.fadeDir === 1) {
      this.fade = Math.min(1, this.fade + dt / FADE_TIME);
      if (this.fade >= 1 && this.pending) {
        this.replaceAll(this.pending);
        this.pending = null;
        this.fadeDir = -1;
      }
    } else if (this.fadeDir === -1) {
      this.fade = Math.max(0, this.fade - dt / FADE_TIME);
      if (this.fade <= 0) this.fadeDir = 0;
    }
    this.top?.update(dt);
  }

  draw(): void {
    // Draw from the last non-overlay scene upwards.
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].overlay) start--;
    for (let i = Math.max(0, start); i < this.stack.length; i++) this.stack[i].draw();
    if (this.fade > 0) {
      const r = this.app.renderer;
      r.applyTransform(false);
      r.rect(0, 0, r.layout.w, r.layout.h, '#0b0b14', this.fade);
    }
  }

  // Input goes to the top scene, but not mid-transition.
  onAction(a: Action, repeat: boolean): void {
    // M toggles music anywhere.
    if (a === 'mute') {
      if (!repeat) this.app.toggleMusic();
      return;
    }
    if (!this.blocked) this.top?.onAction?.(a, repeat);
  }
  onAnyKey(): void {
    if (!this.blocked) this.top?.onAnyKey?.();
  }
  onPointerDown(p: PointerInfo): void {
    if (!this.blocked) this.top?.onPointerDown?.(p);
  }
  onPointerMove(p: PointerInfo): void {
    this.top?.onPointerMove?.(p);
  }
  onPointerUp(p: PointerInfo): void {
    this.top?.onPointerUp?.(p);
  }
}
