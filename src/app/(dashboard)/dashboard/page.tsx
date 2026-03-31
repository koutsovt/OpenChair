import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
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

  const salonName = user?.salon?.name ?? 'My Salon';

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Welcome to OpenChair</h1>
      <p className="text-muted-foreground">
        Managing <span className="font-medium text-foreground">{salonName}</span>
      </p>
    </div>
  );
}
