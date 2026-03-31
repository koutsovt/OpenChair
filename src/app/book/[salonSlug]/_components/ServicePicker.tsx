'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn, formatPrice, formatDuration } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { UserIcon } from 'lucide-react';

type ServiceWithRelations = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  stylists: {
    stylistId: string;
    serviceId: string;
    priceOverride: number | null;
    durationOverride: number | null;
    stylist: {
      id: string;
      name: string;
      bio: string | null;
      imageUrl: string | null;
      isActive: boolean;
    };
  }[];
};

type StylistWithServices = {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  services: {
    stylistId: string;
    serviceId: string;
    priceOverride: number | null;
    durationOverride: number | null;
  }[];
};

interface ServicePickerProps {
  salonSlug: string;
  groupedServices: Record<string, ServiceWithRelations[]>;
  stylists: StylistWithServices[];
}

export function ServicePicker({ salonSlug, groupedServices, stylists }: ServicePickerProps) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const selectedService = selectedServiceId
    ? Object.values(groupedServices)
        .flat()
        .find((s) => s.id === selectedServiceId)
    : null;

  const availableStylists = selectedService
    ? stylists.filter((st) => st.services.some((ss) => ss.serviceId === selectedService.id))
    : [];

  function handleStylistClick(stylistId: string) {
    if (!selectedServiceId) return;
    router.push(`/book/${salonSlug}/${stylistId}?serviceId=${selectedServiceId}`);
  }

  return (
    <div className="space-y-8">
      {/* Service Selection */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Select a service</h2>
        {Object.entries(groupedServices).map(([category, services]) => (
          <div key={category} className="mb-6">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {category}
            </h3>
            <div className="space-y-2">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedServiceId === service.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:border-gray-300'
                  )}
                  onClick={() => setSelectedServiceId(service.id)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      {service.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDuration(service.duration)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(service.price)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Stylist Selection */}
      {selectedService && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Choose a stylist</h2>
          {availableStylists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stylists available for this service.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableStylists.map((stylist) => (
                <Card
                  key={stylist.id}
                  className="cursor-pointer transition-colors hover:border-gray-300"
                  onClick={() => handleStylistClick(stylist.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                      {stylist.imageUrl ? (
                        <Image
                          src={stylist.imageUrl}
                          alt={stylist.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{stylist.name}</p>
                      {stylist.bio && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {stylist.bio.length > 80 ? `${stylist.bio.slice(0, 80)}…` : stylist.bio}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
