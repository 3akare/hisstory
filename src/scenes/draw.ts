import { BIOMES, BiomeId, BASE } from '../art/palettes';
import { SPRITES } from '../art/sprites';
import { BOARD_H, BOARD_W, Board, Cell, Dir, isWall } from '../game/board';
import type { Fruit } from '../game/fruit';
import type { Snake } from '../game/snake';
import { BOARD_PX_H, BOARD_PX_W, Renderer, TILE } from '../engine/renderer';

/**
 * Drawing helpers shared by every scene that shows a board:
 * the floor and walls, fruit with its glow, and the smooth snake.
 */

/** Deterministic per-cell noise so decorations don't flicker between frames. */
const cellNoise = (x: number, y: number): number => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export function drawBoard(r: Renderer, board: Board, biome: BiomeId, t: number): void {
  const { boardX: ox, boardY: oy } = r.layout;
  const pal = BIOMES[biome];
  // Frame around the board.
  r.rect(ox - 4, oy - 4, BOARD_PX_W + 8, BOARD_PX_H + 8, pal.slots['6']);
  r.rect(ox - 3, oy - 3, BOARD_PX_W + 6, BOARD_PX_H + 6, pal.slots['4']);
  r.rect(ox - 3, oy - 3, BOARD_PX_W + 6, 1, pal.slots['5']);
  r.rect(ox - 1, oy - 1, BOARD_PX_W + 2, BOARD_PX_H + 2, pal.slots['6']);

  for (let y = 0; y < BOARD_H; y++) {
    for (let x = 0; x < BOARD_W; x++) {
      const px = ox + x * TILE;
      const py = oy + y * TILE;
      if (isWall(board, x, y)) {
        r.sprite('wall', SPRITES.wall, px, py, biome);
        continue;
      }
      const checker = (x + y) % 2 === 0;
      r.sprite(checker ? 'floorA' : 'floorB', checker ? SPRITES.floorA : SPRITES.floorB, px, py, biome);
      drawDecor(r, biome, x, y, px, py, t);
    }
  }
  for (const h of board.holes) r.sprite('hole', SPRITES.hole, ox + h.x * TILE, oy + h.y * TILE, biome);
}

/** Little animated details per biome: swaying grass, glowing mushrooms, bog bubbles, snow. */
function drawDecor(r: Renderer, biome: BiomeId, x: number, y: number, px: number, py: number, t: number): void {
  const n = cellNoise(x, y);
  const sway = Math.sin(t * 1.6 + x * 0.7 + y) > 0.6 ? 1 : 0;
  switch (biome) {
    case 'orchard':
      if (n < 0.08) r.sprite('tuft', SPRITES.tuft, px + sway, py, biome);
      else if (n > 0.975) r.sprite('flower', SPRITES.flower, px, py, biome);
      break;
    case 'bog': {
      if (n < 0.05) r.sprite('tuft', SPRITES.tuft, px + sway, py, biome);
      else if (n > 0.965) {
        // Glowing mushrooms pulse softly.
        const glow = 0.6 + 0.4 * Math.sin(t * 2 + x);
        r.sprite('mushroom', SPRITES.mushroom, px, py, biome, { alpha: glow });
      } else if (n > 0.93) {
        // Bubbles rise and pop on a loop, each cell on its own beat.
        const phase = (t * 0.8 + n * 10) % 2;
        if (phase < 1) r.sprite('bubble', SPRITES.bubble, px, py - Math.round(phase * 3), biome, { alpha: 1 - phase });
      }
      break;
    }
    case 'neon':
      // Crystals that flicker on and off.
      if (n < 0.07 && Math.sin(t * 5 + n * 99) > -0.2) {
        r.rect(px + 3, py + 3, 2, 2, n < 0.035 ? '#4fd8ff' : '#ff4fd8', 0.85);
        r.rect(px + 3, py + 2, 1, 1, '#ffffff', 0.6);
      }
      break;
    case 'sky':
      // Little clouds drifting across the floor.
      if (n < 0.05) {
        const drift = Math.round(Math.sin(t * 0.7 + n * 50) * 2);
        r.rect(px + 1 + drift, py + 4, 6, 2, '#ffffff', 0.55);
        r.rect(px + 2 + drift, py + 3, 3, 1, '#ffffff', 0.55);
      }
      break;
    case 'frost':
      if (n < 0.04) r.sprite('snowflake', SPRITES.snowflake, px, py, biome, { alpha: 0.5 + 0.3 * Math.sin(t * 2 + x) });
      break;
    default:
      if (n < 0.06) r.sprite('pebble', SPRITES.pebble, px, py, biome);
      break;
  }
}

export function drawFruit(r: Renderer, fruits: Fruit[], t: number, biome: BiomeId = 'orchard'): void {
  const { boardX: ox, boardY: oy } = r.layout;
  const ctx = r.ctx;
  for (const f of fruits) {
    const cx = ox + f.x * TILE + 4;
    const cy = oy + f.y * TILE + 4;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4 + f.x);
    const glowColor = f.kind === 'poison' ? 'rgba(180,92,255,' : f.kind === 'portal' ? 'rgba(79,216,255,' : 'rgba(255,217,74,';
    // Soft additive glow under the fruit.
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 9 + pulse * 2);
    g.addColorStop(0, `${glowColor}${0.38 + pulse * 0.12})`);
    g.addColorStop(1, `${glowColor}0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - 12, cy - 12, 24, 24);
    ctx.globalCompositeOperation = 'source-over';
    // Pop-in scale, then a gentle bob.
    const pop = Math.min(1, f.age * 6);
    const bob = Math.sin(t * 3 + f.y) > 0.3 ? -1 : 0;
    if (pop < 1) {
      const s = 0.4 + pop * 0.6;
      const img = SPRITES[f.kind === 'apple' ? 'apple' : f.kind];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      r.sprite(f.kind, img, -4, -4, biome);
      ctx.restore();
    } else {
      r.sprite(f.kind, SPRITES[f.kind === 'apple' ? 'apple' : f.kind], cx - 4, cy - 4 + bob, biome);
    }
  }
}

export interface SnakeLook {
  body: string;
  outline: string;
  stripe: string;
  spot: string;
  eye: string;
}

export const PIP_LOOK: SnakeLook = { body: BASE.G, outline: '#1c5a22', stripe: BASE.h, spot: BASE.g, eye: BASE.W };
export const WHITE_LOOK: SnakeLook = { body: '#ffffff', outline: '#c2c3c7', stripe: '#ffffff', spot: '#e0e0e0', eye: '#ffffff' };

/**
 * Draw a snake smoothly between grid steps.
 * `alpha` is how far (0..1) we are between the last step and the next.
 * The head slides from the previous cell to the current one, the tail
 * slides off its old cell, and everything in between sits on its cell, so
 * the body is always one continuous tube.
 */
export function drawSnake(r: Renderer, snake: Snake, alpha: number, look: SnakeLook = PIP_LOOK, t = 0): void {
  const cells = snake.cells;
  if (!cells.length) return;
  const { boardX: ox, boardY: oy } = r.layout;
  const center = (c: Cell) => ({ x: ox + c.x * TILE + 4, y: oy + c.y * TILE + 4 });
  const lerpPt = (a: Cell, b: Cell, k: number) => {
    // A jump of more than one cell (portal) snaps instead of sliding across the board.
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1) return center(b);
    const pa = center(a);
    const pb = center(b);
    return { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k };
  };

  const pts: { x: number; y: number }[] = [];
  const headFrom = cells.length > 1 ? cells[1] : cells[0];
  pts.push(lerpPt(headFrom, cells[0], alpha));
  for (let i = 1; i < cells.length; i++) pts.push(center(cells[i]));
  if (cells.length > 1) pts.push(lerpPt(snake.prevTail, cells[cells.length - 1], alpha));

  const leg = (a: { x: number; y: number }, b: { x: number; y: number }, thick: number, color: string) => {
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > TILE * 1.5) return; // portal gap
    const half = thick / 2;
    const x0 = Math.min(a.x, b.x) - half;
    const y0 = Math.min(a.y, b.y) - half;
    const w = Math.abs(a.x - b.x) + thick;
    const h = Math.abs(a.y - b.y) + thick;
    r.rect(r.snap(x0), r.snap(y0), w, h, color);
  };

  // Three passes: outline, body, centre stripe.
  for (let i = pts.length - 1; i > 0; i--) leg(pts[i], pts[i - 1], 8, look.outline);
  for (let i = pts.length - 1; i > 0; i--) leg(pts[i], pts[i - 1], 6, look.body);
  for (let i = pts.length - 1; i > 0; i--) leg(pts[i], pts[i - 1], 2, look.stripe);
  // Spots on every other segment.
  for (let i = 2; i < cells.length - 1; i += 2) {
    const c = center(cells[i]);
    r.rect(r.snap(c.x - 1), r.snap(c.y - 3), 2, 1, look.spot);
    r.rect(r.snap(c.x - 1), r.snap(c.y + 2), 2, 1, look.spot);
  }

  drawHead(r, pts[0], snake.dir, look, t);
}

function drawHead(r: Renderer, p: { x: number; y: number }, dir: Dir, look: SnakeLook, t: number): void {
  const x = r.snap(p.x - 4);
  const y = r.snap(p.y - 4);
  // Rounded 8×8 head.
  r.rect(x + 1, y, 6, 8, look.outline);
  r.rect(x, y + 1, 8, 6, look.outline);
  r.rect(x + 1, y + 1, 6, 6, look.body);
  // Eyes sit towards the front, pupils look where we're going.
  const fwd = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[dir];
  const side = [fwd[1], fwd[0]];
  for (const s of [-1, 1]) {
    const ex = x + 3.5 + fwd[0] * 1.5 + side[0] * s * 2 - 0.5;
    const ey = y + 3.5 + fwd[1] * 1.5 + side[1] * s * 2 - 0.5;
    r.rect(Math.round(ex), Math.round(ey), 2, 2, look.eye);
    r.rect(Math.round(ex) + (fwd[0] > 0 ? 1 : 0), Math.round(ey) + (fwd[1] > 0 ? 1 : 0), 1, 1, BASE.K);
  }
  // Tongue flick every so often.
  if (Math.sin(t * 2.3) > 0.85) {
    const tx = x + 3.5 + fwd[0] * 5;
    const ty = y + 3.5 + fwd[1] * 5;
    r.rect(Math.round(tx), Math.round(ty), fwd[0] !== 0 ? 2 : 1, fwd[1] !== 0 ? 2 : 1, BASE.R);
  }
}
