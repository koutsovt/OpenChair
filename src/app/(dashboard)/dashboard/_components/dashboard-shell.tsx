'use client';

import Image from 'next/image';
import { CalendarDays, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlurText } from '@/components/ui/blur-text';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { CountUp } from '@/components/ui/count-up';
import { AnimatedList } from '@/components/ui/animated-list';

interface BookingItem {
  id: string;
  time: string;
  serviceName: string;
  clientName: string;
  stylistName: string;
  status: string;
  statusLabel: string;
  statusColor: string;
}

interface StylistStat {
  stylistId: string;
  stylistName: string;
  count: number;
  revenue: string | null;
}

interface DashboardShellProps {
  salonName: string;
  dateString: string;
  todayCount: number;
  weekRevenue: number;
  monthRevenue: number;
  completionRate: number;
  weekRevenueFormatted: string;
  monthRevenueFormatted: string;
  bookings: BookingItem[];
  stylistStats: StylistStat[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardShell({
  salonName,
  dateString,
  todayCount,
  weekRevenue,
  monthRevenue,
  completionRate,
  weekRevenueFormatted,
  monthRevenueFormatted,
  bookings,
  stylistStats,
}: DashboardShellProps) {
  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl">
        <Image
          src="/images/salon-hero.jpg"
          alt=""
          width={1200}
          height={400}
          className="h-48 w-full object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <BlurText
            text={`${greeting}`}
            className="text-3xl font-bold tracking-tight text-white"
            delay={150}
          />
          <p className="mt-2 text-sm text-white/80">
            {salonName} · {dateString}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)">
          <CardContent className="flex items-center gap-3 py-4">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">
                <CountUp to={todayCount} duration={1.5} />
              </p>
              <p className="text-xs text-muted-foreground">Today&apos;s Bookings</p>
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.15)">
          <CardContent className="flex items-center gap-3 py-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {weekRevenue > 0 ? (
                  <CountUp to={weekRevenue} duration={2} prefix="$" />
                ) : (
                  weekRevenueFormatted
                )}
              </p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.15)">
          <CardContent className="flex items-center gap-3 py-4">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">
                {monthRevenue > 0 ? (
                  <CountUp to={monthRevenue} duration={2} prefix="$" />
                ) : (
                  monthRevenueFormatted
                )}
              </p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">
                <CountUp to={completionRate} duration={1.5} />
                <span>%</span>
              </p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </SpotlightCard>
      </div>

      {/* Schedule & Stylist Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SpotlightCard className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No bookings scheduled for today.
              </p>
            ) : (
              <AnimatedList>
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {booking.time} — {booking.serviceName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.clientName} · {booking.stylistName}
                      </p>
                    </div>
                    <Badge variant="secondary" className={booking.statusColor}>
                      {booking.statusLabel}
                    </Badge>
                  </div>
                ))}
              </AnimatedList>
            )}
          </CardContent>
        </SpotlightCard>

        <SpotlightCard>
          <CardHeader>
            <CardTitle className="text-base">Bookings by Stylist</CardTitle>
          </CardHeader>
          <CardContent>
            {stylistStats.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No bookings this week.
              </p>
            ) : (
              <div className="space-y-3">
                {stylistStats.map((stat) => (
                  <div key={stat.stylistId} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stat.stylistName}</span>
                    <div className="text-right">
                      <span className="text-muted-foreground">{stat.count} bookings</span>
                      {stat.revenue && <span className="ml-2 text-green-600">{stat.revenue}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </SpotlightCard>
      </div>
    </div>
  );
}
