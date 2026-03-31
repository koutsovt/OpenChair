'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPublicBooking } from '@/server/actions/public-booking';
import { CheckCircleIcon } from 'lucide-react';

interface ConfirmFormProps {
  salonSlug: string;
  serviceId: string;
  stylistId: string;
  startTime: string;
  serviceName: string;
  stylistName: string;
  dateFormatted: string;
  timeFormatted: string;
}

export function ConfirmForm({
  salonSlug,
  serviceId,
  stylistId,
  startTime,
  serviceName,
  stylistName,
  dateFormatted,
  timeFormatted,
}: ConfirmFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);

    const clientName = formData.get('clientName') as string;
    const clientPhone = formData.get('clientPhone') as string;
    const clientEmail = (formData.get('clientEmail') as string) || undefined;
    const notes = (formData.get('notes') as string) || undefined;

    if (!clientName.trim()) {
      setError('Name is required');
      return;
    }

    if (!clientPhone.trim()) {
      setError('Phone number is required');
      return;
    }

    startTransition(async () => {
      const result = await createPublicBooking({
        salonSlug,
        serviceId,
        stylistId,
        startTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail,
        notes,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBookingId(result.bookingId);
    });
  }

  if (bookingId) {
    return (
      <div className="py-8 text-center">
        <CheckCircleIcon className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold">Booking confirmed!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {serviceName} with {stylistName}
        </p>
        <p className="text-sm text-muted-foreground">
          {dateFormatted} at {timeFormatted}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Booking reference: {bookingId}</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <h3 className="font-medium">Your details</h3>

      <div className="space-y-2">
        <Label htmlFor="clientName">Name *</Label>
        <Input id="clientName" name="clientName" required placeholder="Your full name" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientPhone">Phone *</Label>
        <Input id="clientPhone" name="clientPhone" type="tel" required placeholder="0412 345 678" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientEmail">Email (optional)</Label>
        <Input id="clientEmail" name="clientEmail" type="email" placeholder="you@example.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" placeholder="Any special requests or notes" rows={3} />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Booking…' : 'Confirm booking'}
      </Button>
    </form>
  );
}
