import { spriteImage } from '../art/spriteCache';
import { SpriteDef } from '../art/sprites';
import { BiomeId } from '../art/palettes';
import { BOARD_H, BOARD_W } from '../game/board';

/** Art is authored at 8×8 pixels per board cell. */
export const TILE = 8;
export const BOARD_PX_W = BOARD_W * TILE; // 192
export const BOARD_PX_H = BOARD_H * TILE; // 144

export interface Layout {
  /** Logical (art-pixel) size of the whole screen. */
  w: number;
  h: number;
  portrait: boolean;
  /** Show the on-screen d-pad (touch devices). */
  touch: boolean;
  /** Top-left of the board in logical pixels. */
  boardX: number;
  boardY: number;
  /** Baseline row for the HUD bar above the board. */
  hudY: number;
  /** On-screen d-pad centre and radius, if shown. */
  dpad: { cx: number; cy: number; r: number } | null;
}

export const FONT_PIXEL = '"Press Start 2P", monospace';
export const FONT_DIALOG = '"Pixelify Sans", "Press Start 2P", monospace';

export interface TextOpts {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  font?: 'pixel' | 'dialog';
  shadow?: string | null;
  alpha?: number;
  baseline?: CanvasTextBaseline;
}

function detectTouch(): boolean {
  const q = new URLSearchParams(location.search);
  if (q.has('touch')) return q.get('touch') !== '0';
  return (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
}

/**
 * Owns the <canvas>. Everything is drawn in logical "art pixels" and scaled up
 * by a whole-number factor so pixels stay crisp squares.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  layout!: Layout;
  /** Device pixels per logical pixel. */
  scale = 1;
  /** Camera offset in logical pixels (screen shake). */
  offsetX = 0;
  offsetY = 0;
  private dpr = 1;
  private touch: boolean;
  onResize: (() => void) | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.touch = detectTouch();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 100));
  }

  get isTouch(): boolean {
    return this.touch;
  }

  /** Call when a touch is first seen, in case detection missed it. */
  enableTouch(): void {
    if (this.touch) return;
    this.touch = true;
    this.resize();
  }

  resize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const portrait = vh > vw * 1.1;
    this.layout = computeLayout(portrait, this.touch);
    this.dpr = window.devicePixelRatio || 1;
    const fit = Math.min((vw * this.dpr) / this.layout.w, (vh * this.dpr) / this.layout.h);
    this.scale = fit >= 1 ? Math.floor(fit) : fit;
    this.canvas.width = Math.round(this.layout.w * this.scale);
    this.canvas.height = Math.round(this.layout.h * this.scale);
    this.canvas.style.width = `${this.canvas.width / this.dpr}px`;
    this.canvas.style.height = `${this.canvas.height / this.dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.onResize?.();
  }

  /** Convert a pointer event position to logical pixels. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * this.layout.w,
      y: ((clientY - r.top) / r.height) * this.layout.h,
    };
  }

  private bodyColor = '';

  begin(clear: string): void {
    const { ctx } = this;
    // Letterbox bars match the scene so the canvas edge is invisible.
    if (clear !== this.bodyColor) {
      this.bodyColor = clear;
      document.body.style.background = clear;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = clear;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.applyTransform();
    ctx.imageSmoothingEnabled = false;
  }

  applyTransform(withShake = true): void {
    const s = this.scale;
    const ox = withShake ? Math.round(this.offsetX * s) : 0;
    const oy = withShake ? Math.round(this.offsetY * s) : 0;
    this.ctx.setTransform(s, 0, 0, s, ox, oy);
  }

  /** Snap a logical coordinate to the nearest device pixel (smooth but never blurry). */
  snap(v: number): number {
    return Math.round(v * this.scale) / this.scale;
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  sprite(name: string, def: SpriteDef, x: number, y: number, biome: BiomeId = 'orchard', opts: { scale?: number; alpha?: number; flipX?: boolean } = {}): void {
    const img = spriteImage(name, def, biome);
    const sc = opts.scale ?? 1;
    const { ctx } = this;
    ctx.globalAlpha = opts.alpha ?? 1;
    if (opts.flipX) {
      ctx.save();
      ctx.translate(this.snap(x) + img.width * sc, this.snap(y));
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, img.width * sc, img.height * sc);
      ctx.restore();
    } else {
      ctx.drawImage(img, this.snap(x), this.snap(y), img.width * sc, img.height * sc);
    }
    ctx.globalAlpha = 1;
  }

  text(str: string, x: number, y: number, opts: TextOpts = {}): void {
    const { ctx } = this;
    const size = opts.size ?? 8;
    ctx.font = `${size}px ${opts.font === 'dialog' ? FONT_DIALOG : FONT_PIXEL}`;
    ctx.textAlign = opts.align ?? 'left';
    ctx.textBaseline = opts.baseline ?? 'top';
    ctx.globalAlpha = opts.alpha ?? 1;
    const shadow = opts.shadow === undefined ? '#0b0b14' : opts.shadow;
    if (shadow) {
      ctx.fillStyle = shadow;
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = opts.color ?? '#fff1e8';
    ctx.fillText(str, x, y);
    ctx.globalAlpha = 1;
  }

  measure(str: string, size = 8, font: 'pixel' | 'dialog' = 'pixel'): number {
    this.ctx.font = `${size}px ${font === 'dialog' ? FONT_DIALOG : FONT_PIXEL}`;
    return this.ctx.measureText(str).width;
  }

  /** A chunky pixel panel: dark fill, 1px light border, 1px dark outer edge. */
  panel(x: number, y: number, w: number, h: number, fill = '#141022', border = '#fff1e8', alpha = 0.92): void {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    this.rect(x + 1, y, w - 2, h, '#0b0b14', alpha);
    this.rect(x, y + 1, w, h - 2, '#0b0b14', alpha);
    this.rect(x + 2, y + 1, w - 4, h - 2, fill, alpha);
    this.rect(x + 1, y + 2, w - 2, h - 4, fill, alpha);
    // border
    this.rect(x + 2, y + 1, w - 4, 1, border);
    this.rect(x + 2, y + h - 2, w - 4, 1, border);
    this.rect(x + 1, y + 2, 1, h - 4, border);
    this.rect(x + w - 2, y + 2, 1, h - 4, border);
  }
}

export function computeLayout(portrait: boolean, touch: boolean): Layout {
  if (portrait) {
    const w = 208;
    const h = 370;
    return {
      w,
      h,
      portrait,
      touch,
      boardX: (w - BOARD_PX_W) / 2,
      boardY: 40,
      hudY: 22,
      dpad: touch ? { cx: w / 2, cy: 286, r: 54 } : null,
    };
  }
  const w = 320;
  const h = 180;
  return {
    w,
    h,
    portrait,
    touch,
    boardX: (w - BOARD_PX_W) / 2,
    boardY: 30,
    hudY: 12,
    dpad: touch ? { cx: 32, cy: 128, r: 28 } : null,
  };
}
