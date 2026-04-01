'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BOOKING_STATUS_COLORS } from '@/lib/constants';
import { rescheduleBooking } from '@/server/actions/bookings';
import { useToast } from '@/hooks/use-toast';
import { ReassignDialog } from './reassign-dialog';
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
  availability: { startTime: string; endTime: string }[];
};

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 60;
const SNAP_MINUTES = 15;
const MIN_BLOCK_HEIGHT = 36;

function isTerminal(status: BookingStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW';
}

export function BookingTimeline({
  bookings,
  stylists,
  date,
}: {
  bookings: TimelineBooking[];
  stylists: StylistColumn[];
  date: string;
}) {
  const { toast } = useToast();
  const [dragState, setDragState] = useState<{
    bookingId: string;
    originalStylistId: string;
    originalStartTime: string;
  } | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{
    stylistId: string;
    topPx: number;
    heightPx: number;
  } | null>(null);
  const [optimisticBookings, setOptimisticBookings] = useState<TimelineBooking[]>(bookings);
  const [reassignTarget, setReassignTarget] = useState<StylistColumn | null>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useMemo(() => {
    setOptimisticBookings(bookings);
  }, [bookings]);

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );

  function getTopPx(time: string): number {
    const d = new Date(time);
    const minutesFromStart = d.getHours() * 60 + d.getMinutes() - START_HOUR * 60;
    return (minutesFromStart / 60) * HOUR_HEIGHT;
  }

  function isHourAvailable(stylist: StylistColumn, hour: number): boolean {
    if (stylist.availability.length === 0) return false;
    const hourStr = String(hour).padStart(2, '0') + ':00';
    const nextHourStr = String(hour + 1).padStart(2, '0') + ':00';
    return stylist.availability.some((a) => a.startTime <= hourStr && a.endTime >= nextHourStr);
  }

  function getHeightPx(start: string, end: string): number {
    const mins = differenceInMinutes(new Date(end), new Date(start));
    return (mins / 60) * HOUR_HEIGHT;
  }

  function pxToSnappedMinutes(px: number): number {
    const totalMinutes = (px / HOUR_HEIGHT) * 60 + START_HOUR * 60;
    return Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  }

  const handleDragStart = useCallback((e: React.DragEvent, booking: TimelineBooking) => {
    if (isTerminal(booking.status)) {
      e.preventDefault();
      return;
    }
    setDragState({
      bookingId: booking.id,
      originalStylistId: booking.stylistId,
      originalStartTime: booking.startTime,
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', booking.id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, stylistId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!dragState) return;

      const draggedBooking = optimisticBookings.find((b) => b.id === dragState.bookingId);
      if (!draggedBooking) return;

      const column = columnRefs.current.get(stylistId);
      if (!column) return;

      const rect = column.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snappedMinutes = pxToSnappedMinutes(y);
      const snappedTopPx = ((snappedMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const heightPx = getHeightPx(draggedBooking.startTime, draggedBooking.endTime);

      setGhostPosition({ stylistId, topPx: snappedTopPx, heightPx });
    },
    [dragState, optimisticBookings]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStylistId: string) => {
      e.preventDefault();

      if (!dragState || !ghostPosition) {
        setDragState(null);
        setGhostPosition(null);
        return;
      }

      const draggedBooking = optimisticBookings.find((b) => b.id === dragState.bookingId);
      if (!draggedBooking) {
        setDragState(null);
        setGhostPosition(null);
        return;
      }

      const column = columnRefs.current.get(targetStylistId);
      if (!column) {
        setDragState(null);
        setGhostPosition(null);
        return;
      }

      const rect = column.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snappedMinutes = pxToSnappedMinutes(y);

      const originalStart = new Date(draggedBooking.startTime);
      const newStart = new Date(originalStart);
      newStart.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);

      const duration = differenceInMinutes(
        new Date(draggedBooking.endTime),
        new Date(draggedBooking.startTime)
      );
      const newEnd = addMinutes(newStart, duration);

      setOptimisticBookings((prev) =>
        prev.map((b) =>
          b.id === dragState.bookingId
            ? {
                ...b,
                startTime: newStart.toISOString(),
                endTime: newEnd.toISOString(),
                stylistId: targetStylistId,
              }
            : b
        )
      );

      setDragState(null);
      setGhostPosition(null);

      const newStylistId =
        targetStylistId !== dragState.originalStylistId ? targetStylistId : undefined;
      const result = await rescheduleBooking(
        dragState.bookingId,
        newStart.toISOString(),
        newStylistId
      );

      if (!result.success) {
        setOptimisticBookings(bookings);
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    },
    [dragState, ghostPosition, optimisticBookings, bookings, toast]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setGhostPosition(null);
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto rounded-lg border">
        <div className="flex min-w-[600px]">
          {/* Time gutter */}
          <div className="w-16 flex-shrink-0 border-r bg-muted/30">
            <div className="h-14 border-b" />
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
            const col = optimisticBookings.filter((b) => b.stylistId === stylist.id);
            const isDayOff = stylist.availability.length === 0;
            return (
              <div key={stylist.id} className="min-w-[160px] flex-1 border-r last:border-r-0">
                {/* Column header — clicking name or icon opens reassign */}
                <div
                  className={`flex h-14 items-center justify-between border-b px-2 ${
                    isDayOff ? 'bg-muted/60' : ''
                  }`}
                >
                  <button
                    type="button"
                    className={`truncate text-sm font-medium hover:text-destructive hover:underline ${
                      isDayOff ? 'text-muted-foreground line-through' : ''
                    }`}
                    onClick={() => setReassignTarget(stylist)}
                  >
                    {stylist.name}
                    {isDayOff && (
                      <span className="ml-1.5 text-[10px] font-normal no-underline">(off)</span>
                    )}
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setReassignTarget(stylist)}
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark unavailable &amp; reassign</TooltipContent>
                  </Tooltip>
                </div>

                {/* Column body */}
                <div
                  ref={(el) => {
                    if (el) columnRefs.current.set(stylist.id, el);
                  }}
                  className="relative"
                  style={{ height: hours.length * HOUR_HEIGHT }}
                  onDragOver={(e) => handleDragOver(e, stylist.id)}
                  onDrop={(e) => handleDrop(e, stylist.id)}
                >
                  {/* Hour grid cells */}
                  {hours.map((h, i) => {
                    const available = isHourAvailable(stylist, h);
                    return (
                      <div
                        key={h}
                        className={`absolute w-full border-b ${
                          available
                            ? i % 2 === 0
                              ? 'bg-background'
                              : 'bg-muted/20'
                            : 'bg-muted/50'
                        }`}
                        style={{
                          top: (h - START_HOUR) * HOUR_HEIGHT,
                          height: HOUR_HEIGHT,
                        }}
                      />
                    );
                  })}

                  {/* Ghost preview */}
                  {ghostPosition && ghostPosition.stylistId === stylist.id && dragState && (
                    <div
                      className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-primary/50 bg-primary/10"
                      style={{
                        top: ghostPosition.topPx,
                        height: Math.max(ghostPosition.heightPx, MIN_BLOCK_HEIGHT),
                      }}
                    />
                  )}

                  {/* Booking blocks */}
                  {col.map((b) => {
                    const isDragging = dragState?.bookingId === b.id;
                    const terminal = isTerminal(b.status);
                    const rawHeight = getHeightPx(b.startTime, b.endTime);
                    const blockHeight = Math.max(rawHeight, MIN_BLOCK_HEIGHT);
                    const isCompact = rawHeight < 45;
                    const timeStr = `${format(new Date(b.startTime), 'HH:mm')}–${format(new Date(b.endTime), 'HH:mm')}`;

                    return (
                      <Tooltip key={b.id}>
                        <TooltipTrigger asChild>
                          <div
                            draggable={!terminal}
                            onDragStart={(e) => handleDragStart(e, b)}
                            onDragEnd={handleDragEnd}
                            className={`absolute inset-x-1 overflow-hidden rounded-md border border-black/5 px-2 py-1 shadow-sm ${BOOKING_STATUS_COLORS[b.status]} ${
                              terminal
                                ? 'cursor-default opacity-60'
                                : 'cursor-grab active:cursor-grabbing'
                            } ${isDragging ? 'opacity-30' : ''}`}
                            style={{
                              top: getTopPx(b.startTime),
                              height: blockHeight,
                              zIndex: isDragging ? 50 : 10,
                            }}
                          >
                            {isCompact ? (
                              <div className="flex h-full items-center gap-1.5 text-[11px] font-medium leading-tight">
                                <span className="truncate">{b.clientName}</span>
                                <span className="shrink-0 opacity-70">{timeStr}</span>
                              </div>
                            ) : (
                              <div className="flex h-full flex-col justify-center gap-0.5 text-xs leading-tight">
                                <div className="truncate font-semibold">{b.clientName}</div>
                                <div className="truncate opacity-80">{b.serviceName}</div>
                                <div className="opacity-70">{timeStr}</div>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold">{b.clientName}</div>
                            <div>{b.serviceName}</div>
                            <div>{timeStr}</div>
                            <div className="capitalize">
                              {b.status.toLowerCase().replace('_', ' ')}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
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

      {/* Reassign dialog */}
      {reassignTarget && (
        <ReassignDialog
          open={!!reassignTarget}
          onOpenChange={(open) => {
            if (!open) setReassignTarget(null);
          }}
          absentStylistId={reassignTarget.id}
          absentStylistName={reassignTarget.name}
          date={date}
          otherStylists={stylists.filter((s) => s.id !== reassignTarget.id)}
        />
      )}
    </TooltipProvider>
  );
}
