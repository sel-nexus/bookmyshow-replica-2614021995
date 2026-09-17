import { expect, test } from '@playwright/test';

/** Complete the booking journey and verify the returned ticket is displayed. */
test('booking success navigates to a confirmation containing backend ticket fields', async ({ page }) => {
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

  await expect(page).toHaveURL(/\/confirmation$/);
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  await expect(page.getByText('₹450')).toBeVisible();
  await expect(page.getByText('UPI')).toBeVisible();
  await expect(page.getByText(/bkg_/)).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
