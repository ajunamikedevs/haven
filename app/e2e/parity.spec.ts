import { expect, test, type Page } from '@playwright/test';
import { signUp } from './helpers';

// Every behaviour carried over from the prototype (haven.html). The test server's clock is
// pinned to a Wednesday, so "today" is day 2 and Thursday (day 3) is the one open night.

test.use({ timezoneId: 'Africa/Lagos' });

const toast = (page: Page) => page.locator('#toast.show #toastMsg');
const undo = (page: Page) => page.locator('#toast.show #toastAction');
const go = async (page: Page, tab: 'This Week' | 'Grocery' | 'Household') => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab }).click();
  await page.waitForURL(tab === 'This Week' ? '**/week' : tab === 'Grocery' ? '**/grocery' : '**/household');
};

test('this week: heads up, dinners, events and undo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await signUp(page);

  // Welcome card and what Haven noticed
  await expect(page.locator('.welcome')).toBeVisible();
  await expect(page.locator('.head-item .t')).toHaveText([
    'Thursday has no dinner yet, and Parent–teacher evening is at 6:00 pm.',
    'Grocery shop is Saturday, and 26 items are still to buy.',
  ]);
  await page.getByRole('button', { name: 'Look around the example first' }).click();
  await expect(page.locator('.welcome')).toHaveCount(0);
  await expect(page.locator('#day-2 .badge')).toHaveText('Today');
  await expect(page.locator('#tonightTitle')).toHaveText('Slow-cooker beef ragu');

  // Plan the open night from Heads up; busy evening shows quick meals first
  await page.locator('.head-item').first().click();
  const dinner = page.locator('#dinnerDialog');
  await expect(dinner.getByRole('heading', { name: 'Dinner for Thursday, Nov 19' })).toBeVisible();
  await expect(dinner.locator('.note')).toContainText('quick meals are shown first');
  await expect(dinner.getByRole('button', { name: 'Quick', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dinner.getByRole('button', { name: 'Show ingredients for Chickpea & spinach curry' }).click();
  await expect(dinner.locator('.ing')).toContainText('2 cans chickpeas');
  await dinner.locator('[data-id="chickpea-curry"]').click();
  await expect(page.locator('#day-3 .dinner-name')).toHaveText('Chickpea & spinach curry');
  await expect(toast(page)).toHaveText('Chickpea & spinach curry is on Thursday.');
  await expect(page.locator('.summary-line strong')).toHaveText('7 of 7 dinners planned');

  // Clear it, then take that back
  await page.locator('#day-3 .dinner-main').click();
  await dinner.getByRole('button', { name: 'Clear' }).click();
  await expect(page.locator('#day-3 .dinner-add')).toBeVisible();
  await expect(toast(page)).toHaveText('Thursday’s dinner cleared.');
  await undo(page).click();
  await expect(page.locator('#day-3 .dinner-name')).toHaveText('Chickpea & spinach curry');

  // Type your own, with ingredients
  await page.locator('#day-5 .dinner-main').click();
  await dinner.getByLabel('Change it to something else').fill('Taco night');
  await dinner.getByText('Add ingredients for the grocery list').click();
  await dinner.getByLabel('Ingredients, one per line').fill('tortillas\nground beef');
  await dinner.getByRole('button', { name: 'Save dinner' }).click();
  await expect(page.locator('#day-5 .dinner-name')).toHaveText('Taco night');

  // Mark cooked
  const cook = page.locator('#day-0 .cook-btn');
  await cook.click();
  await expect(cook).toHaveAttribute('aria-pressed', 'true');

  // Add a repeating event, edit it, tick it, delete it and undo
  await page.getByRole('button', { name: 'Add an event on Friday' }).click();
  const event = page.locator('#eventDialog');
  await event.getByLabel('What’s happening?').fill('Band practice');
  await event.getByLabel('Time').fill('16:30');
  await event.getByText('Repeats every week').click();
  await event.getByRole('button', { name: 'Add event' }).click();
  const row = page.locator('#day-4 .ev', { hasText: 'Band practice' });
  await expect(row.locator('.ev-note')).toHaveText('Every week');
  await expect(row.locator('.ev-time')).toHaveText('4:30 pm');
  await row.getByRole('button', { name: 'Edit Band practice' }).click();
  await event.getByLabel('What’s happening?').fill('Band rehearsal');
  await event.getByRole('button', { name: 'Save changes' }).click();
  const edited = page.locator('#day-4 .ev', { hasText: 'Band rehearsal' });
  await expect(edited).toBeVisible();
  await edited.locator('.check').click();
  await expect(edited).toHaveClass(/done/);
  await edited.getByRole('button', { name: 'Edit Band rehearsal' }).click();
  await event.getByRole('button', { name: 'Delete' }).click();
  await expect(edited).toHaveCount(0);
  await undo(page).click();
  await expect(edited).toBeVisible();

  // Everything survives a reload
  await page.reload();
  await expect(page.locator('#day-5 .dinner-name')).toHaveText('Taco night');
  await expect(page.locator('#day-0 .cook-btn')).toHaveAttribute('aria-pressed', 'true');

  // Layout rules: no sideways scroll, every target at least 44px
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const small = await page.evaluate(() => [...document.querySelectorAll('#app button, #app a, #app .check')]
    .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.width < 44 || b.height < 44); })
    .map((e) => (e.textContent || e.className).trim().slice(0, 30)));
  expect(small).toEqual([]);
  expect(errors).toEqual([]);
});

test('dinners first: blank week and fill open nights', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'Plan my dinners' }).click();
  await expect(page.locator('.dinner-add')).toHaveCount(7);
  await expect(page.locator('.legend')).toHaveCount(0);
  await expect(page.locator('.head-item .t')).toHaveText(['Tonight has no dinner yet.', '4 nights still open this week.']);

  await page.locator('.head-item[data-act="fill-week"]').click();
  await expect(toast(page)).toHaveText('Planned 4 nights. Tap any dinner to swap it.');
  await expect(page.locator('.dinner-add')).toHaveCount(3); // Monday, Tuesday and tonight stay open
  await undo(page).click();
  await expect(page.locator('.dinner-add')).toHaveCount(7);
});

test('grocery list and quick capture', async ({ page }) => {
  await signUp(page);
  await go(page, 'Grocery');
  await expect(page.locator('.list-summary strong')).toHaveText('0 of 26 in the cart');
  await expect(page.locator('.item', { hasText: '2 bag spinach' }).locator('.from')).toHaveText('For Sat, Sun');

  // Tick two things: they sink to the bottom of their section and the counts follow
  await page.locator('.item', { hasText: '2 avocados' }).locator('label.text').click();
  await page.locator('.item', { hasText: '1 onion' }).locator('label.text').click();
  await expect(page.locator('.list-summary strong')).toHaveText('2 of 26 in the cart');
  await expect(page.locator('.aisle[aria-label="Produce"] .item').last()).toHaveClass(/got/);
  await expect(page.locator('#groceryCount')).toHaveText('24');

  // Hand-added items land in a guessed section and can be removed and restored
  await page.getByLabel('Need something else?').fill('Paper towels');
  await page.getByLabel('Need something else?').press('Enter');
  await expect(toast(page)).toHaveText('Paper towels added to Other.');
  await page.getByRole('button', { name: 'Remove Paper towels from the list' }).click();
  await expect(page.locator('.item', { hasText: 'Paper towels' })).toHaveCount(0);
  await undo(page).click();
  await expect(page.locator('.item', { hasText: 'Paper towels' })).toBeVisible();

  // Uncheck all, and undo
  await page.getByRole('button', { name: 'Uncheck all' }).click();
  await expect(page.locator('.list-summary strong')).toHaveText('0 of 27 in the cart');
  await undo(page).click();
  await expect(page.locator('.list-summary strong')).toHaveText('2 of 27 in the cart');

  // Quick capture from the header: one field, stays open
  await page.getByRole('button', { name: 'Add something to the grocery list' }).click();
  const capture = page.locator('#captureDialog');
  await capture.getByLabel('What do you need?').fill('Milk');
  await capture.getByLabel('What do you need?').press('Enter');
  await expect(capture.locator('#justAdded li')).toHaveText(['Milk · Dairy & Eggs']);
  await capture.getByLabel('What do you need?').fill('Dish soap');
  await capture.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(capture.locator('#justAdded li')).toHaveCount(2);
  await capture.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.aisle[aria-label="Dairy & Eggs"] .item', { hasText: 'Milk' })).toBeVisible();
  await expect(page.locator('#groceryCount')).toHaveText('27');

  await page.reload();
  await expect(page.locator('.list-summary strong')).toHaveText('2 of 29 in the cart');
});

test('household, wrap-up and bulk resets', async ({ page }) => {
  await signUp(page);
  await go(page, 'Household');
  await expect(page.locator('.member')).toHaveCount(4);

  // Rename in place; an empty name is refused
  const maya = page.locator('.member').nth(2).getByLabel('Name');
  await maya.fill('Mia');
  await maya.press('Enter');
  await expect(toast(page)).toHaveText('Saved. The week now shows Mia.');
  const dan = page.locator('.member').nth(1).getByLabel('Name');
  await dan.fill('');
  await dan.press('Enter');
  await expect(dan).toHaveValue('Dan');

  // Add and remove people; a removed person's events become Everyone's
  await page.locator('#newName').fill('Grandma Rose');
  await page.getByRole('button', { name: 'Add to household' }).click();
  await expect(page.locator('.member')).toHaveCount(5);
  await page.getByRole('button', { name: 'Remove Leo' }).click();
  await expect(toast(page)).toHaveText('Leo removed. Their events are now marked Everyone.');
  await expect(page.locator('.member')).toHaveCount(4);
  await undo(page).click();
  await expect(page.locator('.member')).toHaveCount(5);

  await go(page, 'This Week');
  await expect(page.locator('.legend')).toContainText('Mia, 12');
  await expect(page.locator('.legend')).toContainText('Grandma Rose');

  // Wrap up: repeating plans carry over, the rest resets, and it can be undone
  await go(page, 'Household');
  await page.getByRole('button', { name: 'Wrap up the week' }).click();
  const wrap = page.locator('#weekDialog');
  await expect(wrap.locator('.keeps li')).toHaveCount(5);
  await expect(wrap.locator('.stat strong').first()).toContainText('2 / 6');
  await wrap.getByRole('button', { name: 'Start next week' }).click();
  await page.waitForURL('**/week');
  await expect(toast(page)).toHaveText('Next week is ready, with 5 repeating plans carried over.');
  await expect(page.locator('.dinner-add')).toHaveCount(7);
  await expect(page.locator('.ev')).toHaveCount(5);
  await undo(page).click();
  await expect(page.locator('.dinner-add')).toHaveCount(1);
  await expect(page.locator('.ev')).toHaveCount(11);

  // Bulk resets ask first
  await go(page, 'Household');
  await page.getByRole('button', { name: 'Clear this week' }).click();
  await page.locator('#confirmDialog').getByRole('button', { name: 'Keep it' }).click();
  await page.getByRole('button', { name: 'Clear this week' }).click();
  await page.locator('#confirmDialog').getByRole('button', { name: 'Clear the week' }).click();
  await page.waitForURL('**/week');
  await expect(page.locator('.ev')).toHaveCount(0);
  await expect(page.locator('.legend')).toContainText('Mia');
  await go(page, 'Household');
  await page.getByRole('button', { name: 'Restore the example' }).click();
  await page.locator('#confirmDialog').getByRole('button', { name: 'Restore example' }).click();
  await page.waitForURL('**/week');
  await expect(page.locator('.ev')).toHaveCount(11);
  await expect(page.locator('.legend')).toContainText('Maya');
});
