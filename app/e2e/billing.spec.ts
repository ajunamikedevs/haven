import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { signUp } from './helpers';

test.use({ timezoneId: 'Africa/Lagos' });

// Runs against the local AgentaOS stand-in (no AGENTAOS_API_KEY in tests), whose checkout page is
// /dev/checkout/[id] and whose state is in .data/fake-agentaos.json. Webhooks are signed with the
// test secret the Playwright web server is started with.
const SECRET = 'e2e-webhook-secret';
const STORE = '.data/fake-agentaos.json';

type Store = { checkouts: Record<string, { metadata: { customerId: string; subscriptionId?: string } }>; subscriptions: Record<string, { status: string; cancelAtPeriodEnd: boolean }> };
const readStore = async () => JSON.parse(await readFile(STORE, 'utf8')) as Store;

const outbox = async (to: string) => (await readFile('.data/outbox.jsonl', 'utf8').catch(() => '')).trim().split('\n').filter(Boolean)
  .map((l) => JSON.parse(l) as { to: string; subject: string }).filter((m) => m.to === to).map((m) => m.subject);

async function sendWebhook(page: Page, type: string, data: object, signature?: string) {
  const body = JSON.stringify({ type, data, business: 'org_test' });
  const t = Math.floor(Date.now() / 1000);
  const sig = signature ?? `t=${t},v1=${createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex')}`;
  return page.request.post('/api/webhooks/agentaos', { data: body, headers: { 'content-type': 'application/json', 'x-agentaos-signature': sig } });
}

const setTrial = (page: Page, days: number) => page.request.post('/api/test/trial', { data: { days } });

test('trial reminder, read-only after the trial, paying unlocks, failed payments and cancelling', async ({ page }) => {
  const email = await signUp(page);

  await page.goto('/billing');
  await expect(page.locator('#planStatus')).toContainText('Free trial: 14 days left.');
  await expect(page.getByRole('button', { name: 'Choose monthly' })).toBeVisible();

  // Three days out, the daily job sends one reminder, and only one
  expect((await setTrial(page, 2)).ok()).toBe(true);
  expect((await page.request.get('/api/cron/daily')).ok()).toBe(true);
  await page.request.get('/api/cron/daily');
  await expect.poll(() => outbox(email)).toContain('Your Haven trial ends Friday, November 20');
  expect((await outbox(email)).filter((s) => s.startsWith('Your Haven trial ends'))).toHaveLength(1);

  // Once the trial is over, everything is readable and nothing can be changed
  await setTrial(page, -1);
  await page.goto('/grocery');
  await expect(page.locator('.readonly-banner')).toContainText('Your free trial has ended.');
  await expect(page.locator('.item').first()).toBeVisible();

  // Paying: Haven → checkout → back, confirmed with the payment provider before unlocking
  await page.getByRole('link', { name: 'See plans' }).click();
  await page.getByRole('button', { name: 'Choose monthly' }).click();
  await page.waitForURL('**/dev/checkout/**');
  const sessionId = new URL(page.url()).pathname.split('/').pop()!;
  await page.getByRole('button', { name: 'Pay $5 (test)' }).click();
  await page.waitForURL('**/billing?payment=paid');
  await expect(page.locator('#paymentResult')).toHaveAttribute('data-result', 'paid');
  await expect(page.locator('.readonly-banner')).toHaveCount(0);
  await expect(page.locator('#planStatus')).toContainText('Monthly, $5 a month. Renews December 18, 2026.');
  await expect(page.getByRole('button', { name: 'Choose monthly' })).toHaveCount(0);
  await expect(page.locator('.receipts li')).toContainText(['HAVEN-TEST-0001']);

  // Someone else's session, or a made-up one, unlocks nothing
  await page.goto('/billing/return?sessionId=cs_local_made_up');
  await expect(page.locator('#paymentResult')).toHaveAttribute('data-result', 'unknown');

  // A failed renewal: access stays while the card is retried, and the organizer is told once
  const store = await readStore();
  const subId = store.checkouts[sessionId].metadata.subscriptionId!;
  expect(subId).toBeTruthy();
  store.subscriptions[subId].status = 'past_due';
  await writeFile(STORE, JSON.stringify(store, null, 2));
  const failed = { id: subId, status: 'past_due', link_id: 'local-monthly', current_period_end: null, cancel_at_period_end: false };
  const first = await sendWebhook(page, 'subscription.payment_failed', failed);
  expect(first.status()).toBe(200);
  // A retried delivery is recognised and does nothing
  const again = await sendWebhook(page, 'subscription.payment_failed', failed);
  expect(await again.json()).toMatchObject({ duplicate: true });
  expect((await sendWebhook(page, 'subscription.payment_failed', failed, 't=1,v1=00')).status()).toBe(400);

  await page.goto('/billing');
  await expect(page.locator('#planStatus')).toContainText('being retried');
  await expect.poll(async () => (await outbox(email)).filter((s) => s === 'Your Haven payment didn’t go through').length).toBe(1);
  await page.goto('/week');
  await expect(page.locator('.readonly-banner')).toHaveCount(0);

  // The card goes through; then the organizer cancels, keeping access to the end of the period
  const recovered = await readStore();
  recovered.subscriptions[subId].status = 'active';
  await writeFile(STORE, JSON.stringify(recovered, null, 2));
  expect((await sendWebhook(page, 'subscription.renewed', { ...failed, status: 'active' })).status()).toBe(200);
  await page.goto('/billing');
  await expect(page.locator('#planStatus')).toContainText('Renews December 18, 2026.');
  await page.getByRole('button', { name: 'Cancel plan' }).click();
  await page.getByRole('button', { name: 'Stop renewing' }).click();
  await expect(page.locator('#planStatus')).toContainText('It won’t renew: you have Haven until December 18, 2026.');
  await expect(page.getByRole('button', { name: 'Cancel plan' })).toHaveCount(0);
});
