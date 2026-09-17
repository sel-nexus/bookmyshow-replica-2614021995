import { expect, test } from '@playwright/test';

/** Record browser-originated failures for each journey before it loads the app. */
function captureBrowserErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.describe('mobile authentication', () => {
  test('requests an OTP and verifies the demo code through the API', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await page.goto('/login');
    await page.getByLabel('Mobile number').fill('9876543210');
    const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    const login = await loginResponse;
    expect(login.status()).toBe(200);
    expect(await login.json()).toMatchObject({ data: { mobile: '9876543210', nextStep: 'VERIFY_OTP', message: expect.any(String) } });
    await expect(page).toHaveURL('/otp');

    await page.getByLabel('4-digit verification code').fill('1234');
    const verifyResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    const verify = await verifyResponse;
    expect(verify.status()).toBe(200);
    expect(await verify.json()).toMatchObject({ data: { user: { id: expect.stringMatching(/\S+/), mobile: '9876543210' }, token: expect.any(String), tokenType: 'Bearer', expiresIn: 1800 } });
    await expect(page).toHaveURL('/dashboard');
    expect(browserErrors).toEqual([]);
  });

  test('redirects an unauthenticated user from the protected confirmation route', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await page.goto('/confirmation');
    await expect(page).toHaveURL('/login');
    expect(browserErrors).toEqual([]);
  });

  test('announces an invalid OTP without navigating', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await page.goto('/login');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await page.getByLabel('4-digit verification code').fill('0000');
    const invalidOtpResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    const invalidOtp = await invalidOtpResponse;
    expect(invalidOtp.status()).toBe(401);
    expect(await invalidOtp.json()).toMatchObject({ error: { code: 'INVALID_OTP', message: expect.any(String), requestId: expect.any(String), details: expect.any(Array) } });
    await expect(page.getByText(/invalid/i, { exact: false })).toBeVisible();
    await expect(page).toHaveURL('/otp');
    expect(browserErrors).toEqual(['Failed to load resource: the server responded with a status of 401 (Unauthorized)']);
  });
});
