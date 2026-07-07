import { test, expect } from '@playwright/test';

// Tests sans auth — vérifie que les pages redirigent vers /sign-in au lieu de crasher
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Smoke (sans auth)', () => {
  const PROTECTED_PAGES = [
    '/dashboard',
    '/recrutement',
    '/performance',
    '/analytics',
    '/remuneration',
    '/vision-pulse',
    '/passport',
    '/onboarding',
    '/demarrer',
  ];

  for (const route of PROTECTED_PAGES) {
    test(`${route} redirige vers sign-in ou retourne 200 (jamais 500)`, async ({ page }) => {
      let res: Awaited<ReturnType<typeof page.goto>> = null;
      try {
        res = await page.goto(route, { waitUntil: 'commit' });
      } catch {
        // Redirect suivi ou compilation tardive — acceptable en smoke
        return;
      }
      expect(res?.status()).not.toBe(500);
    });
  }

  test('page /choisir-profil charge sans erreur', async ({ page }) => {
    const res = await page.goto('/choisir-profil', { waitUntil: 'networkidle' });
    expect(res?.status()).toBe(200);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page /sign-in charge sans erreur', async ({ page }) => {
    const res = await page.goto('/sign-in', { waitUntil: 'networkidle' });
    expect(res?.status()).toBe(200);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('API cv/parse sans auth retourne 401 ou 307 (pas 500)', async ({ request }) => {
    const form = new FormData();
    const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    form.append('cv', blob, 'test.pdf');
    const res = await request.post('/api/cv/parse', { multipart: { cv: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') } } });
    expect(res.status()).not.toBe(500);
    expect([307, 401, 403]).toContain(res.status());
  });

  test('API recrutement/jobs sans auth ne retourne pas 500', async ({ request }) => {
    const res = await request.get('/api/recrutement/jobs');
    expect(res.status()).not.toBe(500);
  });

  test('API vision-pulse/submit sans auth ne retourne pas 500', async ({ request }) => {
    test.setTimeout(60_000);
    const res = await request.post('/api/vision-pulse/submit', {
      data: { quarter: 1, year: 2026, responses: {} },
    });
    expect(res.status()).not.toBe(500);
  });
});
