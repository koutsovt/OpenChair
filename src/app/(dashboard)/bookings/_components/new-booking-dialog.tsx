'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookingForm } from './booking-form';

type ServiceOption = { id: string; name: string; price: number; duration: number };
type StylistOption = { id: string; name: string };

export function NewBookingDialog({
  services,
  stylistsByService,
}: {
  services: ServiceOption[];
  stylistsByService: Record<string, StylistOption[]>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
        </DialogHeader>
        <BookingForm
          services={services}
          stylistsByService={stylistsByService}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
