import type { Page } from '@playwright/test';

export type GameInfo = Record<string, unknown> & { scene?: string; state?: string; length?: number; points?: number };

export async function info(page: Page): Promise<GameInfo> {
  return page.evaluate(() => (window.__HISSTORY__ ? window.__HISSTORY__() : {}));
}

/** True if the canvas has more than a handful of distinct colours (i.e. something was drawn). */
export async function canvasIsDrawn(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const c = document.getElementById('game') as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return seen.size > 8;
  });
}
