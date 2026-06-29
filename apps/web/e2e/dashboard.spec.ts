import { test, expect } from '@playwright/test';

test.describe('Dashboard IAS', () => {
  test('charge la page et affiche les éléments principaux', async ({ page }) => {
    const res = await page.goto('/dashboard');
    expect(res?.status()).not.toBe(500);
    await expect(page).toHaveURL(/dashboard/);

    // Section header
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10_000 });
  });

  test('affiche au moins un card (données ou état vide)', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('la barre de navigation est visible', async ({ page }) => {
    await page.goto('/dashboard');
    // Sidebar présente
    await expect(page.locator('aside')).toBeVisible();
    // Lien dashboard actif
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
  });

  test('les alertes sont affichées ou absentes (pas de crash)', async ({ page }) => {
    await page.goto('/dashboard');
    // Pas d'erreur React visible
    await expect(page.locator('text=Application error')).not.toBeVisible();
    await expect(page.locator('text=Server Error')).not.toBeVisible();
  });
});
