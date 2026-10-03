import type { Dir } from '../game/board';
import type { Layout, Renderer } from './renderer';

export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause' | 'mute';

export const ACTION_DIR: Partial<Record<Action, Dir>> = { up: 'U', down: 'D', left: 'L', right: 'R' };

const KEYMAP: Record<string, Action> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Enter: 'confirm',
  Space: 'confirm',
  NumpadEnter: 'confirm',
  Escape: 'back',
  Backspace: 'back',
  KeyP: 'pause',
  KeyM: 'mute',
};

export interface PointerInfo {
  x: number;
  y: number;
  id: number;
}

/** Whatever is currently listening for input (the active scene). */
export interface InputHandler {
  onAction?(action: Action, repeat: boolean): void;
  /** Fired for every key, before mapping, e.g. "press any key". */
  onAnyKey?(): void;
  onPointerDown?(p: PointerInfo): void;
  onPointerMove?(p: PointerInfo): void;
  onPointerUp?(p: PointerInfo): void;
}

/**
 * Keyboard + pointer (mouse, touch, pen), turned into simple actions and
 * logical-pixel pointer positions, delivered to the active scene.
 */
export class Input {
  handler: InputHandler | null = null;
  /** First user gesture listeners (audio unlock). */
  private gestureListeners: (() => void)[] = [];

  constructor(private renderer: Renderer) {
    window.addEventListener('keydown', this.keydown);
    const c = renderer.canvas;
    c.addEventListener('pointerdown', this.pointer('down'));
    c.addEventListener('pointermove', this.pointer('move'));
    window.addEventListener('pointerup', this.pointer('up'));
    window.addEventListener('pointercancel', this.pointer('up'));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onFirstGesture(fn: () => void): void {
    this.gestureListeners.push(fn);
  }

  private gesture(): void {
    for (const fn of this.gestureListeners) fn();
  }

  private keydown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = KEYMAP[e.code];
    if (action || e.code.startsWith('Key') || e.code.startsWith('Digit')) {
      // Stop arrows/space scrolling the page.
      e.preventDefault();
    }
    this.gesture();
    this.handler?.onAnyKey?.();
    if (action) this.handler?.onAction?.(action, e.repeat);
  };

  private pointer = (kind: 'down' | 'move' | 'up') => (e: PointerEvent): void => {
    if (kind === 'down') {
      if (e.pointerType === 'touch') this.renderer.enableTouch();
      this.gesture();
      this.renderer.canvas.focus();
    }
    if (kind === 'move' && e.buttons === 0 && e.pointerType === 'mouse') return;
    const p = { ...this.renderer.toLogical(e.clientX, e.clientY), id: e.pointerId };
    if (kind === 'down') this.handler?.onPointerDown?.(p);
    else if (kind === 'move') this.handler?.onPointerMove?.(p);
    else this.handler?.onPointerUp?.(p);
  };
}

/** Which d-pad arrow is under a touch, or null if outside the pad. */
export function dpadDir(layout: Layout, x: number, y: number): Dir | null {
  const pad = layout.dpad;
  if (!pad) return null;
  const dx = x - pad.cx;
  const dy = y - pad.cy;
  const dist = Math.hypot(dx, dy);
  // A little larger than the drawn pad, and a dead zone in the centre.
  if (dist > pad.r * 1.35 || dist < pad.r * 0.18) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'R' : 'L';
  return dy > 0 ? 'D' : 'U';
}
