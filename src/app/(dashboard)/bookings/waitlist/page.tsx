import { getAuthenticatedSalon } from '@/server/auth';
import { BlurText } from '@/components/ui/blur-text';
import { prisma } from '@/lib/prisma';
import { WaitlistEntriesList } from './_components/waitlist-entries-list';

export default async function WaitlistPage() {
  const salon = await getAuthenticatedSalon();

  const entries = await prisma.waitlistEntry.findMany({
    where: { salonId: salon.id },
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
        <BlurText text="Waitlist" className="text-2xl font-bold tracking-tight" />
        <p className="text-muted-foreground">
          {rows.length} waitlist entr{rows.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>
      <WaitlistEntriesList entries={rows} />
    </div>
  );
}
