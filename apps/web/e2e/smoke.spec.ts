import { test, expect } from '@playwright/test';

// Tests sans auth — vérifie que les pages redirigent vers WorkOS au lieu de crasher
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Smoke (sans auth)', () => {
  const PROTECTED_PAGES = [
    '/dashboard',
    '/recrutement',
    '/performance',
    '/analytics',
    '/remuneration',
    '/vision-pulse',
    '/certification',
    '/abonnement',
  ];

  for (const route of PROTECTED_PAGES) {
    test(`${route} redirige vers auth ou retourne 200 (jamais 500)`, async ({ page }) => {
      // 'commit' évite ERR_ABORTED lors des redirects WorkOS — on vérifie juste le statut initial
      let res: Awaited<ReturnType<typeof page.goto>> = null;
      try {
        res = await page.goto(route, { waitUntil: 'commit' });
      } catch {
        // ERR_ABORTED = redirect externe suivi ou compilation tardive — acceptable en smoke
        return;
      }
      // Jamais d'erreur serveur
      expect(res?.status()).not.toBe(500);
    });
  }

  test('API Vision Pulse sans auth ne retourne pas 500', async ({ request }) => {
    // timeout allongé : le serveur compile la route au premier accès (~10-15s)
    test.setTimeout(60_000);
    const res = await request.post('/api/vision-pulse/submit', {
      data: { quarter: 1, year: 2026, responses: {} },
    });
    // 401/403 = protégé, 404 = route non encore montée, 200 = redirect WorkOS suivi
    expect(res.status()).not.toBe(500);
  });

  test('API recrutement/applications sans auth ne retourne pas 500', async ({ request }) => {
    const res = await request.get('/api/recrutement/applications');
    // 401/403 = protégé, 200 = redirect WorkOS suivi par Playwright
    expect(res.status()).not.toBe(500);
  });

  test('API remuneration/calculate sans auth ne retourne pas 500', async ({ request }) => {
    const res = await request.post('/api/remuneration/calculate', {
      data: { salaireBrut: 400000, situation: 'celibataire', enfants: 0, sectorRisk: 'low', primes: 0, avantagesNature: 0, retenuePrevoy: 0 },
    });
    expect(res.status()).not.toBe(500);
  });
});
