import { handleAuth } from '@workos-inc/authkit-nextjs';

// Retour vers / → page.tsx gère le routing selon profil (onboarding/talent/dashboard)
export const GET = handleAuth({ returnPathname: '/' });
