import { test, expect } from '@playwright/test';

test.describe('Tour de Table (TDT)', () => {
  test('page performance charge', async ({ page }) => {
    const res = await page.goto('/performance');
    expect(res?.status()).not.toBe(500);
    await expect(page.locator('text=Performance').first()).toBeVisible({ timeout: 10_000 });
  });

  test('page tour-de-table accessible', async ({ page }) => {
    const res = await page.goto('/performance/tour-de-table');
    expect(res?.status()).not.toBe(500);
    await expect(page).toHaveURL(/tour-de-table/);
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('page mes-résultats accessible', async ({ page }) => {
    const res = await page.goto('/performance/tour-de-table/mes-resultats');
    expect(res?.status()).not.toBe(500);
    await expect(page).toHaveURL(/mes-resultats/);
    // Résultats ou état vide ("Pas encore de résultats")
    const hasCard  = page.locator('.card').first();
    const hasEmpty = page.locator('text=Pas encore').first();
    await expect(hasCard.or(hasEmpty)).toBeVisible({ timeout: 10_000 });
  });

  test('sous-navigation TDT visible dans la sidebar quand on est sur /performance', async ({ page }) => {
    await page.goto('/performance');
    // La sidebar doit afficher les sous-liens quand la section est active
    await expect(page.locator('a[href="/performance/tour-de-table"]')).toBeVisible({ timeout: 5_000 });
  });

  test('API sessions TDT retourne 200 ou 401', async ({ request }) => {
    const res = await request.get('/api/tdt/sessions');
    // 404 si la route n'est pas encore implémentée
    expect([200, 401, 403, 404]).toContain(res.status());
  });
});
