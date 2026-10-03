import { BOARD_H, BOARD_W } from '../game/board';
import { FogTwist, IceTwist, Twist, WallGapsTwist } from '../game/twists';
import { SPRITES } from '../art/sprites';
import type { World } from '../game/world';
import { BOARD_PX_H, BOARD_PX_W, Renderer, TILE } from '../engine/renderer';

/** Pictures for chapter twists. Rules live in game/twists.ts. */

/** Under the snake: ice patches. */
export function drawTwistsUnder(r: Renderer, twists: Twist[], t: number): void {
  for (const tw of twists) {
    if (tw instanceof IceTwist) drawIce(r, tw, t);
    if (tw instanceof WallGapsTwist) drawGates(r, tw, t);
  }
}

/** Over everything on the board: the sandstorm. */
export function drawTwistsOver(r: Renderer, twists: Twist[], world: World, t: number): void {
  for (const tw of twists) {
    if (tw instanceof FogTwist) drawFog(r, tw, world, t);
  }
}

function drawIce(r: Renderer, ice: IceTwist, t: number): void {
  const { boardX: ox, boardY: oy } = r.layout;
  for (let y = 0; y < BOARD_H; y++) {
    for (let x = 0; x < BOARD_W; x++) {
      if (!ice.isIce(x, y)) continue;
      const px = ox + x * TILE;
      const py = oy + y * TILE;
      r.rect(px, py, TILE, TILE, '#9fe2ff', 0.55);
      r.rect(px, py, TILE, 1, '#ffffff', 0.5);
      // A glint slides across the ice now and then.
      const g = Math.floor((t * 6 + x * 2 + y * 3) % 24);
      if (g < 6) r.rect(px + g, py + 1 + (g % 3), 2, 1, '#ffffff', 0.9);
    }
  }
}

function drawGates(r: Renderer, g: WallGapsTwist, t: number): void {
  const { boardX: ox, boardY: oy } = r.layout;
  for (const c of g.cells) {
    const px = ox + c.x * TILE;
    const py = oy + c.y * TILE;
    if (!g.open) {
      r.sprite('wall', SPRITES.wall, px, py, 'sky');
      r.rect(px, py, TILE, 1, '#ffe08a', 0.9);
    } else if (g.warning) {
      // Blinking: about to shut.
      if (Math.floor(t * 8) % 2 === 0) r.sprite('wall', SPRITES.wall, px, py, 'sky', { alpha: 0.6 });
      else r.rect(px, py, TILE, TILE, '#ff3b4a', 0.25);
    } else {
      // Open: a faint golden frame.
      r.rect(px, py, TILE, 1, '#e0b84a', 0.6);
      r.rect(px, py + TILE - 1, TILE, 1, '#e0b84a', 0.6);
    }
  }
}

let fogCanvas: HTMLCanvasElement | null = null;

function drawFog(r: Renderer, fog: FogTwist, world: World, t: number): void {
  const { boardX: ox, boardY: oy } = r.layout;
  if (!fogCanvas) {
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = BOARD_PX_W;
    fogCanvas.height = BOARD_PX_H;
  }
  const c = fogCanvas.getContext('2d')!;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, BOARD_PX_W, BOARD_PX_H);
  c.fillStyle = 'rgba(122, 78, 40, 0.94)';
  c.fillRect(0, 0, BOARD_PX_W, BOARD_PX_H);
  // Blowing sand streaks.
  c.fillStyle = 'rgba(232, 191, 122, 0.35)';
  for (let i = 0; i < 26; i++) {
    const sx = ((i * 53 + t * 70) % (BOARD_PX_W + 30)) - 20;
    const sy = (i * 37) % BOARD_PX_H;
    c.fillRect(Math.round(sx), sy, 10 + (i % 3) * 4, 1);
  }
  // Clear a soft circle around Pip's head.
  const h = world.snake.cells[0];
  const hx = h.x * TILE + 4;
  const hy = h.y * TILE + 4;
  const rad = fog.radius * TILE;
  c.globalCompositeOperation = 'destination-out';
  const g = c.createRadialGradient(hx, hy, rad * 0.55, hx, hy, rad);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(hx - rad, hy - rad, rad * 2, rad * 2);
  c.globalCompositeOperation = 'source-over';
  r.ctx.drawImage(fogCanvas, ox, oy);
  // Fruit glints show through the storm, so you always know where to head.
  for (const f of world.fruits) {
    if (Math.floor(t * 3 + f.x) % 3 === 0) continue;
    const col = f.kind === 'portal' ? '#4fd8ff' : f.kind === 'poison' ? '#b45cff' : '#ffd94a';
    r.rect(ox + f.x * TILE + 3, oy + f.y * TILE + 3, 2, 2, col, 0.85);
  }
}
