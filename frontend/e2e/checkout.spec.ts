import { expect, test } from '@playwright/test';

/** Record browser-originated failures for each journey before it loads the app. */
function captureBrowserErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Exercise the protected checkout journey against running frontend and backend services. */
test('verified user selects a show and receives an authoritative backend booking', async ({ page }) => {
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
  await expect(page.getByText('Processing Payment...')).toBeVisible();
  const booking = await bookingResponse;
  expect(booking.status()).toBe(201);
  expect(booking.request().headers().authorization).toMatch(/^Bearer\s.+/);
  expect(await booking.json()).toMatchObject({ data: { confirmationId: expect.stringMatching(/^bkg_/), movie: { id: 'mov_paradise', title: 'Paradise' }, theatre: { id: 'thr_sandhya', name: 'Sandhya 70mm' }, seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'UPI' } });
  await expect(page).toHaveURL('/confirmation');
  expect(browserErrors).toEqual([]);
});
