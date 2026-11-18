import { expect, test } from '@playwright/test';
import { magicLinkFor, signUp } from './helpers';

test.use({ timezoneId: 'Africa/Lagos' });

// OWNER_EMAILS is set to this address in playwright.config.ts
const OWNER = 'owner@example.com';

test('only the owner can open metrics, and customers show up in them', async ({ page, browser }) => {
  // A customer signs up and plans: they count, but /metrics is a plain 404 for them
  await signUp(page);
  // The page streams, so the status is already sent; what matters is that nothing is shown
  await page.goto('/metrics');
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
  await expect(page.getByText('Monthly revenue')).toHaveCount(0);

  // The owner signs in (the account may exist from an earlier run)
  const owner = await (await browser.newContext({ timezoneId: 'Africa/Lagos' })).newPage();
  await owner.goto('/signin');
  await owner.getByLabel('Email').fill(OWNER);
  await owner.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(owner.getByText('Check your email.')).toBeVisible({ timeout: 30_000 });
  await owner.goto(await magicLinkFor(OWNER));
  await owner.waitForURL(/\/(welcome|week)$/);
  if (owner.url().endsWith('/welcome')) {
    await owner.getByRole('button', { name: 'Start my free 14 days' }).click();
    await owner.waitForURL('**/week');
  }

  await owner.goto('/metrics');
  await expect(owner.getByRole('heading', { level: 1, name: 'Metrics' })).toBeVisible();
  await expect(owner.getByText('Your own household is left out.')).toBeVisible();
  const households = owner.locator('.metric-tile', { hasText: 'Households' }).locator('.metric-value');
  expect(Number(await households.textContent())).toBeGreaterThan(0);
  await expect(owner.getByRole('heading', { name: 'From sign-up to paid' })).toBeVisible();
  await expect(owner.locator('.funnel li').first()).toContainText('Signed up');
  await expect(owner.getByRole('table')).toContainText('Week of');
  await owner.context().close();
});
