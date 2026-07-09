import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/layouts/AdminSidebar';
import { Header } from '@/components/layouts/Header';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('first_name, email, role')
    .eq('user_id', user.id)
    .maybeSingle();

  // Guard : seul le super_admin peut accéder à cet espace
  if (profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col ml-60 overflow-hidden">
        <Header
          userFirstName={profile.first_name ?? undefined}
          userEmail={profile.email ?? undefined}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
