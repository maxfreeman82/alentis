import { test, expect } from '@playwright/test';

test.describe('Rémunération & Paie', () => {
  test('page rémunération charge sans erreur', async ({ page }) => {
    const res = await page.goto('/remuneration');
    expect(res?.status()).not.toBe(500);
    await expect(page.locator('text=Rémunération').first()).toBeVisible({ timeout: 10_000 });
  });

  test('tableau des bulletins visible ou état vide', async ({ page }) => {
    await page.goto('/remuneration');
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });

  test('API calculate retourne un résultat cohérent', async ({ request }) => {
    const res = await request.post('/api/remuneration/calculate', {
      data: {
        salaireBrut:     500_000,
        situation:       'celibataire',
        enfants:         0,
        sectorRisk:      'low',
        primes:          0,
        avantagesNature: 0,
        retenuePrevoy:   0,
      },
    });
    if (res.status() === 200) {
      const body = await res.json() as { salaireNet?: number; totalBrut?: number };
      // Net < Brut
      expect(body.salaireNet).toBeDefined();
      expect(body.salaireNet!).toBeGreaterThan(0);
      expect(body.salaireNet!).toBeLessThan(body.totalBrut ?? Infinity);
    } else {
      // 400 = données invalides, 401/403 = protégé
      expect([200, 400, 401, 403]).toContain(res.status());
    }
  });

  test('route print bulletin retourne HTML ou 401', async ({ request }) => {
    // UUID factice pour tester la route sans données réelles
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await request.get(`/api/remuneration/bulletin/${fakeId}/print`);
    // 404 (profil inexistant), 401 (non auth), ou 200 (session valide + données)
    expect([200, 401, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const ct = res.headers()['content-type'];
      expect(ct).toContain('text/html');
    }
  });
});
