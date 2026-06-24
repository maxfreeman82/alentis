import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { user } = await withAuth();

  if (user) redirect('/dashboard');
  else redirect('/sign-in');
}
