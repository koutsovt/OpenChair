'use client';

import { useState, useMemo, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  createBooking,
  getAvailableSlotsAction,
  getSuggestedSlotsAction,
} from '@/server/actions/bookings';
import { searchClients } from '@/server/actions/clients';
import { formatPrice, formatDuration } from '@/lib/utils';

type ServiceOption = {
  id: string;
  name: string;
  price: number;
  duration: number;
};

type StylistOption = {
  id: string;
  name: string;
};

type ClientOption = {
  id: string;
  name: string;
  phone: string | null;
};

type SlotOption = { start: string; end: string };

export function BookingForm({
  services,
  stylistsByService,
  onClose,
}: {
  services: ServiceOption[];
  stylistsByService: Record<string, StylistOption[]>;
  onClose?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Selections
  const [serviceId, setServiceId] = useState('');
  const [stylistId, setStylistId] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slotStart, setSlotStart] = useState('');
  const [clientId, setClientId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  // Loaded data
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { start: string; end: string; stylistName: string; reason: string }[]
  >([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [searchingClients, setSearchingClients] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);
  const availableStylists = useMemo(
    () => stylistsByService[serviceId] ?? [],
    [stylistsByService, serviceId]
  );

  // Fetch slots when stylist + date selected
  useEffect(() => {
    if (!stylistId || !serviceId || !date) return;
    setLoadingSlots(true);
    setSlotStart('');
    getAvailableSlotsAction(
      stylistId === 'auto' ? (availableStylists[0]?.id ?? '') : stylistId,
      serviceId,
      date.toISOString()
    )
      .then(setSlots)
      .finally(() => setLoadingSlots(false));

    // Fetch suggested slots
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    getSuggestedSlotsAction(
      serviceId,
      stylistId === 'auto' ? undefined : stylistId,
      date.toISOString(),
      endDate.toISOString(),
      5
    )
      .then((s) =>
        setSuggestions(
          s.map((slot) => ({
            start: slot.start,
            end: slot.end,
            stylistName: slot.stylistName,
            reason: slot.reason,
          }))
        )
      )
      .catch(() => setSuggestions([]));
  }, [stylistId, serviceId, date, availableStylists]);

  // Client search
  const handleClientSearch = useCallback((query: string) => {
    setClientQuery(query);
    if (query.length < 2) {
      setClients([]);
      return;
    }
    setSearchingClients(true);
    searchClients(query)
      .then((results) =>
        setClients(results.map((c) => ({ id: c.id, name: c.name, phone: c.phone })))
      )
      .finally(() => setSearchingClients(false));
  }, []);

  function handleSubmit() {
    startTransition(async () => {
      const result = await createBooking({
        serviceId,
        stylistId,
        startTime: slotStart,
        clientId: isGuest ? undefined : clientId || undefined,
        guestName: isGuest ? guestName : undefined,
        guestPhone: isGuest ? guestPhone : undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Booking created successfully');
      router.refresh();
      onClose?.();
    });
  }

  const selectedStylist = availableStylists.find((s) => s.id === stylistId);
  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select a service</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <Card
                key={s.id}
                className={`cursor-pointer transition-colors ${serviceId === s.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => {
                  setServiceId(s.id);
                  setStylistId('');
                }}
              >
                <CardContent className="p-4">
                  <div className="font-medium">{s.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatPrice(s.price)}</span>
                    <span>·</span>
                    <span>{formatDuration(s.duration)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {services.length === 0 && (
            <p className="text-muted-foreground">No services available. Add services first.</p>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!serviceId}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Stylist */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select a stylist</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              className={`cursor-pointer transition-colors ${stylistId === 'auto' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
              onClick={() => setStylistId('auto')}
            >
              <CardContent className="p-4">
                <div className="font-medium">Any available stylist</div>
                <div className="text-sm text-muted-foreground">Auto-assign the best match</div>
              </CardContent>
            </Card>
            {availableStylists.map((s) => (
              <Card
                key={s.id}
                className={`cursor-pointer transition-colors ${stylistId === s.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => setStylistId(s.id)}
              >
                <CardContent className="p-4">
                  <div className="font-medium">{s.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          {availableStylists.length === 0 && (
            <p className="text-muted-foreground">No stylists assigned to this service.</p>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!stylistId}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Select Date & Time */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pick date & time</h3>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            />
            <div className="flex-1 space-y-2">
              {loadingSlots && <p className="text-sm text-muted-foreground">Loading slots…</p>}
              {!loadingSlots && date && slots.length === 0 && (
                <p className="text-sm text-muted-foreground">No available slots on this date.</p>
              )}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary">Recommended times</p>
                  <div className="grid grid-cols-3 gap-2">
                    {suggestions.map((s) => (
                      <Button
                        key={s.start}
                        variant={slotStart === s.start ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSlotStart(s.start)}
                        className="h-auto flex-col py-1.5"
                      >
                        <span>{format(new Date(s.start), 'HH:mm')}</span>
                        <span className="text-[10px] opacity-70">{s.reason}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <Button
                    key={s.start}
                    variant={slotStart === s.start ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSlotStart(s.start)}
                  >
                    {format(new Date(s.start), 'HH:mm')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)} disabled={!slotStart}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Client */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Client details</h3>

          <div className="flex gap-2">
            <Button
              variant={!isGuest ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsGuest(false)}
            >
              Existing Client
            </Button>
            <Button
              variant={isGuest ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsGuest(true)}
            >
              Guest
            </Button>
          </div>

          {!isGuest ? (
            <div className="space-y-3">
              <div>
                <Label>Search clients</Label>
                <Input
                  placeholder="Type name or phone…"
                  value={clientQuery}
                  onChange={(e) => handleClientSearch(e.target.value)}
                />
              </div>
              {searchingClients && <p className="text-sm text-muted-foreground">Searching…</p>}
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-2 text-sm transition-colors ${clientId === c.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                    onClick={() => setClientId(c.id)}
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Guest name</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="0412 345 678"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={() => setStep(5)} disabled={!isGuest ? !clientId : !guestName}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Confirm */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Confirm booking</h3>

          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stylist</span>
                <span className="font-medium">
                  {stylistId === 'auto' ? 'Auto-assigned' : selectedStylist?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium">
                  {slotStart && format(new Date(slotStart), 'EEE d MMM, HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">
                  {selectedService ? formatDuration(selectedService.duration) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">
                  {isGuest ? guestName : (selectedClient?.name ?? '—')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">
                  {selectedService ? formatPrice(selectedService.price) : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests…"
              rows={3}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Booking…' : 'Confirm Booking'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
