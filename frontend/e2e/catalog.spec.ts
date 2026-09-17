import { expect, test } from '@playwright/test';

/** Exercise the authenticated catalog selection journey against live services. */
test.describe('catalog selection', () => {
  /** Authenticate, load backend catalog content, and select a mapped theatre. */
  test('selects a seeded movie and theatre', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await page.goto('/login');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await page.getByLabel('4-digit verification code').fill('1234');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    await expect(page.getByRole('button', { name: 'Paradise' })).toBeVisible();
    await page.getByRole('button', { name: 'Paradise' }).click();
    await expect(page.getByRole('button', { name: 'Sandhya 70mm' })).toBeVisible();
    await page.getByRole('button', { name: 'Sandhya 70mm' }).click();
    await expect(page.getByRole('status')).toContainText('Selected: Paradise at Sandhya 70mm.');
    expect(browserErrors).toEqual([]);
  });
});
