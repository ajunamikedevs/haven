import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';

/** The newest sign-in link emailed to this address (dev servers write emails to .data/outbox.jsonl). */
export async function magicLinkFor(email: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const lines = (await readFile('.data/outbox.jsonl', 'utf8').catch(() => '')).trim().split('\n').filter(Boolean);
    const mine = lines.map((l) => JSON.parse(l) as { to: string; text: string }).filter((m) => m.to === email).pop();
    const link = mine?.text.match(/https?:\/\/\S+/)?.[0];
    if (link) return link;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('No sign-in email arrived for ' + email);
}

/** Signs up a brand-new organizer and lands on This Week with the example family. */
export async function signUp(page: Page): Promise<string> {
  const email = `test+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('Check your email.')).toBeVisible({ timeout: 30_000 }); // first request compiles the route
  await page.goto(await magicLinkFor(email));
  await page.waitForURL('**/welcome');
  await page.getByRole('button', { name: 'Start my free 14 days' }).click();
  await page.waitForURL('**/week');
  return email;
}
