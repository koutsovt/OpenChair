import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';
import { DashboardShell } from './_components/dashboard-shell';

export default async function DashboardPage() {
  const salon = await getAuthenticatedSalon();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    todaysBookings,
    todayCount,
    weekRevenue,
    monthRevenue,
    weekCompleted,
    weekTotal,
    stylistStats,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: {
        salonId: salon.id,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        client: { select: { name: true } },
        stylist: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.booking.count({
      where: {
        salonId: salon.id,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    prisma.booking.aggregate({
      where: {
        salonId: salon.id,
        status: 'COMPLETED',
        startTime: { gte: weekStart, lte: weekEnd },
      },
      _sum: { price: true },
    }),
    prisma.booking.aggregate({
      where: {
        salonId: salon.id,
        status: 'COMPLETED',
        startTime: { gte: monthStart, lte: monthEnd },
      },
      _sum: { price: true },
    }),
    prisma.booking.count({
      where: {
        salonId: salon.id,
        status: 'COMPLETED',
        startTime: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.booking.count({
      where: {
        salonId: salon.id,
        startTime: { gte: weekStart, lte: weekEnd },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    prisma.booking.groupBy({
      by: ['stylistId'],
      where: {
        salonId: salon.id,
        startTime: { gte: weekStart, lte: weekEnd },
        status: { notIn: ['CANCELLED'] },
      },
      _count: true,
      _sum: { price: true },
    }),
  ]);

  const stylistIds = stylistStats.map((s) => s.stylistId);
  const stylistNames =
    stylistIds.length > 0
      ? await prisma.stylist.findMany({
          where: { id: { in: stylistIds } },
          select: { id: true, name: true },
        })
      : [];
  const stylistNameMap = new Map(stylistNames.map((s) => [s.id, s.name]));

  const weekRevenueTotal = weekRevenue._sum.price ?? 0;
  const monthRevenueTotal = monthRevenue._sum.price ?? 0;
  const completionRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  const bookingItems = todaysBookings.map((booking) => ({
    id: booking.id,
    time: format(booking.startTime, 'h:mm a'),
    serviceName: booking.service.name,
    clientName: booking.client?.name ?? booking.guestName ?? 'Walk-in',
    stylistName: booking.stylist.name,
    status: booking.status,
    statusLabel: BOOKING_STATUS_LABELS[booking.status] ?? booking.status,
    statusColor: BOOKING_STATUS_COLORS[booking.status] ?? '',
  }));

  const stylistStatItems = stylistStats
    .sort((a, b) => b._count - a._count)
    .map((stat) => ({
      stylistId: stat.stylistId,
      stylistName: stylistNameMap.get(stat.stylistId) ?? 'Unknown',
      count: stat._count,
      revenue: stat._sum.price != null && stat._sum.price > 0 ? formatPrice(stat._sum.price) : null,
    }));

  return (
    <DashboardShell
      salonName={salon.name}
      dateString={format(now, 'EEEE, d MMMM yyyy')}
      todayCount={todayCount}
      weekRevenue={weekRevenueTotal}
      monthRevenue={monthRevenueTotal}
      completionRate={completionRate}
      weekRevenueFormatted={formatPrice(weekRevenueTotal)}
      monthRevenueFormatted={formatPrice(monthRevenueTotal)}
      bookings={bookingItems}
      stylistStats={stylistStatItems}
    />
  );
}
