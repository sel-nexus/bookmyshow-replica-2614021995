import { expect, test } from '@playwright/test';

/** Record browser-originated failures for each journey before it loads the app. */
function captureBrowserErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Complete the live booking journey and verify its authoritative mobile ticket. */
test('mobile booking success shows the backend ticket and captures final states', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await page.getByLabel('4-digit verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await page.getByRole('button', { name: 'Paradise' }).click();
  await page.getByRole('button', { name: 'Sandhya 70mm' }).click();
  await page.screenshot({ path: 'test-results/mobile-selected-show.png', fullPage: true });
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await page.getByRole('radio', { name: 'UPI' }).check();
  const bookingResponse = page.waitForResponse((response) => response.url().includes('/api/bookings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Pay ₹450' }).click();
  const booking = await bookingResponse;
  expect(booking.status()).toBe(201);
  expect(await booking.json()).toMatchObject({ data: { confirmationId: expect.stringMatching(/^bkg_/), movie: { id: 'mov_paradise', title: 'Paradise' }, theatre: { id: 'thr_sandhya', name: 'Sandhya 70mm' }, seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'UPI' } });

  await expect(page).toHaveURL(/\/confirmation$/);
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  await expect(page.getByText('₹450')).toBeVisible();
  await expect(page.getByText('UPI')).toBeVisible();
  await expect(page.getByText(/bkg_/)).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-confirmation.png', fullPage: true });
  expect(browserErrors).toEqual([]);
});

/**
 * Verify the safe checkout state reached by browser history after leaving confirmation.
 * The current route graph returns to /checkout rather than the transient confirmation
 * fallback, so this journey does not prove that fallback.
 */
test('returns to checkout after a real booking and UI navigation', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
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
  const bookingResponse = page.waitForResponse((response) => response.url().includes('/api/bookings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Pay ₹450' }).click();
  const booking = await bookingResponse;
  expect(booking.status()).toBe(201);
  expect(await booking.json()).toMatchObject({ data: { confirmationId: expect.stringMatching(/^bkg_/) } });
  await expect(page).toHaveURL(/\/confirmation$/);

  await page.getByRole('link', { name: /BOOKMYSHOW/ }).click();
  await page.goBack();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('button', { name: 'Select Seats' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
