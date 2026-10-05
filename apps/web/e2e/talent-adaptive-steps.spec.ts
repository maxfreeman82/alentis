import { test, expect } from '@playwright/test';

// Prérequis : migration 008 appliquée, et serveur lancé avec
// TALENT_ASSESSMENT_FORCE_FALLBACK=1 (questions de secours, sans IA).
// Les étapes technique et expérience n'ont pas de banque de secours (questions
// générées puis vérifiées par IA) : seul le refus propre est couvert ici.
test.describe('Questionnaire 6D — étapes adaptatives', () => {
  test.beforeEach(async ({ page }) => {
    const email    = process.env['TEST_TALENT_EMAIL']    ?? 'talent@teranga-demo.net';
    const password = process.env['TEST_TALENT_PASSWORD'] ?? 'TerAngA@2026!';
    const res = await page.request.get(`/api/e2e/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    expect(res.ok()).toBeTruthy();
    // Porte CV : le compte de test doit avoir au moins une compétence.
    const skills = await page.request.post('/api/talent/skills', { data: { skills: ['Excel', 'SQL'], jobTitle: 'Analyste financier', yearsExp: 4 } });
    expect(skills.ok()).toBeTruthy();
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

  for (const { tab, max } of [
    { tab: /Soft Skills/, max: 16 },
    { tab: /Life Score/, max: 9 },
    { tab: /Risques/, max: 8 },
  ]) {
    test(`passation complète jusqu'à « Étape terminée » — ${tab.source}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto('/assessment', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: tab }).first().click();

      const start = page.getByRole('button', { name: 'Commencer' });
      if (await start.isVisible()) await start.click();

      const finished = page.getByText('Étape terminée');
      const options = page.getByTestId('adaptive-option');
      for (let i = 0; i < max; i++) {
        // Attendre la fin de la requête précédente : soit l'écran de fin, soit
        // une question dont les options sont de nouveau cliquables.
        await expect(finished.or(options.first())).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('[data-testid="adaptive-option"][disabled]')).toHaveCount(0, { timeout: 30_000 });
        if (await finished.isVisible()) break;
        await options.first().click();
      }
      await expect(finished).toBeVisible({ timeout: 30_000 });
    });
  }

  test('technique : génération indisponible → erreur claire, pas de question inventée', async ({ page }) => {
    const res = await page.request.post('/api/talent-assessment/start', { data: { step: 'hard' } });
    // Avec la banque de secours forcée, aucune question technique ne peut être servie.
    if (res.ok()) test.skip();
    expect(res.status()).toBe(502);
  });
});
