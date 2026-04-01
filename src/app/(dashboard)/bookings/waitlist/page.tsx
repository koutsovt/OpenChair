import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { WaitlistEntriesList } from './_components/waitlist-entries-list';

export default async function WaitlistPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { salon: true },
  });

  if (!user?.salon) redirect('/sign-in');

  const entries = await prisma.waitlistEntry.findMany({
    where: { salonId: user.salon.id },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = entries.map((e) => ({
    id: e.id,
    clientName: e.client.name,
    serviceName: e.service.name,
    stylistName: e.stylist?.name ?? 'Any',
    status: e.status,
    preferredDateStart: e.preferredDateStart.toISOString(),
    preferredDateEnd: e.preferredDateEnd.toISOString(),
    preferredTimeStart: e.preferredTimeStart,
    preferredTimeEnd: e.preferredTimeEnd,
    createdAt: e.createdAt.toISOString(),
    expiresAt: e.expiresAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Waitlist</h1>
        <p className="text-muted-foreground">
          {rows.length} waitlist entr{rows.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>
      <WaitlistEntriesList entries={rows} />
    </div>
  );
}
