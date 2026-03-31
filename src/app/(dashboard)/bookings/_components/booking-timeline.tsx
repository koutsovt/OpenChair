'use client';

import { useMemo } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { BOOKING_STATUS_COLORS } from '@/lib/constants';
import type { BookingStatus } from '@/types';

type TimelineBooking = {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  clientName: string;
  serviceName: string;
  stylistId: string;
};

type StylistColumn = {
  id: string;
  name: string;
};

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // px per hour

export function BookingTimeline({
  bookings,
  stylists,
}: {
  bookings: TimelineBooking[];
  stylists: StylistColumn[];
}) {
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );

  function getTopPx(time: string): number {
    const d = new Date(time);
    const minutesFromStart = d.getHours() * 60 + d.getMinutes() - START_HOUR * 60;
    return (minutesFromStart / 60) * HOUR_HEIGHT;
  }

  function getHeightPx(start: string, end: string): number {
    const mins = differenceInMinutes(new Date(end), new Date(start));
    return (mins / 60) * HOUR_HEIGHT;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="flex min-w-[600px]">
        {/* Time gutter */}
        <div className="w-16 flex-shrink-0 border-r bg-muted/30">
          <div className="h-10 border-b" />
          {hours.map((h) => (
            <div
              key={h}
              className="border-b pr-2 text-right text-xs text-muted-foreground"
              style={{ height: HOUR_HEIGHT }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Stylist columns */}
        {stylists.map((stylist) => {
          const col = bookings.filter((b) => b.stylistId === stylist.id);
          return (
            <div key={stylist.id} className="min-w-[150px] flex-1 border-r last:border-r-0">
              <div className="flex h-10 items-center justify-center truncate border-b px-2 text-sm font-medium">
                {stylist.name}
              </div>
              <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
                {/* Hour gridlines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-b border-dashed border-muted"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Booking blocks */}
                {col.map((b) => (
                  <div
                    key={b.id}
                    className={`absolute inset-x-1 cursor-pointer overflow-hidden rounded-md px-1.5 py-0.5 text-xs ${BOOKING_STATUS_COLORS[b.status]}`}
                    style={{
                      top: getTopPx(b.startTime),
                      height: Math.max(getHeightPx(b.startTime, b.endTime), 20),
                    }}
                    title={`${b.clientName} — ${b.serviceName}`}
                  >
                    <div className="truncate font-medium">{b.clientName}</div>
                    <div className="truncate">{b.serviceName}</div>
                    <div className="truncate">
                      {format(new Date(b.startTime), 'HH:mm')}–
                      {format(new Date(b.endTime), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {stylists.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-12 text-muted-foreground">
            No stylists found
          </div>
        )}
      </div>
    </div>
  );
}
