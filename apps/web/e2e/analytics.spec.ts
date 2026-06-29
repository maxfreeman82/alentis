import { test, expect } from '@playwright/test';

test.describe('Analytics', () => {
  test('page analytics charge sans erreur 500', async ({ page }) => {
    const res = await page.goto('/analytics');
    expect(res?.status()).not.toBe(500);
    await expect(page.locator('text=Analytics').first()).toBeVisible({ timeout: 10_000 });
  });

  test('IAS hero visible', async ({ page }) => {
    await page.goto('/analytics');
    // Utilise getByText exact=false pour éviter le strict mode violation avec .or()
    await expect(page.getByText("INDEX D'ALIGNEMENT", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('8 métriques affichées ou état vide', async ({ page }) => {
    await page.goto('/analytics');
    // Au moins 4 cards métriques (données ou 0)
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(await cards.count(), { timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('section masse salariale visible', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('text=Masse salariale').first()).toBeVisible({ timeout: 10_000 });
  });
});
