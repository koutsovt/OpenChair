import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { salon: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'U';
  const salonName = user.salon?.name ?? 'My Salon';

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-background lg:block">
        <div className="px-6 py-4">
          <h1 className="text-lg font-bold">OpenChair</h1>
        </div>
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col">
        <Header salonName={salonName} userInitials={initials} userEmail={user.email} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
