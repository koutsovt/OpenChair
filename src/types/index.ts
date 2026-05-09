import type { BookingModel, StylistAvailabilityModel } from '@/generated/prisma/models';
import type { BookingStatus, WaitlistStatus, SmsDirection } from '@/generated/prisma/enums';

// Re-export Prisma types with short aliases where used
export type Booking = BookingModel;
export type StylistAvailability = StylistAvailabilityModel;
export type { BookingStatus, WaitlistStatus, SmsDirection };

// Slot generation
export type TimeSlot = {
  start: Date;
  end: Date;
};

// Auto-assign result
export type AutoAssignResult = {
  stylistId: string;
  stylistName: string;
  score: number;
  reason: string;
};

// Smart suggestions
export type SuggestedSlot = {
  start: Date;
  end: Date;
  stylistId: string;
  stylistName: string;
  score: number;
  reason: string;
};

// Alternative slots returned to guest when their pick is unavailable
export type AlternativeSlot = {
  start: string; // ISO string — safe for client components
  end: string;
  stylistId: string;
  stylistName: string;
};
