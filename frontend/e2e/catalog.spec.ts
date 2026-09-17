import { expect, test } from '@playwright/test';

/** Record browser-originated failures for each journey before it loads the app. */
function captureBrowserErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Authenticate through the normal UI flow. */
async function authenticate(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await page.getByLabel('4-digit verification code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('catalog selection', () => {
  test('loads seeded movies and mapped theatres from live API responses', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    const moviesResponse = page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET');
    await authenticate(page);
    const movies = await moviesResponse;
    expect(movies.status()).toBe(200);
    expect(await movies.json()).toMatchObject({ data: { movies: expect.arrayContaining([expect.objectContaining({ id: 'mov_paradise', title: 'Paradise' })]) } });
    await expect(page.getByRole('button', { name: 'Paradise' })).toBeVisible();

    const theatresResponse = page.waitForResponse((response) => response.url().includes('/api/theatres?movieId=mov_paradise') && response.request().method() === 'GET');
    await page.getByRole('button', { name: 'Paradise' }).click();
    const theatres = await theatresResponse;
    expect(theatres.status()).toBe(200);
    expect(await theatres.json()).toMatchObject({ data: { theatres: expect.arrayContaining([expect.objectContaining({ id: 'thr_sandhya', name: 'Sandhya 70mm' })]) } });
    await page.getByRole('button', { name: 'Sandhya 70mm' }).click();
    await expect(page.getByRole('status')).toContainText('Selected: Paradise at Sandhya 70mm.');
    expect(browserErrors).toEqual([]);
  });

  test('shows catalog loading and API error states without application changes', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await page.route('**/api/movies', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Catalog is temporarily unavailable.', requestId: 'playwright', details: [] } }) });
    });
    await authenticate(page);
    await expect(page.getByRole('status')).toContainText('Loading movies');
    await expect(page.getByText('Catalog is temporarily unavailable.', { exact: true })).toBeVisible();
    expect(browserErrors).toEqual([
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
    ]);
  });

  test('shows the empty movie catalogue returned after UI authentication', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    let fulfilledMovieRequest = false;
    await page.route('**/api/movies', async (route) => {
      fulfilledMovieRequest = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { movies: [] } }) });
    });

    await authenticate(page);

    expect(fulfilledMovieRequest).toBe(true);
    await expect(page.getByRole('status')).toHaveText('No movies are available right now.');
    await expect(page.getByRole('button', { name: 'Paradise' })).toHaveCount(0);
    expect(browserErrors).toEqual([]);
  });
});
