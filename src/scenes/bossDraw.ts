import { SpriteDef, SPRITES } from '../art/sprites';
import type { BossController } from '../game/bosses/bossKit';
import { Grub } from '../game/bosses/grub';
import { Renderer, TILE } from '../engine/renderer';

/** Drawing for each boss. The rules live in game/bosses; only pictures here. */
export function drawBoss(r: Renderer, boss: BossController, t: number): void {
  if (boss instanceof Grub) drawGrub(r, boss, t);
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
