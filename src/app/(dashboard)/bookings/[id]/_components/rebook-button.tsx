'use client';

import { useState } from 'react';
import { addWeeks } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookingForm, type BookingPrefill } from '../../_components/booking-form';

type ServiceOption = { id: string; name: string; price: number; duration: number };
type StylistOption = {
  id: string;
  name: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
};

export function RebookButton({
  services,
  stylistsByService,
  serviceId,
  stylistId,
  stylistName,
  client,
  guest,
}: {
  services: ServiceOption[];
  stylistsByService: Record<string, StylistOption[]>;
  serviceId: string;
  stylistId: string;
  stylistName: string;
  client?: { id: string; name: string; phone: string | null };
  guest?: { name: string; phone: string };
}) {
  const [open, setOpen] = useState(false);

  // Service, stylist and client carry over — jump straight to picking a time,
  // defaulting the calendar to the typical 6-week rebook cycle.
  const prefill: BookingPrefill = {
    serviceId,
    stylistId,
    stylistName,
    client,
    guest,
    defaultDate: addWeeks(new Date(), 6),
    startAtStep: 3,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus className="mr-2 h-4 w-4" />
          Rebook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rebook — same again</DialogTitle>
        </DialogHeader>
        <BookingForm
          services={services}
          stylistsByService={stylistsByService}
          prefill={prefill}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
