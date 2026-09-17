import { expect, test } from '@playwright/test';

test.describe('mobile authentication', () => {
  test('requests an OTP and verifies the demo code', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await page.goto('/login');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await expect(page).toHaveURL('/otp');
    await page.getByLabel('4-digit verification code').fill('1234');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    await expect(page).toHaveURL('/dashboard');
    expect(browserErrors).toEqual([]);
  });

  test('announces an invalid OTP without navigating', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await page.getByLabel('4-digit verification code').fill('0000');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    await expect(page.getByRole('alert')).toContainText('invalid');
    await expect(page).toHaveURL('/otp');
  });
});
