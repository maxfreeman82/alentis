import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { Sidebar } from '@/components/layouts/Sidebar';
import { Header } from '@/components/layouts/Header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user    = await requireAuth();
  const admin   = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('first_name, email')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60 overflow-hidden">
        <Header
          userFirstName={profile?.first_name ?? ''}
          userEmail={profile?.email ?? user.email ?? ''}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
