import { expect, test } from '@playwright/test';
import { info } from './helpers';

test('grub: coil him three times to win', async ({ page }, testInfo) => {
  await page.goto('/?debug=1&boss=grub&seed=5');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  const start = await info(page);
  expect(start.lives).toBe(3);
  expect(start.bossHealth).toEqual([3]);

  // Start moving, make Pip invincible so the test isn't about steering skill.
  await page.keyboard.press('KeyD');
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
  for (let hit = 1; hit <= 3; hit++) {
    await expect.poll(async () => (await info(page)).bossMode, { timeout: 15000 }).toBe('up');
    if (hit === 1) await page.screenshot({ path: testInfo.outputPath('grub-up.png') });
    const ok = await page.evaluate(() => window.__HISSTORY_DEBUG__!.wrapBoss());
    expect(ok).toBe(true);
    if (hit === 1) {
      await page.waitForTimeout(120);
      await page.screenshot({ path: testInfo.outputPath('grub-coiled.png') });
    }
    expect((await info(page)).bossHealth).toEqual([3 - hit]);
    if (hit < 3) await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
  }
  await expect.poll(async () => (await info(page)).state).toBe('won');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: testInfo.outputPath('grub-defeated.png') });
});

test('grub: crashing costs a heart and respawns paused', async ({ page }) => {
  await page.goto('/?debug=1&boss=grub&seed=5');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  await page.keyboard.press('KeyW'); // straight up into the top wall
  await expect.poll(async () => (await info(page)).lives, { timeout: 8000 }).toBe(2);
  expect((await info(page)).state).toBe('ready');
  await page.waitForTimeout(1000);
  await page.keyboard.press('KeyD');
  await expect.poll(async () => (await info(page)).state).toBe('playing');
});
