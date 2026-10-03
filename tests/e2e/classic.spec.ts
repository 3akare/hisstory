import { expect, test } from '@playwright/test';
import { canvasIsDrawn, info } from './helpers';

test('classic: the snake moves, then crashes into the wall and shows game over', async ({ page }, testInfo) => {
  await page.goto('/?debug=1&seed=3');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  expect(await canvasIsDrawn(page)).toBe(true);
  expect((await info(page)).state).toBe('ready');

  if (testInfo.project.name === 'mobile') {
    // Tap the right arrow of the on-screen d-pad.
    const box = (await page.locator('#game').boundingBox())!;
    const layout = await page.evaluate(() => {
      const c = document.getElementById('game') as HTMLCanvasElement;
      return { w: c.width, h: c.height };
    });
    expect(layout.h).toBeGreaterThan(layout.w); // portrait layout
    // Portrait layout: logical 208×370, d-pad centre (104, 286), radius 54.
    await page.mouse.click(box.x + (box.width * (104 + 34)) / 208, box.y + (box.height * 286) / 370);
  } else {
    await page.keyboard.press('KeyD');
  }
  await expect.poll(async () => (await info(page)).state).toBe('playing');
  const start = (await info(page)).head as { x: number };
  await page.waitForTimeout(500);
  const later = (await info(page)).head as { x: number };
  expect(later.x).toBeGreaterThan(start.x);
  await page.screenshot({ path: testInfo.outputPath('moving.png') });

  // Heading right from x=8 hits the wall within ~16 steps.
  await expect.poll(async () => (await info(page)).state, { timeout: 8000 }).toBe('dead');
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath('gameover.png') });
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).state).toBe('ready');
});
