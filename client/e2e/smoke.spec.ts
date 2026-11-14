import { test, expect } from '@playwright/test';

test.describe('Pensieve smoke', () => {
  test('landing loads with brand and demo controls', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Pensieve/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate sample' })).toBeVisible();
  });

  test('theme switcher opens theme options', async ({ page }) => {
    await page.goto('/');
    // WHY: landing nav uses the expanded ThemeSwitcher — accessible name is the
    // active theme label (e.g. "Nightshade"), not "Change theme" (collapsed-only aria-label).
    await page.getByRole('navigation').getByRole('button', { name: /Nightshade|Aurora|Marine|Ember|Verdigris|Carbon/i }).click();
    await expect(page.getByRole('menuitemradio', { name: 'Nightshade' })).toBeVisible();
  });

  test('unauthenticated create redirects to sign-in', async ({ page }) => {
    await page.goto('/create');
    await expect(page).toHaveURL(/sign-in/i, { timeout: 15_000 });
  });
});

test.describe('Authenticated flows', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'Set E2E_EMAIL + E2E_PASSWORD');

  test('sign-in reaches dashboard', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: /continue|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
