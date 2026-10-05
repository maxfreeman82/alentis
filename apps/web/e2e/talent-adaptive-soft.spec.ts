import { test, expect } from '@playwright/test';

// Prérequis : migration 008 appliquée, et serveur lancé avec
// TALENT_ASSESSMENT_FORCE_FALLBACK=1 (questions de secours, sans IA).
test.describe('Questionnaire 6D — Soft Skills adaptatif', () => {
  test.beforeEach(async ({ page }) => {
    const email    = process.env['TEST_TALENT_EMAIL']    ?? 'talent@teranga-demo.net';
    const password = process.env['TEST_TALENT_PASSWORD'] ?? 'TerAngA@2026!';
    const res = await page.request.get(`/api/e2e/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    expect(res.ok()).toBeTruthy();
  });

  test('ne renvoie jamais les valeurs cachées au client', async ({ page }) => {
    const res = await page.request.post('/api/talent-assessment/start', { data: { step: 'soft' } });
    // 409 possible si une passation précédente est restée sans question active
    if (res.status() === 409) test.skip();
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).not.toContain('option_values');
    expect(body).not.toMatch(/"value"/);
  });

  test('rejette une étape inconnue', async ({ page }) => {
    const res = await page.request.post('/api/talent-assessment/start', { data: { step: 'hack' } });
    expect(res.status()).toBe(400);
  });

  test('passation complète jusqu\'à « Étape terminée »', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/assessment', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Soft Skills/ }).first().click();

    const start = page.getByRole('button', { name: 'Commencer' });
    if (await start.isVisible()) await start.click();

    const finished = page.getByText('Étape terminée');
    for (let i = 0; i < 16; i++) {
      if (await finished.isVisible()) break;
      const option = page.getByTestId('adaptive-option').first();
      await option.waitFor({ state: 'visible', timeout: 30_000 });
      await expect(option).toBeEnabled({ timeout: 30_000 });
      await option.click();
      await page.waitForLoadState('networkidle');
    }
    await expect(finished).toBeVisible({ timeout: 30_000 });
  });
});
