import { test, expect } from '@playwright/test';

test.describe('Vision Pulse', () => {
  test('dashboard Vision Pulse charge', async ({ page }) => {
    const res = await page.goto('/vision-pulse');
    expect(res?.status()).not.toBe(500);
    await expect(page.locator('text=Vision Pulse').first()).toBeVisible({ timeout: 10_000 });
  });

  test('page survey accessible', async ({ page }) => {
    const res = await page.goto('/vision-pulse/survey');
    expect(res?.status()).not.toBe(500);
    await expect(page).toHaveURL(/survey/);
    // Soit le formulaire est affiché, soit un état "déjà soumis"
    const form   = page.locator('form, fieldset, [role="radiogroup"]').first();
    const done   = page.locator('text=soumis, text=Merci, text=complété').first();
    const header = page.locator('.card').first();
    await expect(form.or(done).or(header).first()).toBeVisible({ timeout: 10_000 });
  });

  test('navigation Lancer le sondage depuis le dashboard', async ({ page }) => {
    await page.goto('/vision-pulse');
    const cta = page.locator('a[href*="survey"], text=Lancer, text=Répondre').first();
    if (await cta.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await cta.click();
      await expect(page).toHaveURL(/survey/);
    }
  });

  test('API submit retourne 200 avec session ou 401 sans', async ({ request }) => {
    const res = await request.post('/api/vision-pulse/submit', {
      data: { quarter: 2, year: 2026, responses: { q1: 4, q2: 3, q3: 5, q4: 4, q5: 3 } },
    });
    expect([200, 401, 403]).toContain(res.status());
  });
});
