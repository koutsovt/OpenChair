import { addMinutes, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { findConflictingBooking } from '@/lib/booking-validation';
import type { AutoAssignResult } from '@/types';

/**
 * Auto-assign the best available stylist for a given service + time.
 * Scores eligible stylists by:
 * - Availability (40%): must be free, bonus for buffer time around slot
 * - Workload balance (30%): fewer bookings that day = higher score
 * - Gap minimization (20%): prefer filling gaps between existing bookings
 * - Client history (10%): slight preference for stylist the client has seen before
 */
export async function autoAssignStylist(
  salonId: string,
  serviceId: string,
  startTime: Date,
  clientId?: string
): Promise<AutoAssignResult | null> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId },
  });

  if (!service) return null;

  const endTime = addMinutes(startTime, service.duration);
  const dayOfWeek = startTime.getDay();

  // Find stylists who offer this service and are active
  const stylistServices = await prisma.stylistService.findMany({
    where: {
      serviceId,
      stylist: { salonId, isActive: true },
    },
    include: {
      stylist: {
        include: {
          availability: {
            where: { dayOfWeek, isActive: true },
          },
        },
      },
    },
  });

  if (stylistServices.length === 0) return null;

  // Get all bookings for the day for these stylists
  const stylistIds = stylistServices.map((ss) => ss.stylist.id);
  const dayStart = startOfDay(startTime);
  const dayEnd = endOfDay(startTime);

  const dayBookings = await prisma.booking.findMany({
    where: {
      stylistId: { in: stylistIds },
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
      status: { in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'] },
    },
    select: { stylistId: true, startTime: true, endTime: true },
  });

  // Get client history if clientId provided
  const clientHistory: Record<string, number> = {};
  if (clientId) {
    const pastBookings = await prisma.booking.findMany({
      where: {
        clientId,
        stylistId: { in: stylistIds },
        status: { in: ['COMPLETED', 'CONFIRMED'] },
      },
      select: { stylistId: true },
    });
    for (const b of pastBookings) {
      clientHistory[b.stylistId] = (clientHistory[b.stylistId] ?? 0) + 1;
    }
  }

  const maxDayBookings = Math.max(
    ...stylistIds.map((id) => dayBookings.filter((b) => b.stylistId === id).length),
    1
  );
  const maxClientVisits = Math.max(...Object.values(clientHistory), 0);

  type ScoredStylist = AutoAssignResult;
  const scored: ScoredStylist[] = [];

  for (const ss of stylistServices) {
    const stylist = ss.stylist;

    // Check availability window
    if (stylist.availability.length === 0) continue;

    const hasWindow = stylist.availability.some((a) => {
      const [sh, sm] = a.startTime.split(':').map(Number);
      const [eh, em] = a.endTime.split(':').map(Number);
      const availStart = sh * 60 + sm;
      const availEnd = eh * 60 + em;
      const slotStart = startTime.getHours() * 60 + startTime.getMinutes();
      const slotEnd = endTime.getHours() * 60 + endTime.getMinutes();
      return slotStart >= availStart && slotEnd <= availEnd;
    });

    if (!hasWindow) continue;

    // Check conflict
    const conflict = await findConflictingBooking(stylist.id, startTime, endTime);
    if (conflict) continue;

    // Availability score (40%) — buffer time bonus
    const stylistDayBookings = dayBookings
      .filter((b) => b.stylistId === stylist.id)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    let bufferMinutes = 120; // max buffer = 2hrs
    for (const b of stylistDayBookings) {
      const gapBefore = (startTime.getTime() - b.endTime.getTime()) / 60000;
      const gapAfter = (b.startTime.getTime() - endTime.getTime()) / 60000;
      if (gapBefore >= 0 && gapBefore < bufferMinutes) bufferMinutes = gapBefore;
      if (gapAfter >= 0 && gapAfter < bufferMinutes) bufferMinutes = gapAfter;
    }
    const availabilityScore = Math.min(bufferMinutes / 120, 1) * 40;

    // Workload balance (30%) — fewer bookings = higher score
    const bookingCount = stylistDayBookings.length;
    const workloadScore = (1 - bookingCount / maxDayBookings) * 30;

    // Gap minimization (20%) — prefer filling gaps (back-to-back)
    let gapScore = 10; // default mid score
    for (const b of stylistDayBookings) {
      const gapBefore = Math.abs(startTime.getTime() - b.endTime.getTime()) / 60000;
      const gapAfter = Math.abs(b.startTime.getTime() - endTime.getTime()) / 60000;
      if (gapBefore <= 15 || gapAfter <= 15) {
        gapScore = 20; // back-to-back bonus
        break;
      }
    }

    // Client history (10%)
    const visits = clientHistory[stylist.id] ?? 0;
    const historyScore = maxClientVisits > 0 ? (visits / maxClientVisits) * 10 : 0;

    const totalScore = availabilityScore + workloadScore + gapScore + historyScore;

    const reasons: string[] = [];
    if (gapScore === 20) reasons.push('Back-to-back efficient');
    if (workloadScore > 20) reasons.push('Light schedule');
    if (historyScore > 5) reasons.push('Client continuity');
    if (reasons.length === 0) reasons.push('Best available');

    scored.push({
      stylistId: stylist.id,
      stylistName: stylist.name,
      score: Math.round(totalScore),
      reason: reasons.join(', '),
    });
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
