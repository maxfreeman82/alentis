import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

// WORKOS_REDIRECT_URI est défini en variable d'environnement Vercel
export default authkitMiddleware();

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|api/webhooks|api/public).*)'],
};
