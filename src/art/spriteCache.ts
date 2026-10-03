import { BIOMES, BiomeId, colourFor } from './palettes';
import { SpriteDef } from './sprites';

/**
 * Turns text-grid sprites into small images once, then reuses them.
 * Drawing a cached image is far cheaper than painting pixel by pixel every frame.
 */
const cache = new Map<string, HTMLCanvasElement>();

export function spriteImage(name: string, def: SpriteDef, biome: BiomeId = 'orchard'): HTMLCanvasElement {
  const key = `${name}@${biome}`;
  let img = cache.get(key);
  if (img) return img;
  const pal = BIOMES[biome];
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  img = document.createElement('canvas');
  img.width = w;
  img.height = h;
  const ctx = img.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    const row = def.rows[y];
    for (let x = 0; x < row.length; x++) {
      const col = colourFor(row[x], pal);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, img);
  return img;
}
