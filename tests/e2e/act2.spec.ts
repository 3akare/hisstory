import { expect, test } from '@playwright/test';
import { info } from './helpers';

for (const [ch, twists] of [
  [4, ['ice']],
  [5, ['portal', 'fog']],
] as const) {
  test(`act II: chapter ${ch} plays with its twist and can be cleared`, async ({ page }, testInfo) => {
    await page.goto(`/?debug=1&chapter=${ch}`);
    await expect.poll(async () => (await info(page)).scene).toBe('play');
    expect((await info(page)).twists).toEqual(twists);
    if (ch === 5) expect(((await info(page)).fruitKinds as string[]).filter((k) => k === 'portal')).toHaveLength(2);
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(1500);
    expect((await info(page)).state).toBe('playing');
    await page.screenshot({ path: testInfo.outputPath(`ch${ch}.png`) });
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.win());
    await expect.poll(async () => (await info(page)).state).toBe('won');
  });
}

test('act II: Mira + Grub, both must fall', async ({ page }, testInfo) => {
  await page.goto('/?debug=1&chapter=6');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  expect((await info(page)).bossHealth).toEqual([3, 3]);
  await page.keyboard.press('KeyD');
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: testInfo.outputPath('ch6.png') });
  // Coil whoever is up until both bars are empty.
  for (let i = 0; i < 40; i++) {
    const s = await info(page);
    if (s.state === 'won') break;
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.wrapBoss());
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
    await page.waitForTimeout(500);
  }
  await expect.poll(async () => (await info(page)).state, { timeout: 20000 }).toBe('won');
  expect((await info(page)).bossHealth).toEqual([0, 0]);
});
