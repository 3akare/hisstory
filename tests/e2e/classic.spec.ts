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
    const L = (await info(page)).layout as { w: number; h: number; portrait: boolean; dpad: { cx: number; cy: number; r: number } };
    expect(L.portrait).toBe(true);
    // Tap the right arm of the on-screen d-pad.
    await page.mouse.click(box.x + (box.width * (L.dpad.cx + L.dpad.r * 0.6)) / L.w, box.y + (box.height * L.dpad.cy) / L.h);
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
