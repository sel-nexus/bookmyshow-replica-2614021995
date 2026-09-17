import { expect, test } from '@playwright/test';

/** Exercise the protected checkout journey against running frontend and backend services. */
test('verified user selects a show and receives a backend booking confirmation', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await page.getByLabel('4-digit verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await page.getByRole('button', { name: 'Paradise' }).click();
  await page.getByRole('button', { name: 'Sandhya 70mm' }).click();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await page.getByRole('radio', { name: 'UPI' }).check();
  await page.getByRole('button', { name: 'Pay ₹450' }).click();
  await expect(page.getByText('Processing Payment...')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Booking confirmed:', { timeout: 5000 });
  expect(consoleErrors).toEqual([]);
});
