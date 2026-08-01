import { addDays, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAvailableSlots } from '@/lib/slots';
import { toSalonZoned } from '@/lib/timezone';
import type { SuggestedSlot } from '@/types';

/**
 * Suggest optimal time slots for a service based on:
 * - Gap-filling priority: slots that fill gaps between existing bookings score highest
 * - Back-to-back efficiency: adjacent to existing bookings
 * - Buffer avoidance: avoid leaving tiny unusable gaps (e.g. 15min)
 * - Peak avoidance: slightly prefer off-peak when day is busy
 */
export async function getSuggestedSlots(
  salonId: string,
  serviceId: string,
  stylistId: string | undefined,
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<SuggestedSlot[]> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId },
  });

  if (!service) return [];

  const salon = await prisma.salon.findFirst({
    where: { id: salonId },
    select: { timezone: true },
  });

  if (!salon) return [];

  // Get stylists who offer this service
  const stylistFilter = stylistId
    ? { id: stylistId, salonId, isActive: true }
    : { salonId, isActive: true };

  const stylists = await prisma.stylist.findMany({
    where: {
      ...stylistFilter,
      services: { some: { serviceId } },
    },
    include: {
      availability: { where: { isActive: true } },
    },
  });

  if (stylists.length === 0) return [];

  const cappedLimit = Math.min(limit, 20);
  const suggestions: SuggestedSlot[] = [];

  // Iterate through each day in the range (capped at 14 days). Day
  // boundaries must be read in the salon's timezone, not the server's —
  // see lib/timezone.ts — or a suggestion could be scored/placed against
  // the wrong calendar day's existing bookings.
  const zonedStartDate = toSalonZoned(startDate, salon.timezone);
  const zonedEndDate = toSalonZoned(endDate, salon.timezone);
  let currentDate = startOfDay(zonedStartDate);
  const maxDate = addDays(startOfDay(zonedStartDate), 14);
  const lastDate = startOfDay(zonedEndDate) > maxDate ? maxDate : startOfDay(zonedEndDate);

  while (currentDate <= lastDate && suggestions.length < cappedLimit * 3) {
    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);

    for (const stylist of stylists) {
      // Get existing bookings for this stylist on this day
      const existingBookings = await prisma.booking.findMany({
        where: {
          stylistId: stylist.id,
          startTime: { gte: dayStart },
          endTime: { lte: dayEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { startTime: true, endTime: true, status: true },
        orderBy: { startTime: 'asc' },
      });

      // Get available slots
      const slots = getAvailableSlots(
        currentDate,
        stylist.availability,
        existingBookings,
        service.duration,
        salon.timezone
      );

      // Score each slot
      for (const slot of slots) {
        const score = scoreSlot(slot.start, slot.end, existingBookings, service.duration);

        suggestions.push({
          start: slot.start,
          end: slot.end,
          stylistId: stylist.id,
          stylistName: stylist.name,
          score: score.value,
          reason: score.reason,
        });
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  // Sort by score descending and take top N
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, cappedLimit);
}

export function scoreSlot(
  slotStart: Date,
  slotEnd: Date,
  existingBookings: { startTime: Date; endTime: Date }[],
  serviceDuration: number
): { value: number; reason: string } {
  let score = 50; // base score
  const reasons: string[] = [];

  if (existingBookings.length === 0) {
    return { value: 60, reason: 'Open schedule' };
  }

  // Gap-filling: check if this slot fills a gap between two bookings
  let fillsGap = false;
  let isBackToBack = false;
  let leavesSmallGap = false;

  for (let i = 0; i < existingBookings.length; i++) {
    const booking = existingBookings[i];

    // Check back-to-back (within 5 min)
    const gapBefore = (slotStart.getTime() - booking.endTime.getTime()) / 60000;
    const gapAfter = (booking.startTime.getTime() - slotEnd.getTime()) / 60000;

    if (Math.abs(gapBefore) <= 5 || Math.abs(gapAfter) <= 5) {
      isBackToBack = true;
    }

    // Check if it fills a gap between two bookings
    if (i < existingBookings.length - 1) {
      const nextBooking = existingBookings[i + 1];
      const gapStart = booking.endTime;
      const gapEnd = nextBooking.startTime;
      const gapMinutes = (gapEnd.getTime() - gapStart.getTime()) / 60000;

      if (
        slotStart.getTime() >= gapStart.getTime() &&
        slotEnd.getTime() <= gapEnd.getTime() &&
        gapMinutes >= serviceDuration &&
        gapMinutes <= serviceDuration + 30
      ) {
        fillsGap = true;
      }
    }

    // Check if it would leave a tiny unusable gap (< 30min)
    if (gapBefore > 0 && gapBefore < 30 && gapBefore > 5) {
      leavesSmallGap = true;
    }
    if (gapAfter > 0 && gapAfter < 30 && gapAfter > 5) {
      leavesSmallGap = true;
    }
  }

  if (fillsGap) {
    score += 30;
    reasons.push('Fills gap between bookings');
  }

  if (isBackToBack) {
    score += 15;
    reasons.push('Back-to-back efficient');
  }

  if (leavesSmallGap) {
    score -= 15;
    reasons.push('Leaves small gap');
  }

  // Peak avoidance: slightly penalize 10am-2pm if day is busy (>4 bookings)
  const hour = slotStart.getHours();
  if (existingBookings.length >= 4 && hour >= 10 && hour <= 14) {
    score -= 5;
  }

  // Prefer morning and late afternoon slightly
  if (hour >= 8 && hour <= 10) {
    score += 5;
    if (reasons.length === 0) reasons.push('Morning slot');
  }

  if (reasons.length === 0) reasons.push('Available slot');

  return { value: Math.max(0, Math.min(100, score)), reason: reasons[0] };
}
