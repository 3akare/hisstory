import { BIOMES, BiomeId } from '../art/palettes';
import { SPRITES } from '../art/sprites';
import type { Dir } from '../game/board';
import { BOARD_PX_W, Renderer } from '../engine/renderer';

/** The bar above the board, and the on-screen d-pad for touch devices. */

export function drawHudBar(r: Renderer, biome: BiomeId): void {
  const { boardX, hudY } = r.layout;
  const pal = BIOMES[biome];
  r.rect(boardX - 4, hudY - 4, BOARD_PX_W + 8, 15, pal.panel, 0.9);
}

export function drawHearts(r: Renderer, x: number, y: number, lives: number, max = 3): void {
  const shown = Math.max(max, lives);
  for (let i = 0; i < shown; i++) {
    r.sprite(i < lives ? 'heart' : 'heartEmpty', i < lives ? SPRITES.heart : SPRITES.heartEmpty, x + i * 8, y);
  }
}

/** A segmented meter (fruit meter or boss health). */
export function drawMeter(r: Renderer, x: number, y: number, w: number, value: number, max: number, fill: string, label?: string): void {
  if (label) r.text(label, x, y, { size: 8, color: '#fff1e8' });
  const lx = label ? x + r.measure(label) + 4 : x;
  const lw = w - (lx - x);
  r.rect(lx, y, lw, 8, '#0b0b14');
  r.rect(lx + 1, y + 1, lw - 2, 6, '#1d1d2b');
  const segs = Math.max(1, max);
  const segW = (lw - 2) / segs;
  for (let i = 0; i < segs; i++) {
    if (i < value) {
      const sx = Math.round(lx + 1 + i * segW);
      const ex = Math.round(lx + 1 + (i + 1) * segW);
      r.rect(sx, y + 1, Math.max(1, ex - sx - (segs > 1 ? 1 : 0)), 6, fill);
      r.rect(sx, y + 1, Math.max(1, ex - sx - (segs > 1 ? 1 : 0)), 1, '#ffffff', 0.35);
    }
  }
}

export function drawDpad(r: Renderer, pressed: Dir | null): void {
  const pad = r.layout.dpad;
  if (!pad) return;
  const { cx, cy, r: rad } = pad;
  const arm = Math.round(rad * 0.62);
  const len = Math.round(rad);
  const base = '#2a2440';
  const hi = '#fff1e8';
  // Cross shape.
  r.rect(cx - arm / 2, cy - len, arm, len * 2, '#0b0b14', 0.75);
  r.rect(cx - len, cy - arm / 2, len * 2, arm, '#0b0b14', 0.75);
  r.rect(cx - arm / 2 + 1, cy - len + 1, arm - 2, len * 2 - 2, base, 0.85);
  r.rect(cx - len + 1, cy - arm / 2 + 1, len * 2 - 2, arm - 2, base, 0.85);
  const arrows: Record<Dir, [number, number]> = {
    U: [cx, cy - len * 0.62],
    D: [cx, cy + len * 0.62],
    L: [cx - len * 0.62, cy],
    R: [cx + len * 0.62, cy],
  };
  for (const d of ['U', 'D', 'L', 'R'] as Dir[]) {
    const [ax, ay] = arrows[d];
    const on = pressed === d;
    if (on) {
      const hx = d === 'L' || d === 'R' ? (d === 'L' ? cx - len + 1 : cx + 1) : cx - arm / 2 + 1;
      const hy = d === 'U' || d === 'D' ? (d === 'U' ? cy - len + 1 : cy + 1) : cy - arm / 2 + 1;
      const hw = d === 'L' || d === 'R' ? len - 2 : arm - 2;
      const hh = d === 'U' || d === 'D' ? len - 2 : arm - 2;
      r.rect(hx, hy, hw, hh, '#5ad13a', 0.6);
    }
    drawArrow(r, ax, ay, d, Math.max(3, Math.round(rad / 9)), on ? '#ffffff' : hi);
  }
}

function drawArrow(r: Renderer, x: number, y: number, d: Dir, size: number, color: string): void {
  for (let i = 0; i < size; i++) {
    const w = (size - i) * 2 - 1;
    if (d === 'U') r.rect(Math.round(x - w / 2), Math.round(y - size / 2 + (size - 1 - i)), w, 1, color);
    if (d === 'D') r.rect(Math.round(x - w / 2), Math.round(y - size / 2 + i), w, 1, color);
    if (d === 'L') r.rect(Math.round(x - size / 2 + (size - 1 - i)), Math.round(y - w / 2), 1, w, color);
    if (d === 'R') r.rect(Math.round(x - size / 2 + i), Math.round(y - w / 2), 1, w, color);
  }
}
