import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const TALENT_AUTH_FILE = path.join(__dirname, '.auth/talent.json');

async function loginAsTalent(page: Page, context: BrowserContext) {
  fs.mkdirSync(path.dirname(TALENT_AUTH_FILE), { recursive: true });

  const email    = process.env['TEST_TALENT_EMAIL']    ?? 'test.talent@teranga-align.com';
  const password = process.env['TEST_TALENT_PASSWORD'] ?? 'Test123456!';

  // page.request partage le cookie jar avec le navigateur — les Set-Cookie de la réponse
  // sont directement disponibles dans les page.goto() suivants
  const res = await page.request.get(
    `/api/e2e/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
  );

  if (!res.ok()) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`Login talent échoué (${res.status()}) : ${JSON.stringify(body)}`);
  }

  await context.storageState({ path: TALENT_AUTH_FILE });
}

test.describe('Tunnel talent - onboarding wizard', () => {
  test.beforeEach(async ({ page, context }) => {
    await loginAsTalent(page, context);
  });

  test('/ redirige un talent non onboarde vers /onboarding', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 });
  });

  test("wizard charge et affiche l'etape 1 Identite", async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 });

    await expect(page.locator('text=Etape 1 / 5').or(page.locator('text=Étape 1 / 5'))).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Bienvenue sur Teranga Align')).toBeVisible();

    await expect(page.locator('input[placeholder="Moussa"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Diallo"]')).toBeVisible();
  });

  test('etape 1 : remplissage et passage a etape 2', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Bienvenue sur Teranga Align')).toBeVisible({ timeout: 10_000 });

    await page.fill('input[placeholder="Moussa"]', 'Mamadou');
    await page.fill('input[placeholder="Diallo"]', 'Ndiaye');
    await page.fill('input[placeholder="votre@email.com"]', 'mamadou@example.com');

    await page.click('button:has-text("Continuer")');

    await expect(page.locator('text=Ma situation')).toBeVisible({ timeout: 5_000 });
  });

  test('etape 2 : selection secteur et passage a etape CV', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Bienvenue sur Teranga Align')).toBeVisible({ timeout: 10_000 });

    // Etape 1
    await page.fill('input[placeholder="Moussa"]', 'Mamadou');
    await page.fill('input[placeholder="Diallo"]', 'Ndiaye');
    await page.fill('input[placeholder="votre@email.com"]', 'mamadou@example.com');
    await page.click('button:has-text("Continuer")');
    await expect(page.locator('text=Ma situation')).toBeVisible({ timeout: 5_000 });

    // Etape 2
    await page.selectOption('select', 'Technologie');
    await page.click('button:has-text("Continuer")');

    await expect(page.locator('text=Importez votre CV')).toBeVisible({ timeout: 5_000 });
  });

  test('etape 3 CV : bouton Passer fonctionne sans upload', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Bienvenue sur Teranga Align')).toBeVisible({ timeout: 10_000 });

    // Etape 1
    await page.fill('input[placeholder="Moussa"]', 'Mamadou');
    await page.fill('input[placeholder="Diallo"]', 'Ndiaye');
    await page.fill('input[placeholder="votre@email.com"]', 'mamadou@example.com');
    await page.click('button:has-text("Continuer")');
    await expect(page.locator('text=Ma situation')).toBeVisible({ timeout: 5_000 });

    // Etape 2
    await page.selectOption('select', 'Technologie');
    await page.click('button:has-text("Continuer")');
    await expect(page.locator('text=Importez votre CV')).toBeVisible({ timeout: 5_000 });

    // Etape 3 : passer sans upload (accent sur étape)
    await page.click('button:has-text("Passer cette")');
    await expect(page.locator('text=Mes objectifs')).toBeVisible({ timeout: 5_000 });
  });

  test('progress bar affiche 5 etapes dans le wizard', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Bienvenue sur Teranga Align')).toBeVisible({ timeout: 10_000 });

    // 5 ronds dans la barre de progression
    const stepCircles = page.locator('.rounded-full.flex-shrink-0');
    const count = await stepCircles.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});

test.describe('Pages publiques du tunnel talent', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('/choisir-profil affiche les 3 types de profil', async ({ page }) => {
    await page.goto('/choisir-profil', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toContainText('Application error');

    await expect(page.locator('text=Talent').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Entreprise').first()).toBeVisible();
    await expect(page.locator('text=Fondateur').first()).toBeVisible();
  });

  test('/sign-up?profile=talent charge le formulaire', async ({ page }) => {
    await page.goto('/sign-up?profile=talent', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });

  test('/sign-in charge le formulaire de connexion', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
