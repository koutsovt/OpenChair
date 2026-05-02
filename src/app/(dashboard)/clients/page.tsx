import { Users } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { BlurText } from '@/components/ui/blur-text';
import { ClientTable } from './_components/client-table';
import { AddClientDialog } from './_components/add-client-dialog';

export default async function ClientsPage() {
  const salon = await getAuthenticatedSalon();

  const [clients, stylists] = await Promise.all([
    prisma.client.findMany({
      where: { salonId: salon.id, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.stylist.findMany({
      where: { salonId: salon.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const clientRows = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    source: c.source,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BlurText text="Clients" className="text-2xl font-bold tracking-tight" />
          <p className="text-muted-foreground">Manage your client database.</p>
        </div>
        <AddClientDialog stylists={stylists} />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No clients yet</p>
            <p className="text-sm text-muted-foreground">Add your first client to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <ClientTable data={clientRows} />
      )}
    </div>
  );
}
