import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in');

  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL ?? 'test@openchair.dev');
  await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD ?? 'TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
