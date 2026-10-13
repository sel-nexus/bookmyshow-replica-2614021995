/** Exercise appearance against the configured real frontend, API, and SQLite booking flow. */
import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { restoreNetwork, throttleCatalogue, withEmptyTheatreFixture } from './theme-fixtures';

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

/** Capture the actual status foreground and its effective painted background, not just theme tokens. */
async function darkStatusEvidence(page: Page, info: TestInfo, text: string, name: string): Promise<void> {
  const status = page.getByRole('status').filter({ hasText: text });
  await expect(status).toHaveText(text);
  await expect(status).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const rendered = await status.evaluate((element) => {
    let backgroundElement: Element | null = element;
    let background = 'rgba(0, 0, 0, 0)';
    while (backgroundElement) {
      background = getComputedStyle(backgroundElement).backgroundColor;
      if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break;
      backgroundElement = backgroundElement.parentElement;
    }
    return { html: element.outerHTML, foreground: getComputedStyle(element).color, background };
  });
  expect(rendered.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(contrast(rendered.foreground, rendered.background)).toBeGreaterThanOrEqual(4.5);
  await info.attach(`${name}-status-styles`, {
    body: JSON.stringify(rendered, null, 2), contentType: 'application/json',
  });
  await evidence(page, info, name);
}

/** Reach OTP through the UI and the real login endpoint; callers initiate verification themselves. */
async function prepareDarkLogin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('combobox', { name: 'Appearance' }).selectOption('dark');
  await page.getByLabel('Mobile number').fill('9876543210');
  const loginResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  const login = await loginResponse;
  expect(login.status()).toBe(200);
  expect(await login.json()).toMatchObject({ data: { mobile: '9876543210', nextStep: 'VERIFY_OTP' } });
  await page.getByLabel('4-digit verification code').fill('1234');
}

/** Exercise a genuine backend rejection and recovery without relaxing runtime-error checks. */
test('Dark invalid OTP shows a readable backend alert and retries into the real dashboard', async ({ page }, info) => {
  const pageErrors: string[] = [];
  const consoleErrors: { text: string; url: string }[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push({ text: message.text(), url: message.location().url });
    }
  });
  let assertedInvalidResponseUrl: string | undefined;
  try {
    await prepareDarkLogin(page);
    await expect(page).toHaveURL(/\/otp$/);
    await expect(page.getByRole('combobox', { name: 'Appearance' })).toHaveValue('dark');
    const otp = page.getByLabel('4-digit verification code');
    await otp.fill('0000');
    const isVerification = (response: import('@playwright/test').Response): boolean =>
      new URL(response.url()).pathname === '/api/auth/verify' && response.request().method() === 'POST';
    const invalidResponse = page.waitForResponse(isVerification);
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    const invalid = await invalidResponse;
    expect(invalid.request().postDataJSON()).toMatchObject({ mobile: '9876543210', otp: '0000' });
    expect(invalid.status()).toBe(401);
    const rejection = await invalid.json();
    expect(rejection).toMatchObject({ error: {
      code: 'INVALID_OTP', message: 'The demo OTP is invalid.',
      requestId: expect.any(String), details: expect.any(Array),
    } });
    assertedInvalidResponseUrl = invalid.url();
    const alert = page.locator('form').getByRole('alert');
    await expect(alert).toHaveText(rejection.error.message);
    await expect(alert).toBeVisible();
    await expect(otp).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/otp$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const rendered = await alert.evaluate((element) => {
      let backgroundElement: Element | null = element;
      let background = 'rgba(0, 0, 0, 0)';
      while (backgroundElement) {
        background = getComputedStyle(backgroundElement).backgroundColor;
        if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break;
        backgroundElement = backgroundElement.parentElement;
      }
      return { html: element.outerHTML, foreground: getComputedStyle(element).color, background };
    });
    expect(rendered.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(contrast(rendered.foreground, rendered.background)).toBeGreaterThanOrEqual(4.5);
    await info.attach('dark-invalid-otp-alert-styles', {
      body: JSON.stringify(rendered, null, 2), contentType: 'application/json',
    });
    await evidence(page, info, 'dark-invalid-otp');

    await otp.fill('1234');
    const validResponse = page.waitForResponse(isVerification);
    const moviesResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/movies' && response.request().method() === 'GET');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    const valid = await validResponse;
    expect(valid.request().postDataJSON()).toMatchObject({ mobile: '9876543210', otp: '1234' });
    expect(valid.status()).toBe(200);
    expect(await valid.json()).toMatchObject({ data: {
      user: { id: expect.stringMatching(/\S+/), mobile: '9876543210' },
      token: expect.stringMatching(/\S+/), tokenType: 'Bearer', expiresIn: 1800,
    } });
    const movies = await moviesResponse;
    expect(movies.status()).toBe(200);
    expect(await movies.json()).toMatchObject({ data: { movies: expect.arrayContaining([
      expect.objectContaining({ id: 'mov_paradise', title: 'Paradise' }),
    ]) } });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('button', { name: 'Paradise', exact: true })).toBeVisible();
    await expect(page.locator('form').getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Appearance' })).toHaveValue('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  } finally {
    expect.soft(pageErrors).toEqual([]);
    // Permit only this endpoint's browser resource diagnostic after asserting its real 401 payload.
    // Browsers may emit it more than once; neither require nor allow a blanket console-error count.
    expect.soft(consoleErrors.filter((error) => !(assertedInvalidResponseUrl !== undefined
      && error.url === assertedInvalidResponseUrl
      && error.text === 'Failed to load resource: the server responded with a status of 401 (Unauthorized)'))).toEqual([]);
  }
});

test('Dark real catalogue renders readable empty theatres and recovers with another movie', async ({ page }, info) => {
  const errors = captureErrors(page);
  await withEmptyTheatreFixture(async () => {
    await prepareDarkLogin(page);
    const moviesResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/movies');
    const verifyResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/verify');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    expect((await verifyResponse).status()).toBe(200);
    const movies = await moviesResponse;
    expect(movies.status()).toBe(200);
    expect(await movies.json()).toMatchObject({ data: { movies: expect.arrayContaining([
      expect.objectContaining({ id: 'mov_paradise', title: 'Paradise' }),
      expect.objectContaining({ id: 'mov_bloody_romeo', title: 'Bloody Romeo' }),
    ]) } });
    const emptyResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/theatres' && url.searchParams.get('movieId') === 'mov_paradise';
    });
    await page.getByRole('button', { name: 'Paradise', exact: true }).click();
    const empty = await emptyResponse;
    expect(empty.status()).toBe(200);
    expect(await empty.json()).toEqual({ data: { theatres: [] } });
    await expect(page.getByRole('button', { name: 'Paradise', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Sandhya 70mm', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Continue to checkout' })).toHaveCount(0);
    await darkStatusEvidence(page, info, 'No theatres are available for this movie.', 'dark-empty-theatres');
    const recoveryResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/theatres' && url.searchParams.get('movieId') === 'mov_bloody_romeo';
    });
    await page.getByRole('button', { name: 'Bloody Romeo', exact: true }).click();
    const recovery = await recoveryResponse;
    expect(recovery.status()).toBe(200);
    const payload = await recovery.json();
    expect(payload).toMatchObject({ data: { theatres: expect.arrayContaining([
      expect.objectContaining({ id: 'thr_sandhya', name: 'Sandhya 70mm' }),
    ]) } });
    await expect(page.getByRole('status').filter({ hasText: 'No theatres are available for this movie.' })).toHaveCount(0);
    for (const theatre of payload.data.theatres) {
      await expect(page.getByRole('button', { name: theatre.name, exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Sandhya 70mm', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Selected: Bloody Romeo at Sandhya 70mm.');
    await expect(page.getByRole('link', { name: 'Continue to checkout' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
  expect(errors).toEqual([]);
});

test('Dark movie and theatre loading statuses remain readable while genuine catalogue responses are pending', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = captureErrors(page);
  await prepareDarkLogin(page);
  let moviesReceived = false;
  const moviesRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/movies', { timeout: 90000 }
  );
  const moviesResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/movies', { timeout: 90000 }
  ).then((response) => { moviesReceived = true; return response; });
  const movieNetwork = await throttleCatalogue(page);
  try {
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    await moviesRequest;
    expect(moviesReceived).toBe(false);
    await darkStatusEvidence(page, info, 'Loading movies…', 'dark-loading-movies');
    expect(moviesReceived).toBe(false);
  } finally {
    await restoreNetwork(movieNetwork);
  }
  const movies = await moviesResponse;
  expect(movies.status()).toBe(200);
  const moviePayload = await movies.json();
  expect(moviePayload).toMatchObject({ data: { movies: expect.arrayContaining([
    expect.objectContaining({ id: 'mov_paradise', title: 'Paradise' }),
  ]) } });
  await expect(page.getByRole('status').filter({ hasText: 'Loading movies…' })).toHaveCount(0);
  for (const movie of moviePayload.data.movies) {
    await expect(page.getByRole('button', { name: movie.title, exact: true })).toBeVisible();
  }
  let theatresReceived = false;
  const isParadiseTheatres = (urlString: string): boolean => {
    const url = new URL(urlString);
    return url.pathname === '/api/theatres' && url.searchParams.get('movieId') === 'mov_paradise';
  };
  const theatresRequest = page.waitForRequest((request) => isParadiseTheatres(request.url()));
  const theatresResponse = page.waitForResponse((response) => isParadiseTheatres(response.url()))
    .then((response) => { theatresReceived = true; return response; });
  const theatreNetwork = await throttleCatalogue(page);
  try {
    await page.getByRole('button', { name: 'Paradise', exact: true }).click();
    await theatresRequest;
    expect(theatresReceived).toBe(false);
    await darkStatusEvidence(page, info, 'Loading theatres…', 'dark-loading-theatres');
    expect(theatresReceived).toBe(false);
  } finally {
    await restoreNetwork(theatreNetwork);
  }
  const theatres = await theatresResponse;
  expect(theatres.status()).toBe(200);
  const theatrePayload = await theatres.json();
  expect(theatrePayload).toMatchObject({ data: { theatres: expect.arrayContaining([
    expect.objectContaining({ id: 'thr_sandhya', name: 'Sandhya 70mm' }),
  ]) } });
  await expect(page.getByRole('status').filter({ hasText: 'Loading theatres…' })).toHaveCount(0);
  for (const theatre of theatrePayload.data.theatres) {
    await expect(page.getByRole('button', { name: theatre.name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Paradise', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});

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
    await expect(page.locator('form').getByRole('alert')).toHaveText('Enter a mobile number with 10 to 15 digits.');
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
    // checkout/page.tsx:56-63 schedules the genuine booking POST after 2000ms.
    // Hold only that browser timer while checking processing across theme switches.
    const paymentTime = Date.now();
    await page.clock.install({ time: paymentTime });
    await page.clock.pauseAt(paymentTime + 100);
    await page.getByRole('button', { name: 'Pay ₹450' }).click();
    await expect(page.getByRole('button', { name: 'Processing Payment...' })).toBeDisabled();
    await appearance.selectOption(other);
    await expect(page.getByRole('button', { name: 'Processing Payment...' })).toBeDisabled();
    await expect(draft).toHaveValue('cinema@demo');
    await appearance.selectOption(mode);
    await page.clock.runFor(2000);
    await page.clock.resume();
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
