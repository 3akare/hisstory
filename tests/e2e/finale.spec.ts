import { expect, Page, test } from '@playwright/test';
import { info } from './helpers';

async function coilUntil(page: Page, done: () => Promise<boolean>, tries = 80): Promise<void> {
  for (let i = 0; i < tries && !(await done()); i++) {
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.wrapBoss());
    await page.waitForTimeout(350);
  }
}

test('finale: three phases of the Hollow King, then the ending and credits', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug=1&chapter=10');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  expect((await info(page)).kingPhase).toBe(1);
  await page.keyboard.press('KeyD');
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(true as never));
  await expect.poll(async () => ((await info(page)).kingLanes as string[]).includes('fly'), { timeout: 10000 }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('king-phase1.png') });

  await coilUntil(page, async () => (await info(page)).kingPhase === 2);
  expect((await info(page)).kingPhase).toBe(2);
  // The phase is saved: the mini-checkpoint.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hisstory.save')!).story.kingPhase)).toBe(2);
  await expect.poll(async () => ((await info(page)).kingCameos as string[]).includes('up'), { timeout: 10000 }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('king-phase2.png') });

  await coilUntil(page, async () => (await info(page)).kingPhase === 3);
  await expect.poll(async () => (await info(page)).kingRings as number, { timeout: 20000 }).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('king-phase3.png') });

  await coilUntil(page, async () => (await info(page)).state === 'won');
  await expect.poll(async () => (await info(page)).state).toBe('won');
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('cutscene');
  await page.keyboard.press('Escape'); // skip the outro
  await expect.poll(async () => (await info(page)).scene).toBe('ending');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: testInfo.outputPath('ending.png') });
  const story = (await info(page)).story as { completed: boolean[] };
  expect(story.completed[9]).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await info(page)).scene).toBe('home');
});

test('finale: running out of lives in phase 2 restarts at phase 2', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug=1&chapter=10');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  await page.keyboard.press('KeyD');
  await coilUntil(page, async () => (await info(page)).kingPhase === 2);
  await page.evaluate(() => window.__HISSTORY_DEBUG__!.invincible(false as never));
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__HISSTORY_DEBUG__!.crash());
    await page.waitForTimeout(150);
  }
  await expect.poll(async () => (await info(page)).top).toBe('outoflives');
  await page.goto('/?debug=1&chapter=10');
  await expect.poll(async () => (await info(page)).scene).toBe('play');
  expect((await info(page)).kingPhase).toBe(2);
  expect(((await info(page)).story as { lives: number }).lives).toBe(3);
});
