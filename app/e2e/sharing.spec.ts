import { expect, test, type Page } from '@playwright/test';
import { signUp } from './helpers';

test.use({ timezoneId: 'Africa/Lagos' });

// Capture what would go to the phone's share sheet
const stubShare = (page: Page) => page.addInitScript(() => {
  (navigator as unknown as { share: (d: { url: string }) => Promise<void> }).share = async (d) => { (window as unknown as { __shared: string }).__shared = d.url; };
});
const sharedUrl = (page: Page) => page.evaluate(() => (window as unknown as { __shared: string }).__shared);
const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

test('a grocery link lets someone without an account tick items, and the organizer sees it', async ({ page, browser }) => {
  await stubShare(page);
  await signUp(page);
  await page.goto('/grocery');
  await page.getByRole('button', { name: 'Send list link' }).click();
  await expect.poll(() => sharedUrl(page)).toMatch(/\/s\/[0-9a-f]{32}[\w-]{43}$/);
  const listUrl = await sharedUrl(page);

  // Asking again gives the same link rather than piling up new ones
  await page.getByRole('button', { name: 'Send list link' }).click();
  expect(await sharedUrl(page)).toBe(listUrl);

  const guest = await (await browser.newContext()).newPage();
  const res = await guest.goto(listUrl);
  expect(res?.headers()['referrer-policy'] ?? (await guest.locator('meta[name="referrer"]').getAttribute('content'))).toContain('no-referrer');
  await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(guest.getByRole('heading', { name: 'Grocery list' })).toBeVisible();
  await expect(guest.locator('.item')).toHaveCount(26);
  await expect(guest.locator('#sharedLeft')).toHaveText('26 left to buy');
  // Nothing about the organizer or the rest of the app leaks onto the page
  await expect(guest.getByText('@example.com')).toHaveCount(0);
  await expect(guest.getByRole('navigation', { name: 'Main' })).toHaveCount(0);

  await guest.locator('.item', { hasText: '2 avocados' }).locator('label.text').click();
  await expect(guest.locator('#sharedLeft')).toHaveText('25 left to buy');
  await guest.reload();
  await expect(guest.locator('.item.got')).toHaveCount(1);

  await page.reload();
  await expect(page.locator('.list-summary strong')).toHaveText('1 of 26 in the cart');
  await expect(page.locator('.item.got .name')).toHaveText('2 avocados');

  // The week link is read-only
  await page.goto('/week');
  await page.getByRole('button', { name: 'Send this week to your household as a link' }).click();
  await expect.poll(() => sharedUrl(page)).toMatch(/\/s\/[0-9a-f]{32}[\w-]{43}$/);
  const weekUrl = await sharedUrl(page);
  expect(weekUrl).not.toBe(listUrl);
  await guest.goto(weekUrl);
  await expect(guest.locator('.day')).toHaveCount(7);
  await expect(guest.locator('.dinner-name').first()).toHaveText('Sheet-pan lemon chicken & potatoes');
  await expect(guest.locator('input[type="checkbox"]')).toHaveCount(0);

  // Switching a link off in Settings stops it at once
  await page.goto('/settings');
  await expect(page.locator('.link-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Switch off the grocery list link' }).click();
  await expect(page.locator('.link-row')).toHaveCount(1);
  await guest.goto(listUrl);
  await expect(guest.getByRole('heading', { name: 'This link didn’t open' })).toBeVisible();

  // Forged or altered addresses open nothing
  await guest.goto(weekUrl.slice(0, -1) + (weekUrl.endsWith('A') ? 'B' : 'A'));
  await expect(guest.getByRole('heading', { name: 'This link didn’t open' })).toBeVisible();
  await guest.goto('/s/not-a-real-link');
  await expect(guest.getByRole('heading', { name: 'This link didn’t open' })).toBeVisible();
  await guest.context().close();
});

test('a week saved by the old Haven in this browser can be brought over once', async ({ page }) => {
  const saved = {
    members: [{ id: 'm9', name: 'Ana', role: 'Parent', color: '#4F6A85' }],
    events: [{ id: 'e1', day: 2, time: '18:30', title: 'Choir', note: '', who: 'm9', done: false, repeat: true }],
    dinners: { 5: { libId: null, name: 'Taco night', minutes: null, effort: null, tags: ['Your meal'], ing: [['tortillas', null, '', 'Other']], cooked: false } },
    got: {}, extras: [{ id: 'x1', name: 'Milk', got: false }], isExample: false, nextId: 120,
  };
  await page.addInitScript((week) => { if (!localStorage.getItem('haven.v1')) localStorage.setItem('haven.v1', JSON.stringify(week)); }, saved);
  await signUp(page);

  await expect(page.getByRole('heading', { name: 'Bring over the week you planned here?' })).toBeVisible();
  await page.getByRole('button', { name: 'Bring it over' }).click();
  await expect(page.locator('#toast.show #toastMsg')).toHaveText('Your week from this device is here now.');
  await expect(page.locator('#day-5 .dinner-name')).toHaveText('Taco night');
  await expect(page.locator('#day-2 .ev-title')).toHaveText('Choir');
  await expect(page.locator('.legend')).toContainText('Ana');
  await expect(page.locator('.dinner-add')).toHaveCount(6);
  // The offer is made once
  await expect(page.getByRole('heading', { name: 'Bring over the week you planned here?' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bring over the week you planned here?' })).toHaveCount(0);
  await page.goto('/grocery');
  await expect(page.locator('.item', { hasText: 'Milk' })).toBeVisible();
});

test('old links keep working: snapshots open read-only and a handed-over week is kept for sign-in', async ({ page }) => {
  await page.goto('/#s=' + b64({ k: 'list', w: 'Nov 2', a: [['Produce', ['2 avocados', '1 onion']], ['Nowhere', ['<img src=x onerror=alert(1)>']]] }));
  await page.waitForURL('**/s/old**');
  await expect(page.getByRole('heading', { name: 'Grocery list' })).toBeVisible();
  await expect(page.locator('.item')).toHaveCount(3);
  await expect(page.locator('.note')).toContainText('older link');
  await expect(page.locator('img')).toHaveCount(0); // text from a link is shown as text, never as markup

  await page.goto('/#w=' + b64({ members: [{ id: 'm1', name: 'Ana' }], events: [], dinners: {}, isExample: false }));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('haven.v1'))).toContain('Ana');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
});
