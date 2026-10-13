/** Exercise appearance against the configured real frontend, API, and SQLite booking flow. */
import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

/** Install error capture before any navigation; keep it active throughout the journey. */
function captureErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Measure WCAG text contrast for computed foreground/background colors. */
function contrast(foreground: string, background: string): number {
  const luminance = (color: string): number => {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
      const normalized = value / 255;
      return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
    });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

/** Attach text-based design preflight and human-review screenshots for a representative state. */
async function evidence(page: Page, info: TestInfo, name: string): Promise<void> {
  await info.attach(`${name}-html`, { body: await page.content(), contentType: 'text/html' });
  await info.attach(`${name}-aria`, {
    body: await page.locator('body').ariaSnapshot(), contentType: 'text/plain',
  });
  const styles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const root = getComputedStyle(document.documentElement);
    const roles = ['--background', '--surface', '--surface-raised', '--foreground',
      '--foreground-muted', '--border', '--ring', '--error', '--success', '--selected-surface'];
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const tokens = Object.fromEntries(roles.map((role) => {
      probe.style.color = `var(${role})`;
      return [role, getComputedStyle(probe).color];
    }));
    probe.remove();
    return {
      theme: document.documentElement.dataset.theme,
      background: body.backgroundColor, foreground: body.color,
      font: body.fontFamily, colorScheme: root.colorScheme, tokens,
      viewport: window.innerWidth, contentWidth: document.documentElement.scrollWidth,
    };
  });
  await info.attach(`${name}-styles`, { body: JSON.stringify(styles, null, 2), contentType: 'application/json' });
  expect(styles.contentWidth).toBeLessThanOrEqual(styles.viewport);
  expect(contrast(styles.foreground, styles.background)).toBeGreaterThanOrEqual(4.5);
  if (styles.theme === 'dark') {
    for (const token of ['--foreground-muted', '--error', '--success']) {
      expect(contrast(styles.tokens[token], styles.tokens['--surface-raised'])).toBeGreaterThanOrEqual(4.5);
    }
  }
  await info.attach(`${name}-screenshot`, {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
  });
}

test('defaults to Light despite dark OS, switches by keyboard, and persists through UI navigation and reload', async ({ page }) => {
  const errors = captureErrors(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const appearance = page.getByRole('combobox', { name: 'Appearance' });
  await expect(appearance).toHaveValue('light');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(appearance).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(appearance).toHaveValue('dark');
  const focus = await appearance.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor };
  });
  expect(focus.style).toBe('solid');
  expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);
  expect(focus.color).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: 'Continue with mobile' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(appearance).toHaveValue('dark');
  await page.getByLabel('Mobile number').fill('9876543210');
  await appearance.selectOption('light');
  await expect(page.getByLabel('Mobile number')).toHaveValue('9876543210');
  await expect(page).toHaveURL(/\/login$/);
  await appearance.selectOption('dark');
  await page.reload();
  await expect(appearance).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});

for (const storage of ['invalid', 'getter', 'read', 'write'] as const) {
  test(`mobile ${storage} storage safely defaults and permits session selection`, async ({ page }, info) => {
    const errors = captureErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((failure) => {
      if (failure === 'invalid') localStorage.setItem('bookmyshow-theme', 'system');
      if (failure === 'getter') {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked getter'); } });
      }
      if (failure === 'read') {
        Storage.prototype.getItem = () => { throw new Error('blocked read'); };
      }
      if (failure === 'write') {
        Storage.prototype.setItem = () => { throw new Error('blocked write'); };
      }
    }, storage);
    await page.goto('/login');
    const appearance = page.getByRole('combobox', { name: 'Appearance' });
    await expect(appearance).toHaveValue('light');
    await page.getByLabel('Mobile number').fill('123');
    await appearance.selectOption('dark');
    await expect(page.getByLabel('Mobile number')).toHaveValue('123');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await evidence(page, info, `mobile-dark-auth-error-${storage}`);
    await page.getByRole('link', { name: 'BOOKMYSHOW' }).click();
    await expect(appearance).toHaveValue('dark');
    await page.reload();
    await expect(appearance).toHaveValue('light');
    await appearance.selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
  });
}

for (const mode of ['light', 'dark'] as const) {
  test(`real ${mode} booking preserves auth, selections, draft payment and processing when switching`, async ({ page }, info) => {
    const errors = captureErrors(page);
    await page.setViewportSize(mode === 'dark' ? { width: 390, height: 844 } : { width: 1280, height: 900 });
    await page.goto('/login');
    const appearance = page.getByRole('combobox', { name: 'Appearance' });
    await appearance.selectOption(mode);
    await page.getByLabel('Mobile number').fill('9876543210');
    const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login'));
    await page.getByRole('button', { name: 'Send verification code' }).click();
    const login = await loginResponse;
    expect(login.status()).toBe(200);
    expect(await login.json()).toMatchObject({ data: { mobile: '9876543210', nextStep: 'VERIFY_OTP' } });
    await page.getByLabel('4-digit verification code').fill('1234');
    const other = mode === 'dark' ? 'light' : 'dark';
    await appearance.selectOption(other);
    await expect(page.getByLabel('4-digit verification code')).toHaveValue('1234');
    await appearance.selectOption(mode);
    const verifyResponse = page.waitForResponse((response) => response.url().includes('/api/auth/verify'));
    const moviesResponse = page.waitForResponse((response) => response.url().includes('/api/movies'));
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    const verify = await verifyResponse;
    expect(verify.status()).toBe(200);
    expect(await verify.json()).toMatchObject({ data: { user: { mobile: '9876543210' }, token: expect.any(String) } });
    const movies = await moviesResponse;
    expect(movies.status()).toBe(200);
    expect(await movies.json()).toMatchObject({ data: { movies: expect.arrayContaining([
      expect.objectContaining({ id: 'mov_paradise', title: 'Paradise' }),
    ]) } });
    const theatresResponse = page.waitForResponse((response) => response.url().includes('/api/theatres'));
    await page.getByRole('button', { name: 'Paradise', exact: true }).click();
    const theatres = await theatresResponse;
    expect(theatres.status()).toBe(200);
    expect(await theatres.json()).toMatchObject({ data: { theatres: expect.arrayContaining([
      expect.objectContaining({ id: 'thr_sandhya', name: 'Sandhya 70mm' }),
    ]) } });
    await page.getByRole('button', { name: 'Sandhya 70mm', exact: true }).click();
    await appearance.selectOption(other);
    await expect(page.getByRole('button', { name: 'Paradise', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Sandhya 70mm', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await appearance.selectOption(mode);
    await page.getByRole('link', { name: 'Continue to checkout' }).click();
    await expect(appearance).toHaveValue(mode);
    await expect(page.getByRole('button', { name: 'Pay ₹450' })).toBeDisabled();
    await page.getByRole('button', { name: 'Select Seats' }).click();
    await page.getByRole('radio', { name: 'UPI', exact: true }).check();
    const draft = page.getByLabel('UPI ID');
    await draft.fill('cinema@demo');
    await appearance.selectOption(other);
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(draft).toHaveValue('cinema@demo');
    await expect(page.getByRole('radio', { name: 'UPI', exact: true })).toBeChecked();
    for (const seat of ['A1', 'A2', 'A3']) {
      await expect(page.getByLabel(`${seat}, selected`, { exact: true })).toBeVisible();
    }
    await appearance.selectOption('dark');
    await evidence(page, info, `${mode}-journey-dark-checkout`);
    await appearance.selectOption(mode);
    const bookingResponse = page.waitForResponse((response) =>
      response.url().includes('/api/bookings') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Pay ₹450' }).click();
    await expect(page.getByRole('button', { name: 'Processing Payment...' })).toBeDisabled();
    await appearance.selectOption(other);
    await expect(page.getByRole('button', { name: 'Processing Payment...' })).toBeDisabled();
    await expect(draft).toHaveValue('cinema@demo');
    await appearance.selectOption(mode);
    const booking = await bookingResponse;
    expect(booking.status()).toBe(201);
    const payload = await booking.json();
    expect(payload).toMatchObject({ data: {
      confirmationId: expect.stringMatching(/^bkg_/),
      movie: { id: 'mov_paradise', title: 'Paradise' },
      theatre: { id: 'thr_sandhya', name: 'Sandhya 70mm' },
      seats: ['A1', 'A2', 'A3'], totalPrice: 450, paymentMethod: 'UPI',
    } });
    expect(booking.request().postDataJSON()).not.toHaveProperty('upiId');
    await expect(page).toHaveURL(/\/confirmation$/);
    for (const text of [payload.data.confirmationId, payload.data.movie.title,
      payload.data.theatre.name, payload.data.seats.join(', '), `₹${payload.data.totalPrice}`, payload.data.paymentMethod]) {
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    }
    await appearance.selectOption(other);
    await expect(page.getByText(payload.data.confirmationId, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/confirmation$/);
    await appearance.selectOption('dark');
    await evidence(page, info, `${mode}-journey-dark-confirmation`);
    await appearance.selectOption(mode);
    expect(errors).toEqual([]);
  });
}
