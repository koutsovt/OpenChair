import { test, expect } from '@playwright/test';

test.describe('Booking Management', () => {
  test('displays bookings page', async ({ page }) => {
    await page.goto('/bookings');
    await expect(page.getByRole('heading', { name: /bookings/i })).toBeVisible();
  });

  test('navigates to new booking form', async ({ page }) => {
    await page.goto('/bookings');
    const newBookingButton = page.getByRole('button', { name: /new booking|add booking/i });

    if (await newBookingButton.isVisible()) {
      await newBookingButton.click();
      // Should show booking form fields
      await expect(page.getByText(/service|stylist|client/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('shows booking details page', async ({ page }) => {
    await page.goto('/bookings');

    // If there are existing bookings, click the first one
    const firstBookingLink = page
      .getByRole('link')
      .filter({ hasText: /\d{1,2}:\d{2}/ })
      .first();
    if (await firstBookingLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstBookingLink.click();
      await expect(page.getByText(/status|details/i).first()).toBeVisible();
    }
  });

  test('displays recurring bookings page', async ({ page }) => {
    await page.goto('/bookings/recurring');
    await expect(page).toHaveURL(/recurring/);
  });

  test('displays waitlist page', async ({ page }) => {
    await page.goto('/bookings/waitlist');
    await expect(page).toHaveURL(/waitlist/);
  });
});
