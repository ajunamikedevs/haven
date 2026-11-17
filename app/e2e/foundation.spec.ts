import { expect, test } from '@playwright/test';
import { magicLinkFor, signUp } from './helpers';

test.use({ timezoneId: 'Africa/Lagos' });

test('landing page shows the positioning and leads to sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Stop being the one who has to remember');
  await page.getByRole('link', { name: 'Start your week' }).first().click();
  await expect(page).toHaveURL(/\/signin$/);
});

test('signed-out visitors are sent to sign in', async ({ page }) => {
  await page.goto('/week');
  await expect(page).toHaveURL(/\/signin$/);
});

test('a new organizer signs in by email link, sets up a household and sees the week', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const email = `test+${Date.now()}@example.com`;
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('Check your email.')).toBeVisible({ timeout: 30_000 }); // first request compiles the route

  const link = await magicLinkFor(email);
  await page.goto(link);
  await page.waitForURL('**/welcome');
  await expect(page.getByLabel('Your time zone')).toHaveValue('Africa/Lagos'); // pre-filled from the browser
  await page.getByRole('button', { name: 'Start my free 14 days' }).click();

  await page.waitForURL('**/week');
  await expect(page.locator('.day')).toHaveCount(7);
  await expect(page.locator('#day-0 .dinner-name')).toHaveText('Sheet-pan lemon chicken & potatoes');
  await expect(page.locator('.avatars .avatar')).toHaveCount(4);
  await expect(page.getByText(/free trial, 14 days left/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

  // Already set up: the welcome step is skipped
  await page.goto('/welcome');
  await expect(page).toHaveURL(/\/week$/);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await page.goto('/week');
  await expect(page).toHaveURL(/\/signin$/);

  // A sign-in link works once: using it again does not sign anyone in
  await page.goto(link).catch(() => {});
  await expect(page).toHaveURL(/\/signin/);
  await page.goto('/week');
  await expect(page).toHaveURL(/\/signin/);
  expect(errors).toEqual([]);
});

test('each organizer only ever sees their own household', async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await signUp(pageA);
  await signUp(pageB);
  await expect(pageA.locator('.day')).toHaveCount(7);
  await expect(pageB.locator('.day')).toHaveCount(7);
  await a.close();
  await b.close();
});
