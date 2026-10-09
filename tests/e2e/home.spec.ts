import { expect, test } from '@playwright/test';
import { canvasIsDrawn, info } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('home: title screen, music starts on first key, Classic starts from the menu', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  await expect.poll(() => canvasIsDrawn(page), { timeout: 10000 }).toBe(true);
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('home.png') });

  // First key press unlocks audio and starts the snake song.
  await page.keyboard.press('ArrowDown'); // also moves focus to CLASSIC
  await expect.poll(async () => (await info(page)).audio).toBe('running');
  await expect.poll(async () => (await info(page)).music).toBe('theme');

  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  await expect.poll(async () => (await info(page)).music).toBe('orchard');
});

test('home: the music toggle is remembered after a reload', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  expect((await info(page)).musicOn).toBe(true);
  await page.keyboard.press('KeyM');
  expect((await info(page)).musicOn).toBe(false);
  await page.reload();
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  expect((await info(page)).musicOn).toBe(false);
});

test('classic: a new best score is saved and survives a reload', async ({ page }, testInfo) => {
  await page.goto('/?debug=1&scene=classic');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  await page.keyboard.press('KeyD');
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.fruitAhead());
  await expect.poll(async () => (await info(page)).points).toBe(1);
  await expect.poll(async () => (await info(page)).top, { timeout: 8000 }).toBe('gameover');
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath('new-best.png') });
  expect((await info(page)).best).toBe(1);
  await page.goto('/');
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  expect((await info(page)).best).toBe(1);
});

test('home: menu works with a tap (pointer)', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  const L = (await info(page)).layout as { w: number; h: number; portrait: boolean; boardY: number };
  const box = (await page.locator('#game').boundingBox())!;
  // CLASSIC is the second button (see homeLayout): menu top + (20 + 6) + 10.
  const y = (L.portrait ? 184 : 54) + 26 + 10;
  await page.mouse.click(box.x + box.width / 2, box.y + (box.height * y) / L.h);
  await expect.poll(async () => (await info(page)).scene).toBe('play');
});
