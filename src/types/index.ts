import type {
  BookingModel,
  ClientModel,
  ServiceModel,
  StylistModel,
  StylistAvailabilityModel,
  SalonModel,
} from '@/generated/prisma/models';
import type { BookingStatus } from '@/generated/prisma/enums';

// Re-export Prisma types with short aliases for convenience
export type Booking = BookingModel;
export type Client = ClientModel;
export type Service = ServiceModel;
export type Stylist = StylistModel;
export type StylistAvailability = StylistAvailabilityModel;
export type Salon = SalonModel;
export type { BookingStatus };

// Composite types for common queries
export type StylistWithAvailability = Stylist & {
  availability: StylistAvailability[];
};

export type StylistWithServices = Stylist & {
  services: { service: Service; priceOverride: number | null; durationOverride: number | null }[];
};

export type BookingWithRelations = Booking & {
  client: Client | null;
  stylist: Stylist;
  service: Service;
};

export type ServiceWithCategory = Service & {
  category: { id: string; name: string } | null;
};

// Slot generation
export type TimeSlot = {
  start: Date;
  end: Date;
};

// Form types
export type BookingFormData = {
  clientId?: string;
  guestName?: string;
  guestPhone?: string;
  serviceId: string;
  stylistId: string;
  date: Date;
  startTime: string; // "09:00"
};

export type ClientFormData = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  birthDate?: Date;
  source?: string;
};
