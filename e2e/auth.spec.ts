import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Sign Up', () => {
    test('shows sign-up form with required fields', async ({ page }) => {
      await page.goto('/sign-up');
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('has link to sign-in page', async ({ page }) => {
      await page.goto('/sign-up');
      const signInLink = page.getByRole('link', { name: /sign in/i });
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveAttribute('href', '/sign-in');
    });

    test('shows validation for empty required fields', async ({ page }) => {
      await page.goto('/sign-up');
      // HTML5 required validation prevents submission
      const firstNameInput = page.getByLabel('First Name');
      await expect(firstNameInput).toHaveAttribute('required', '');
    });

    test('successful sign-up redirects to sign-in', async ({ page }) => {
      await page.goto('/sign-up');
      const uniqueEmail = `test-${Date.now()}@openchair.dev`;

      await page.getByLabel('First Name').fill('Test');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel('Password').fill('TestPassword123!');
      await page.getByRole('button', { name: /create account/i }).click();

      await page.waitForURL('**/sign-in', { timeout: 10_000 });
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Sign In', () => {
    test('shows sign-in form', async ({ page }) => {
      await page.goto('/sign-in');
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('has link to sign-up page', async ({ page }) => {
      await page.goto('/sign-in');
      const signUpLink = page.getByRole('link', { name: /sign up/i });
      await expect(signUpLink).toBeVisible();
      await expect(signUpLink).toHaveAttribute('href', '/sign-up');
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/sign-in');
      await page.getByLabel('Email').fill('wrong@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for error toast
      await expect(page.getByText(/invalid email or password/i)).toBeVisible({
        timeout: 10_000,
      });
    });

    test('successful sign-in redirects to dashboard', async ({ page }) => {
      await page.goto('/sign-in');
      await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL ?? 'test@openchair.dev');
      await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD ?? 'TestPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      await page.waitForURL('**/dashboard**', { timeout: 15_000 });
      await expect(page).toHaveURL(/dashboard/);
    });
  });
});
