import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authentification WorkOS', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const email    = encodeURIComponent(process.env.TEST_USER_EMAIL    ?? '');
  const password = encodeURIComponent(process.env.TEST_USER_PASSWORD ?? '');

  // Appel direct à la route E2E — pas d'UI WorkOS, pas de redirect OAuth
  // 'commit' = dès que la réponse initiale est reçue (avant que la page suivante charge)
  await page.goto(
    `/api/e2e/login?email=${email}&password=${password}`,
    { waitUntil: 'commit' },
  );

  // La route redirige vers /dashboard — attendre que l'URL change
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  // Persister le cookie wos-session pour tous les tests suivants
  await page.context().storageState({ path: AUTH_FILE });
});
