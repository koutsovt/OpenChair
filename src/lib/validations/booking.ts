import { z } from 'zod';

export const createBookingSchema = z
  .object({
    stylistId: z.string().min(1, 'Stylist is required'), // "auto" for auto-assign
    serviceId: z.string().min(1, 'Service is required'),
    clientId: z.string().optional(),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    startTime: z.string().datetime({ message: 'Valid start time is required' }),
    notes: z.string().optional(),
  })
  .refine((data) => data.clientId || data.guestName, {
    message: 'Either select a client or enter guest name',
  });

export const rescheduleBookingSchema = z.object({
  id: z.string().min(1),
  newStartTime: z.string().datetime(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
