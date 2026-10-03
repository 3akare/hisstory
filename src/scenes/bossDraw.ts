import { SpriteDef, SPRITES } from '../art/sprites';
import type { BossController } from '../game/bosses/bossKit';
import { Grub } from '../game/bosses/grub';
import { MiraGrub } from '../game/bosses/miraGrub';
import { Viper } from '../game/bosses/viper';
import { VIPER } from '../game/bosses/tuning';
import { drawSnake, SnakeLook } from './draw';
import type { Cell } from '../game/board';
import { COIL_DEGREES, windingDegrees } from '../game/coil';
import { Renderer, TILE } from '../engine/renderer';

/** Drawing for each boss. The rules live in game/bosses; only pictures here. */
export function drawBoss(r: Renderer, boss: BossController, t: number, snake: readonly Cell[] = []): void {
  if (boss instanceof Grub) {
    drawGrub(r, boss, t);
    if (boss.s.mode === 'up' && boss.holeCell) drawCoilRing(r, boss.holeCell, windingDegrees(snake, boss.holeCell), t);
  } else if (boss instanceof Viper) {
    drawViper(r, boss, t);
    if (boss.present && boss.v.mode !== 'hit') drawCoilRing(r, boss.head, windingDegrees(snake, boss.head), t);
  } else if (boss instanceof MiraGrub) {
    drawGrub(r, boss.grub, t);
    if (boss.grub.s.mode === 'up' && boss.grub.holeCell) drawCoilRing(r, boss.grub.holeCell, windingDegrees(snake, boss.grub.holeCell), t);
    drawMira(r, boss, t);
    if ((boss.m.mode === 'walk' || boss.m.mode === 'panic') && boss.m.health > 0) drawCoilRing(r, boss.miraCell, windingDegrees(snake, boss.miraCell), t);
  }
}

/**
 * The coil progress ring: 12 dots around the boss that light up as Pip circles
 * him. All lit = coil. Makes "go around him" readable at a glance.
 */
export function drawCoilRing(r: Renderer, at: Cell, degrees: number, t: number, radius = 10): void {
  const { boardX: ox, boardY: oy } = r.layout;
  const cx = ox + at.x * TILE + 4;
  const cy = oy + at.y * TILE + 4;
  const dots = 12;
  const lit = Math.floor(Math.min(1, degrees / COIL_DEGREES) * dots);
  for (let i = 0; i < dots; i++) {
    const a = (i / dots) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(cx + Math.cos(a) * radius) - 1;
    const y = Math.round(cy + Math.sin(a) * radius) - 1;
    const on = i < lit;
    const pulse = on && Math.floor(t * 10) % 2 === 0;
    r.rect(x, y, 2, 2, on ? (pulse ? '#ffffff' : '#ffd94a') : '#0b0b14', on ? 1 : 0.35);
  }
}

export function drawGrub(r: Renderer, g: Grub, t: number): void {
  const { boardX: ox, boardY: oy } = r.layout;
  const s = g.s;
  for (const m of s.mounds) {
    const blink = m.ttl < 1 && Math.floor(t * 10) % 2 === 0;
    if (!blink) r.sprite('mound', SPRITES.mound, ox + m.x * TILE, oy + m.y * TILE);
  }
  const h = g.holeCell;
  if (!h) return;
  const px = ox + h.x * TILE;
  const py = oy + h.y * TILE;
  switch (s.mode) {
    case 'telegraph': {
      // Dirt shakes and sprays: the warning.
      const jx = Math.round(Math.sin(t * 60) * 1);
      r.sprite('dirt', SPRITES.dirt, px + jx, py - 1);
      if (Math.floor(t * 8) % 2 === 0) r.text('!', px + 4, py - 9, { align: 'center', color: '#ffd94a', size: 8 });
      break;
    }
    case 'up': {
      // Pop-up: rise out of the hole over the first 0.15 s, then a little idle bob.
      const rise = Math.min(1, s.age / 0.15);
      const bob = Math.sin(t * 6) > 0 ? 0 : 1;
      const dy = Math.round((1 - rise) * 6) + bob;
      drawClipped(r, px, py, dy, 'grub');
      // Countdown bar: how long before he dives. Turns red near the end.
      const left = Math.max(0, s.timer / Math.max(0.01, s.upFor));
      const urgent = s.timer < 1.2;
      r.rect(px - 1, py - 4, 10, 3, '#0b0b14', 0.8);
      r.rect(px, py - 3, Math.max(1, Math.round(8 * left)), 1, urgent && Math.floor(t * 8) % 2 ? '#ff3b4a' : '#ffd94a');
      // Panic sweat when he's half-wrapped.
      if (s.bonus > 0 && Math.floor(t * 6) % 2 === 0) r.rect(px + 8, py, 1, 2, '#4fd8ff');
      break;
    }
    case 'hit': {
      const shake = Math.round(Math.sin(t * 50) * 1.5);
      drawClipped(r, px + shake, py, 0, Math.floor(t * 12) % 2 ? 'grubHit' : 'grub', Math.floor(t * 12) % 2 === 0);
      break;
    }
    case 'diving': {
      const sink = Math.round(Math.min(1, s.age / 0.35) * 8);
      drawClipped(r, px, py, sink, 'grub');
      break;
    }
    default:
      break;
  }
}

export const VIPER_LOOK: SnakeLook = { body: '#2fd6a0', outline: '#0e4d3f', stripe: '#a6f5dc', spot: '#167a63', eye: '#ffd94a' };

export function drawViper(r: Renderer, b: Viper, t: number): void {
  const { boardX: ox, boardY: oy } = r.layout;
  const v = b.v;
  if (v.mode === 'defeated' || v.mode === 'gone') return;
  if (v.mode === 'arrive') {
    // A shadow where she'll slither back in.
    if (Math.floor(t * 8) % 2 === 0) for (const c of v.cells) r.rect(ox + c.x * TILE + 1, oy + c.y * TILE + 1, 6, 6, '#0e4d3f', 0.6);
    return;
  }
  // Lunge warning: her dash path flashes red.
  if (v.mode === 'warn' && Math.floor(t * 10) % 2 === 0) {
    for (const c of v.lungePath) r.rect(ox + c.x * TILE, oy + c.y * TILE, TILE, TILE, '#ff3b4a', 0.45);
  }
  const alpha = v.mode === 'race' ? Math.min(1, v.stepT / VIPER.stepTime) : 1;
  const flash = v.mode === 'hit' && Math.floor(t * 12) % 2 === 0;
  drawSnake(
    r,
    { cells: v.cells, dir: v.dir, grow: v.grow, prevTail: v.prevTail, queue: [] },
    alpha,
    flash ? { body: '#ffffff', outline: '#c2c3c7', stripe: '#ffffff', spot: '#e0e0e0', eye: '#ffffff' } : VIPER_LOOK,
    t + 1.3,
  );
  // Tiny gold tiara: she's royalty.
  const h = v.cells[0];
  r.rect(ox + h.x * TILE + 2, oy + h.y * TILE - 1, 4, 1, '#ffd94a');
  r.rect(ox + h.x * TILE + 2, oy + h.y * TILE - 2, 1, 1, '#ffd94a');
  r.rect(ox + h.x * TILE + 5, oy + h.y * TILE - 2, 1, 1, '#ffd94a');
  if (v.mode === 'stunned') {
    // Dizzy stars circling her head.
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + (i * Math.PI * 2) / 3;
      r.rect(Math.round(ox + h.x * TILE + 3 + Math.cos(a) * 6), Math.round(oy + h.y * TILE - 2 + Math.sin(a) * 3), 2, 2, '#ffd94a');
    }
  }
}

export function drawMira(r: Renderer, b: MiraGrub, t: number): void {
  const { boardX: ox, boardY: oy } = r.layout;
  const m = b.m;
  // Crumbling tunnel trail: fades as it's about to settle.
  for (const tr of m.trail) {
    const a = Math.min(1, tr.ttl / 0.6);
    if (tr.ttl < 0.6 && Math.floor(t * 12) % 2 === 0) continue;
    r.sprite('trail', SPRITES.trail, ox + tr.x * TILE, oy + tr.y * TILE, 'desert', { alpha: 0.5 + 0.5 * a });
  }
  const px = ox + m.x * TILE;
  const py = oy + m.y * TILE;
  switch (m.mode) {
    case 'emerge': {
      const jx = Math.round(Math.sin(t * 60));
      r.sprite('dirt', SPRITES.dirt, px + jx, py - 1);
      if (Math.floor(t * 8) % 2 === 0) r.text('!', px + 4, py - 9, { align: 'center', color: '#ff4fd8', size: 8 });
      break;
    }
    case 'walk':
    case 'panic': {
      const bob = Math.floor(t * 8) % 2;
      const flip = m.facing === 'L';
      r.sprite('mira', SPRITES.mira, px, py - bob, 'orchard', { flipX: !flip });
      if (m.mode === 'panic' && Math.floor(t * 6) % 2 === 0) {
        r.rect(px + 8, py, 1, 2, '#4fd8ff');
        r.rect(px - 1, py + 1, 1, 2, '#4fd8ff');
      }
      break;
    }
    case 'hit': {
      const shake = Math.round(Math.sin(t * 50) * 1.5);
      const white = Math.floor(t * 12) % 2 === 0;
      r.sprite(white ? 'mira_white' : 'mira', white ? whiteOf(SPRITES.mira) : SPRITES.mira, px + shake, py);
      break;
    }
    case 'diving': {
      const sink = Math.round(Math.min(1, m.age / 0.4) * 8);
      const ctx = r.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px - 2, py - 4, TILE + 4, TILE + 4);
      ctx.clip();
      r.sprite('mira', SPRITES.mira, px, py + sink);
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

/** Draw a boss sprite that pokes out of a hole: clip to the cell so it rises/sinks into the ground. */
function drawClipped(r: Renderer, px: number, py: number, dy: number, name: 'grub' | 'grubHit', white = false): void {
  const ctx = r.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px - 2, py - 4, TILE + 4, TILE + 4);
  ctx.clip();
  if (white) r.sprite(`${name}_white`, whiteOf(SPRITES[name]), px, py - 1 + dy);
  else r.sprite(name, SPRITES[name], px, py - 1 + dy);
  ctx.restore();
}

const whiteCache = new Map<SpriteDef, SpriteDef>();
/** A white silhouette of a sprite, for hit flashes. */
export function whiteOf(def: SpriteDef): SpriteDef {
  let w = whiteCache.get(def);
  if (!w) {
    w = { rows: def.rows.map((row) => row.replace(/[^.]/g, 'W')) };
    whiteCache.set(def, w);
  }
  return w;
}
