import Link from 'next/link';
import { Mail, Phone, UserCog } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlurText } from '@/components/ui/blur-text';
import { AddStylistDialog } from './_components/add-stylist-dialog';
import { EditStylistDialog } from './_components/edit-stylist-dialog';
import { DeleteStylistButton } from './_components/delete-stylist-button';

export default async function TeamPage() {
  const salon = await getAuthenticatedSalon();

  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id },
    include: { availability: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BlurText text="Team" className="text-2xl font-bold tracking-tight" />
          <p className="text-muted-foreground">Manage your stylists and their availability.</p>
        </div>
        <AddStylistDialog />
      </div>

      {stylists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCog className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No stylists yet</p>
            <p className="text-sm text-muted-foreground">Add your first stylist to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stylists.map((stylist) => (
            <Card key={stylist.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    <Link href={`/dashboard/team/${stylist.id}`} className="hover:underline">
                      {stylist.name}
                    </Link>
                  </CardTitle>
                  <Badge variant={stylist.isActive ? 'default' : 'secondary'}>
                    {stylist.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <EditStylistDialog stylist={stylist} />
                  <DeleteStylistButton stylistId={stylist.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {stylist.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {stylist.email}
                  </div>
                )}
                {stylist.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {stylist.phone}
                  </div>
                )}
                <p className="text-xs">
                  {stylist.availability.filter((a: { isActive: boolean }) => a.isActive).length}{' '}
                  days available
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
