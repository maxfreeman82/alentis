import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authentification Supabase org_admin', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const email    = process.env['TEST_USER_EMAIL']    ?? '';
  const password = process.env['TEST_USER_PASSWORD'] ?? '';

  // page.request partage le cookie jar avec le navigateur
  const res = await page.request.get(
    `/api/e2e/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
  );

  if (!res.ok()) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`Login org_admin échoué (${res.status()}) : ${JSON.stringify(body)}`);
  }

  // Persister les cookies de session Supabase pour tous les tests suivants
  await page.context().storageState({ path: AUTH_FILE });
});
