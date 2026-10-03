import { expect, test } from '@playwright/test';
import { info } from './helpers';

for (const [ch, twists] of [
  [7, ['speedRamp']],
  [8, ['wallGaps']],
] as const) {
  test(`act III: chapter ${ch} plays with its twist and can be cleared`, async ({ page }, testInfo) => {
    await page.goto(`/?debug=1&chapter=${ch}`);
    await expect.poll(async () => (await info(page)).scene).toBe('play');
    expect((await info(page)).twists).toEqual(twists);
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(1500);
    expect((await info(page)).state).toBe('playing');
    await page.screenshot({ path: testInfo.outputPath(`ch${ch}.png`) });
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.win());
    await expect.poll(async () => (await info(page)).state).toBe('won');
  });
}

test('act III: Viper races, and four coils win', async ({ page }, testInfo) => {
  await page.goto('/?debug=1&chapter=9');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  expect((await info(page)).bossHealth).toEqual([4]);
  await page.keyboard.press('KeyD');
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: testInfo.outputPath('ch9.png') });
  for (let i = 0; i < 60; i++) {
    const s = await info(page);
    if (s.state === 'won') break;
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.wrapBoss());
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
    await page.waitForTimeout(400);
  }
  await expect.poll(async () => (await info(page)).state, { timeout: 20000 }).toBe('won');
  expect((await info(page)).bossHealth).toEqual([0]);
});
