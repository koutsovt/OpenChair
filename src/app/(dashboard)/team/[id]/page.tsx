import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AvailabilityForm } from '../_components/availability-form';
import { CalendarSyncButton } from '../_components/calendar-sync-button';

interface StylistDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StylistDetailPage({ params }: StylistDetailPageProps) {
  const { id } = await params;
  const salon = await getAuthenticatedSalon();

  const stylist = await prisma.stylist.findFirst({
    where: { id, salonId: salon.id },
    include: { availability: { orderBy: { dayOfWeek: 'asc' } } },
  });

  if (!stylist) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/team">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{stylist.name}</h1>
          <Badge variant={stylist.isActive ? 'default' : 'secondary'}>
            {stylist.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <CalendarSyncButton stylistId={stylist.id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {stylist.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {stylist.email}
              </div>
            )}
            {stylist.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {stylist.phone}
              </div>
            )}
            {stylist.bio && (
              <>
                <Separator />
                <p className="text-muted-foreground">{stylist.bio}</p>
              </>
            )}
            {!stylist.email && !stylist.phone && !stylist.bio && (
              <p className="text-muted-foreground">No details added yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityForm
              stylistId={stylist.id}
              existing={stylist.availability.map((a) => ({
                dayOfWeek: a.dayOfWeek,
                startTime: a.startTime,
                endTime: a.endTime,
                isActive: a.isActive,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
