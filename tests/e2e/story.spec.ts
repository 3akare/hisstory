import { expect, Page, test } from '@playwright/test';
import { info } from './helpers';

async function advanceCutscene(page: Page): Promise<void> {
  await expect.poll(async () => (await info(page)).scene).toBe('cutscene');
  // Each press finishes the typing or moves to the next line.
  for (let i = 0; i < 40; i++) {
    const s = await info(page);
    if (s.scene !== 'cutscene' || s.cutsceneDone) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);
  }
}

test('story: Home → map → Ch1 cutscene → clear → Grub → clear → checkpoint, and it survives a reload', async ({ page }, testInfo) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  await page.keyboard.press('Enter'); // STORY
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  expect((await info(page)).selected).toBe(1);
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath('map-fresh.png') });

  await page.keyboard.press('Enter'); // play Ch1
  await expect.poll(async () => (await info(page)).scene).toBe('cutscene');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: testInfo.outputPath('cutscene.png') });
  await advanceCutscene(page);
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  expect((await info(page)).level).toBe('CH1 THE ORCHARD');
  await page.keyboard.press('KeyD');
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath('ch1.png') });
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.win());
  await expect.poll(async () => (await info(page)).state).toBe('won');
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('cutscene'); // outro
  await advanceCutscene(page);
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  expect((await info(page)).selected).toBe(3); // Grub is next

  await page.keyboard.press('Enter');
  await advanceCutscene(page);
  await expect.poll(async () => (await info(page)).level).toBe('CH3 GRUB THE MOLE');
  await page.keyboard.press('KeyD');
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.win());
  await expect.poll(async () => (await info(page)).state).toBe('won');
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter');
  await advanceCutscene(page);
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath('map-after-grub.png') });

  const story = (await info(page)).story as { completed: boolean[]; checkpoint: number };
  expect(story.completed[0]).toBe(true);
  expect(story.completed[2]).toBe(true);
  expect(story.checkpoint).toBeGreaterThanOrEqual(3); // Grub's checkpoint (moves on once Act II exists)

  await page.reload();
  await expect.poll(async () => (await info(page)).scene).toBe('home');
  const after = (await info(page)).story as { completed: boolean[] };
  expect(after.completed[0] && after.completed[2]).toBe(true);
});

test('story: running out of lives goes to the checkpoint with 3 lives', async ({ page }) => {
  await page.goto('/?debug=1&scene=map');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  await page.keyboard.press('Enter');
  await advanceCutscene(page);
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.crash());
    await page.waitForTimeout(100);
  }
  await expect.poll(async () => (await info(page)).top).toBe('outoflives');
  expect(((await info(page)).story as { lives: number }).lives).toBe(3);
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  expect((await info(page)).selected).toBe(1);
});

test('story: skip button and Escape skip the cutscene', async ({ page }) => {
  await page.goto('/?debug=1&scene=map');
  await expect.poll(async () => (await info(page)).scene).toBe('map');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('cutscene');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
});
