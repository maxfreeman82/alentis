'use server';

import { createUserClient } from '@/lib/supabase/user';
import { redirect } from 'next/navigation';

export async function signOutAction() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect('/');
}
