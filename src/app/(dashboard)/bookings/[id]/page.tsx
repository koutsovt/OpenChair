import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { bookingStatusStyle } from '@/lib/booking-status-styles';
import { formatPrice, formatDuration } from '@/lib/utils';
import { BlurText } from '@/components/ui/blur-text';
import { BookingDetailActions } from './_components/booking-detail-actions';
import { ProductsUsedSection } from './_components/products-used-section';
import {
  getBookingProducts,
  getProducts,
  getClientPreferredProducts,
  getLastVisitProducts,
} from '@/server/actions/products';

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const salon = await getAuthenticatedSalon();

  const booking = await prisma.booking.findFirst({
    where: { id, salonId: salon.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          allergies: true,
          hairType: true,
          hairTexture: true,
          naturalColour: true,
          notes: true,
          productPreferences: true,
        },
      },
      stylist: true,
      service: true,
    },
  });

  if (!booking) notFound();

  const clientProfile = booking.client;
  const clientId = booking.client?.id ?? null;

  const [bookingProductsResult, allProducts, preferredResult, lastVisitResult] = await Promise.all([
    getBookingProducts(booking.id),
    getProducts(),
    clientId ? getClientPreferredProducts(clientId) : Promise.resolve(null),
    clientId ? getLastVisitProducts({ bookingId: booking.id, clientId }) : Promise.resolve(null),
  ]);

  const initialBookingProducts = bookingProductsResult.success
    ? bookingProductsResult.products.map((bp) => ({
        id: bp.id,
        product: {
          brand: bp.product.brand,
          name: bp.product.name,
          shadeCode: bp.product.shadeCode,
        },
        quantity: bp.quantity,
        notes: bp.notes,
      }))
    : [];

  const hasPreferred =
    preferredResult && preferredResult.success
      ? preferredResult.items.some((p) => p.pinned)
      : false;

  const lastVisitDate =
    lastVisitResult && lastVisitResult.success ? lastVisitResult.visitDate : null;
  const hasLastVisit = !!lastVisitDate;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bookings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <BlurText text="Booking Details" className="text-2xl font-bold tracking-tight" />
        </div>
        <Badge className={bookingStatusStyle(booking.status).badge} variant="secondary">
          {bookingStatusStyle(booking.status).label}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Date" value={format(booking.startTime, 'EEEE, d MMMM yyyy')} />
          <Row
            label="Time"
            value={`${format(booking.startTime, 'HH:mm')} – ${format(booking.endTime, 'HH:mm')}`}
          />
          <Row label="Duration" value={formatDuration(booking.service.duration)} />
          <Separator />
          <Row label="Service" value={booking.service.name} />
          <Row label="Price" value={booking.price != null ? formatPrice(booking.price) : '—'} />
          <Row label="Stylist" value={booking.stylist.name} />
          <Separator />
          <Row label="Client" value={booking.client?.name ?? booking.guestName ?? 'Walk-in'} />
          {booking.client?.phone && <Row label="Phone" value={booking.client.phone} />}
          {booking.guestPhone && <Row label="Guest Phone" value={booking.guestPhone} />}
          {booking.client?.email && <Row label="Email" value={booking.client.email} />}
          {booking.notes && (
            <>
              <Separator />
              <Row label="Notes" value={booking.notes} />
            </>
          )}
          {booking.cancelledAt && (
            <>
              <Separator />
              <Row label="Cancelled At" value={format(booking.cancelledAt, 'd MMM yyyy, HH:mm')} />
              {booking.cancelReason && <Row label="Reason" value={booking.cancelReason} />}
            </>
          )}
        </CardContent>
      </Card>

      {clientProfile &&
        (clientProfile.allergies ||
          clientProfile.hairType ||
          clientProfile.hairTexture ||
          clientProfile.naturalColour ||
          clientProfile.notes ||
          clientProfile.productPreferences) && (
          <Card>
            <CardHeader>
              <CardTitle>Client Notes for Stylist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientProfile.allergies && (
                <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Allergies / Sensitivities</p>
                    <p className="whitespace-pre-wrap text-sm text-red-700">
                      {clientProfile.allergies}
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2 text-sm">
                {clientProfile.hairType && (
                  <Row
                    label="Hair Type"
                    value={
                      clientProfile.hairType.charAt(0).toUpperCase() +
                      clientProfile.hairType.slice(1)
                    }
                  />
                )}
                {clientProfile.hairTexture && (
                  <Row
                    label="Hair Texture"
                    value={
                      clientProfile.hairTexture.charAt(0).toUpperCase() +
                      clientProfile.hairTexture.slice(1)
                    }
                  />
                )}
                {clientProfile.naturalColour && (
                  <Row label="Natural Colour" value={clientProfile.naturalColour} />
                )}
                {clientProfile.productPreferences && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Product Preferences
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {clientProfile.productPreferences}
                      </p>
                    </div>
                  </>
                )}
                {clientProfile.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Client Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{clientProfile.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {clientId && (
        <Card>
          <CardContent className="pt-6">
            <ProductsUsedSection
              bookingId={booking.id}
              clientId={clientId}
              initialBookingProducts={initialBookingProducts}
              allProducts={allProducts}
              hasPreferred={hasPreferred}
              hasLastVisit={hasLastVisit}
              lastVisitDate={lastVisitDate}
            />
          </CardContent>
        </Card>
      )}

      <BookingDetailActions bookingId={booking.id} currentStatus={booking.status} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
