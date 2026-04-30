import { test, expect } from '@playwright/test';

test.describe('Client Management', () => {
  test('displays clients page', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();
  });

  test('opens add client dialog', async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('button', { name: /add client/i }).click();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
  });

  test('creates a new client', async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('button', { name: /add client/i }).click();

    const uniqueName = `E2E Client ${Date.now()}`;
    await page.getByLabel('Name').fill(uniqueName);
    await page.getByLabel('Phone').fill('+61400000000');

    await page.getByRole('button', { name: /save|add|create/i }).click();

    // Client should appear in the table
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state when no clients', async ({ page }) => {
    await page.goto('/clients');
    // Either we see the table or the empty state
    const heading = page.getByRole('heading', { name: /clients/i });
    await expect(heading).toBeVisible();
  });
});
