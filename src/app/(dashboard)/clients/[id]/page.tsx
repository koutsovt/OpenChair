import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Tag,
  AlertTriangle,
  MessageCircleOff,
} from 'lucide-react';
import Link from 'next/link';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { formatPhone, formatPrice } from '@/lib/utils';
import { bookingStatusStyle } from '@/lib/booking-status-styles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EditClientDialog } from '../_components/edit-client-dialog';
import { DeleteClientButton } from './_components/delete-client-button';
import { ClientStats } from './_components/client-stats';
import { PreferredProductsPanel } from './_components/preferred-products-panel';
import { HairHistoryPanel } from './_components/hair-history-panel';
import {
  getClientPreferredProducts,
  getClientProductHistory,
  getProducts,
} from '@/server/actions/products';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const salon = await getAuthenticatedSalon();

  const [client, stylists] = await Promise.all([
    prisma.client.findFirst({
      where: { id, salonId: salon.id, isActive: true },
      include: {
        preferredStylist: { select: { name: true } },
      },
    }),
    prisma.stylist.findMany({
      where: { salonId: salon.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!client) {
    notFound();
  }

  const [bookings, stats, preferredResult, historyResult, allProducts] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId: client.id },
      include: {
        stylist: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startTime: 'desc' },
    }),
    prisma.booking.aggregate({
      where: { clientId: client.id, status: 'COMPLETED' },
      _count: true,
      _sum: { price: true },
      _max: { startTime: true },
    }),
    getClientPreferredProducts(client.id),
    getClientProductHistory(client.id),
    getProducts(),
  ]);

  const preferred = preferredResult.success
    ? preferredResult.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        label: item.label,
        formula: item.formula,
        notes: item.notes,
        pinned: item.pinned,
        product: item.product
          ? {
              brand: item.product.brand,
              name: item.product.name,
              shadeCode: item.product.shadeCode,
            }
          : undefined,
      }))
    : [];
  const hairHistory = historyResult.success
    ? historyResult.history.map((h) => ({
        bookingId: h.booking.id,
        date: h.booking.startTime,
        products: [{ product: h.product, quantity: h.quantity, notes: h.notes }],
      }))
    : [];
  // Merge products within the same booking into one visit entry
  const visitMap = new Map<
    string,
    { bookingId: string; date: Date; products: (typeof hairHistory)[number]['products'] }
  >();
  for (const row of hairHistory) {
    const existing = visitMap.get(row.bookingId);
    if (existing) {
      existing.products.push(...row.products);
    } else {
      visitMap.set(row.bookingId, { ...row, date: new Date(row.date) });
    }
  }
  const visits = Array.from(visitMap.values());

  const noShowCount = await prisma.booking.count({
    where: { clientId: client.id, status: 'NO_SHOW' },
  });

  const totalVisits = stats._count;
  const totalSpend = stats._sum.price ?? 0;
  const lastVisit = stats._max.startTime;

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
            allergies: client.allergies,
            hairType: client.hairType,
            hairTexture: client.hairTexture,
            naturalColour: client.naturalColour,
            preferredStylistId: client.preferredStylistId,
            productPreferences: client.productPreferences,
          }}
          stylists={stylists}
        />
        <DeleteClientButton clientId={client.id} />
      </div>

      {client.allergies && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Allergies / Sensitivities</p>
              <p className="whitespace-pre-wrap text-sm text-red-700">{client.allergies}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <ClientStats
        totalVisits={totalVisits}
        totalSpendFormatted={formatPrice(totalSpend)}
        totalSpend={totalSpend}
        lastVisitFormatted={lastVisit ? format(lastVisit, 'dd MMM yyyy') : null}
        noShowCount={noShowCount}
      />

      <Card>
        <CardContent className="pt-6">
          <PreferredProductsPanel
            clientId={client.id}
            initialPreferred={preferred}
            allProducts={allProducts}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <HairHistoryPanel history={visits} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
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
              {client.smsOptOut && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <MessageCircleOff className="h-4 w-4" />
                  SMS Opt-Out
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

          {(client.hairType ||
            client.hairTexture ||
            client.naturalColour ||
            client.preferredStylist ||
            client.productPreferences) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hair Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.hairType && (
                  <ProfileRow
                    label="Type"
                    value={client.hairType.charAt(0).toUpperCase() + client.hairType.slice(1)}
                  />
                )}
                {client.hairTexture && (
                  <ProfileRow
                    label="Texture"
                    value={client.hairTexture.charAt(0).toUpperCase() + client.hairTexture.slice(1)}
                  />
                )}
                {client.naturalColour && (
                  <ProfileRow label="Natural Colour" value={client.naturalColour} />
                )}
                {client.preferredStylist && (
                  <ProfileRow label="Preferred Stylist" value={client.preferredStylist.name} />
                )}
                {client.productPreferences && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Product Preferences</p>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {client.productPreferences}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

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
                    <Badge variant="secondary" className={bookingStatusStyle(booking.status).badge}>
                      {bookingStatusStyle(booking.status).label}
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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
