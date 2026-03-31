import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { ClientTable } from './_components/client-table';
import { AddClientDialog } from './_components/add-client-dialog';

export default async function ClientsPage() {
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

  if (!user?.salon) {
    redirect('/sign-in');
  }

  const clients = await prisma.client.findMany({
    where: { salonId: user.salon.id, isActive: true },
    orderBy: { name: 'asc' },
  });

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
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client database.</p>
        </div>
        <AddClientDialog />
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
