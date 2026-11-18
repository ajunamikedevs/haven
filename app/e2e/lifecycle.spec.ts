import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { signUp } from './helpers';

test.use({ timezoneId: 'Africa/Lagos' });

const outbox = async (to: string) => (await readFile('.data/outbox.jsonl', 'utf8').catch(() => '')).trim().split('\n').filter(Boolean)
  .map((l) => JSON.parse(l) as { to: string; subject: string; text: string }).filter((m) => m.to === to);
const subjects = async (to: string) => (await outbox(to)).map((m) => m.subject);
const setTrial = (page: Page, days: number, ageDays?: number) => page.request.post('/api/test/trial', { data: { days, ageDays } });
const runDaily = async (page: Page) => expect((await page.request.get('/api/cron/daily')).ok()).toBe(true);

test('a new organizer who planned nothing gets one nudge, then one email when the trial ends', async ({ page }) => {
  const email = await signUp(page); // still on the example family

  // Day two of the trial: one nudge, however often the daily job runs
  expect((await setTrial(page, 12, 2)).ok()).toBe(true);
  await runDaily(page);
  await runDaily(page);
  await expect.poll(() => subjects(email)).toContain('Plan your first week in Haven');
  expect((await subjects(email)).filter((s) => s === 'Plan your first week in Haven')).toHaveLength(1);
  expect((await outbox(email)).find((m) => m.subject === 'Plan your first week in Haven')!.text).toContain('/week');

  // The day after the trial ends: one "trial has ended" email with a link to the plans
  expect((await setTrial(page, -1, 15)).ok()).toBe(true);
  await runDaily(page);
  await runDaily(page);
  await expect.poll(() => subjects(email)).toContain('Your Haven trial has ended');
  expect((await subjects(email)).filter((s) => s === 'Your Haven trial has ended')).toHaveLength(1);
  expect((await outbox(email)).find((m) => m.subject === 'Your Haven trial has ended')!.text).toContain('/billing');
});

test('an organizer who has planned dinners is not nudged', async ({ page }) => {
  const email = await signUp(page);
  await page.getByRole('button', { name: 'Plan my dinners' }).click();
  await page.locator('.head-item[data-act="fill-week"]').click();
  await expect(page.locator('.dinner-add')).toHaveCount(3);

  expect((await setTrial(page, 12, 2)).ok()).toBe(true);
  await runDaily(page);
  expect(await subjects(email)).not.toContain('Plan your first week in Haven');
});
