import { expect, Page, test } from '@playwright/test';
import { info } from './helpers';

async function startChapter1(page: Page): Promise<void> {
  await page.goto('/?debug=1&scene=map');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('cutscene');
  await page.keyboard.press('Escape'); // skip
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  await page.keyboard.press('KeyD');
  await expect.poll(async () => (await info(page)).state).toBe('playing');
}

test('save: close mid-level, come back, and resume exactly where you were (paused)', async ({ page }, testInfo) => {
  await startChapter1(page);
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.fruitAhead());
    await expect.poll(async () => (await info(page)).eaten as number).toBeGreaterThanOrEqual(i);
  }
  // Pause writes the snapshot immediately.
  await page.keyboard.press('KeyP');
  await expect.poll(async () => (await info(page)).top).toBe('pause');
  const { head, eaten } = await info(page);
  expect(eaten as number).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: testInfo.outputPath('paused.png') });

  await page.goto('/?debug=1'); // a fresh visit, from the title screen
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  await page.keyboard.press('Enter'); // STORY → map, focused on the saved chapter
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  expect((await info(page)).selected).toBe(1);
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath('map-resume.png') });
  await page.keyboard.press('Enter'); // GO ON: no intro, straight back in
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  await expect.poll(async () => (await info(page)).top).toBe('pause');
  expect((await info(page)).eaten).toBe(eaten);
  expect((await info(page)).head).toEqual(head);
  await page.screenshot({ path: testInfo.outputPath('welcome-back.png') });

  await page.keyboard.press('Enter'); // RESUME → 3-2-1
  await expect.poll(async () => (await info(page)).state).toBe('countdown');
  await expect.poll(async () => (await info(page)).state, { timeout: 4000 }).toBe('playing');
});

test('save: switching tabs pauses the game and saves', async ({ page }) => {
  await startChapter1(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await info(page)).top).toBe('pause');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hisstory.save')!).story.resume);
  expect(saved.chapter).toBe(1);
});

test('save: the game still boots and plays when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  await page.goto('/');
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  expect((await info(page)).saveAvailable).toBe(false);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
});

test('pause menu: restart and quit', async ({ page }) => {
  await startChapter1(page);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await info(page)).top).toBe('pause');
  await page.keyboard.press('ArrowDown'); // RESTART
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).top).toBe('play');
  expect((await info(page)).state).toBe('ready');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await info(page)).top).toBe('pause');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown'); // MAP
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('map');
});
