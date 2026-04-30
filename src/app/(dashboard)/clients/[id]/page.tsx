import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone, Calendar, MessageSquare, Tag } from 'lucide-react';
import Link from 'next/link';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { formatPhone } from '@/lib/utils';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EditClientDialog } from '../_components/edit-client-dialog';
import { DeleteClientButton } from './_components/delete-client-button';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const salon = await getAuthenticatedSalon();

  const client = await prisma.client.findFirst({
    where: { id, salonId: salon.id, isActive: true },
  });

  if (!client) {
    notFound();
  }

  const bookings = await prisma.booking.findMany({
    where: { clientId: client.id },
    include: {
      stylist: { select: { name: true } },
      service: { select: { name: true } },
    },
    orderBy: { startTime: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">Client details and booking history</p>
        </div>
        <EditClientDialog
          client={{
            id: client.id,
            name: client.name,
            phone: client.phone,
            email: client.email,
            notes: client.notes,
            birthDate: client.birthDate ? client.birthDate.toISOString() : null,
            source: client.source,
          }}
        />
        <DeleteClientButton clientId={client.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {formatPhone(client.phone)}
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {client.email}
              </div>
            )}
            {client.birthDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(client.birthDate, 'dd MMMM yyyy')}
              </div>
            )}
            {client.source && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {client.source.charAt(0).toUpperCase() + client.source.slice(1)}
              </div>
            )}
            {client.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Notes
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {client.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Booking History ({bookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{booking.service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(booking.startTime, 'dd MMM yyyy')} at{' '}
                        {format(booking.startTime, 'h:mm a')} · {booking.stylist.name}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={BOOKING_STATUS_COLORS[booking.status] ?? ''}
                    >
                      {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
