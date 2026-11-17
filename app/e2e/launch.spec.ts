import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { magicLinkFor, signUp } from './helpers';

test.use({ timezoneId: 'Africa/Lagos' });

test('legal pages are linked and name AgentaOS', async ({ page }) => {
  await page.goto('/');
  const legal = page.getByRole('navigation', { name: 'Legal' });
  for (const [link, heading] of [['Terms', 'Terms of Service'], ['Privacy', 'Privacy Policy'], ['Refunds', 'Refund Policy']]) {
    await legal.getByRole('link', { name: link }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('article.legal')).toContainText('AgentaOS');
    await page.goto('/');
  }
  await page.goto('/signin');
  await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
});

test('security headers, the manifest and the offline page are served', async ({ page }) => {
  const res = await page.goto('/');
  const h = res!.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toContain("object-src 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-powered-by']).toBeUndefined();

  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: 'Haven', start_url: '/week', display: 'standalone' });
  expect((await page.request.get('/icons/maskable-512.png')).ok()).toBe(true);
  expect((await page.request.get('/sw.js')).ok()).toBe(true);
  await page.goto('/offline');
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
});

test('an organizer can export everything, then delete the account for good', async ({ page }) => {
  const email = await signUp(page);
  await page.goto('/settings');

  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export my data' }).click();
  const file = await (await download).path();
  const data = JSON.parse(await readFile(file, 'utf8'));
  expect(data.format).toBe('haven-export-v1');
  expect(data.account.email).toBe(email);
  expect(data.members.length).toBeGreaterThan(0);
  expect(data.dinners.length).toBeGreaterThan(0);
  expect(JSON.stringify(data)).not.toContain('tokenHash');
  expect(JSON.stringify(data)).not.toContain('householdId');

  // Signed out, the export gives nothing away
  const anon = await page.context().browser()!.newContext();
  expect((await anon.request.get('http://localhost:3210/api/export')).status()).toBe(401);
  await anon.close();

  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByLabel(/to confirm/).fill('someone-else@example.com');
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.locator('#deleteError')).toContainText('Type the email address');

  await page.getByLabel(/to confirm/).fill(email);
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.waitForURL('**/?deleted=1');
  await expect(page.getByRole('status')).toContainText('Your account and everything in it have been deleted.');

  // The old session is gone, and signing in again starts from nothing
  await page.goto('/week');
  await page.waitForURL('**/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('Check your email.')).toBeVisible();
  await page.goto(await magicLinkFor(email));
  await page.waitForURL('**/welcome');
});
