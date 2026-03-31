import { describe, it, expect } from 'vitest';
import { getAvailableSlots } from '../slots';
import type { StylistAvailability, Booking } from '@/types';

const mockAvailability: Pick<
  StylistAvailability,
  'dayOfWeek' | 'startTime' | 'endTime' | 'isActive'
>[] = [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }];

describe('getAvailableSlots', () => {
  it('generates slots for an empty day', () => {
    // Monday 2026-04-06
    const date = new Date(2026, 3, 6);
    const slots = getAvailableSlots(
      date,
      mockAvailability as StylistAvailability[],
      [],
      60,
      'Australia/Sydney',
      60
    );
    // 09:00-17:00 with 60min service = 8 slots
    expect(slots).toHaveLength(8);
  });

  it('filters out slots that overlap with existing bookings', () => {
    const date = new Date(2026, 3, 6);
    const bookedSlot: Pick<Booking, 'startTime' | 'endTime' | 'status'> = {
      startTime: new Date('2026-04-05T23:00:00.000Z'), // 09:00 AEST
      endTime: new Date('2026-04-06T00:00:00.000Z'), // 10:00 AEST
      status: 'CONFIRMED',
    };
    const slots = getAvailableSlots(
      date,
      mockAvailability as StylistAvailability[],
      [bookedSlot],
      60,
      'Australia/Sydney',
      60
    );
    expect(slots).toHaveLength(7);
  });

  it('returns empty array for days with no availability', () => {
    // Sunday
    const date = new Date(2026, 3, 5);
    const slots = getAvailableSlots(
      date,
      mockAvailability as StylistAvailability[],
      [],
      60,
      'Australia/Sydney'
    );
    expect(slots).toHaveLength(0);
  });
});
