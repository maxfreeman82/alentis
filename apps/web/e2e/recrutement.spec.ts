import { test, expect } from '@playwright/test';

test.describe('Recrutement', () => {
  test('page principale affiche les KPIs', async ({ page }) => {
    const res = await page.goto('/recrutement');
    expect(res?.status()).not.toBe(500);
    await expect(page.locator('text=Recrutement').first()).toBeVisible({ timeout: 10_000 });
    // Au moins un card de KPI
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('les 3 modules sont accessibles (Postes, Pipeline, Matching)', async ({ page }) => {
    await page.goto('/recrutement');
    await expect(page.locator('a[href="/recrutement/jobs"]')).toBeVisible();
    await expect(page.locator('a[href="/recrutement/pipeline"]')).toBeVisible();
    await expect(page.locator('a[href="/recrutement/matching"]')).toBeVisible();
  });

  test('pipeline Kanban charge sans erreur', async ({ page }) => {
    const res = await page.goto('/recrutement/pipeline');
    expect(res?.status()).not.toBe(500);
    await expect(page).toHaveURL(/pipeline/);
    // Colonnes Kanban OU état vide
    const kanban  = page.locator('[class*="kanban"], [data-column]').first();
    const vide    = page.locator('text=Aucun candidat, text=pipeline');
    await expect(kanban.or(vide).or(page.locator('.card').first())).toBeVisible({ timeout: 10_000 });
  });

  test('matching IA affiche les candidats ou état vide', async ({ page }) => {
    const res = await page.goto('/recrutement/matching');
    expect(res?.status()).not.toBe(500);
    // Header MATCHING visible
    await expect(page.locator('text=Matching').first()).toBeVisible({ timeout: 10_000 });
    // Pas d'erreur React
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });

  test('API applications retourne 200 ou 401', async ({ request }) => {
    const res = await request.get('/api/recrutement/applications');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('API jobs retourne 200 ou 401', async ({ request }) => {
    const res = await request.get('/api/recrutement/jobs');
    expect([200, 401, 403]).toContain(res.status());
  });
});
