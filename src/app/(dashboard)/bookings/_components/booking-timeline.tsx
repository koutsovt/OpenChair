'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { bookingStatusStyle } from '@/lib/booking-status-styles';
import { rescheduleBooking } from '@/server/actions/bookings';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReassignDialog } from './reassign-dialog';
import { PastBookingMenu } from './past-booking-menu';
import { ActiveBookingMenu } from './active-booking-menu';
import { BookingForm, type BookingPrefill } from './booking-form';
import { onBookingCreated } from '@/lib/booking-created-event';
import type { BookingStatus } from '@/types';

type TimelineBooking = {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  clientName: string;
  serviceName: string;
  stylistId: string;
  serviceId?: string;
  serviceDuration?: number;
};

type StylistColumn = {
  id: string;
  name: string;
  availability: { startTime: string; endTime: string }[];
};

type ServiceOption = { id: string; name: string; price: number; duration: number };
type StylistOption = {
  id: string;
  name: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
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
  services,
  stylistsByService,
}: {
  bookings: TimelineBooking[];
  stylists: StylistColumn[];
  date: string;
  services: ServiceOption[];
  stylistsByService: Record<string, StylistOption[]>;
}) {
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
  // Set when an empty cell is tapped — opens the same booking flow as "New
  // Booking", pre-aimed at that stylist and time.
  const [createPrefill, setCreatePrefill] = useState<BookingPrefill | null>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Keeps the drag-optimistic copy in sync with fresh server data (e.g.
  // after router.refresh() following a create/reschedule). useEffect, not
  // useMemo — this is a genuine side effect (setState), and useMemo's
  // cache is only a performance hint React is allowed to discard; relying
  // on it running would be relying on an implementation detail.
  useEffect(() => {
    setOptimisticBookings(bookings);
  }, [bookings]);

  // A booking was just created somewhere on this page (this dialog, the
  // cell-tap dialog below, or a rebook flow elsewhere) — scroll its
  // stylist's column into view. On mobile the timeline scrolls
  // horizontally and often shows only one column at a time, so a booking
  // landing on an off-screen stylist would otherwise look like it never
  // saved.
  useEffect(() => {
    return onBookingCreated((stylistId) => {
      columnRefs.current
        .get(stylistId)
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }, []);

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
        toast.error(result.error);
      }
    },
    [dragState, ghostPosition, optimisticBookings, bookings]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setGhostPosition(null);
  }, []);

  // Tapping an empty part of a stylist's column starts a new booking aimed
  // at that stylist and the exact time tapped (snapped the same way drag
  // does). Booking blocks sit on top of these cells in paint order, so a tap
  // on an existing booking never reaches this handler.
  const handleCellClick = useCallback(
    (e: React.MouseEvent, stylist: StylistColumn) => {
      const column = columnRefs.current.get(stylist.id);
      if (!column) return;

      const rect = column.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snappedMinutes = pxToSnappedMinutes(y);

      const [year, month, day] = date.split('-').map(Number);
      const slotStart = new Date(
        year,
        month - 1,
        day,
        Math.floor(snappedMinutes / 60),
        snappedMinutes % 60,
        0,
        0
      );

      setCreatePrefill({
        stylistId: stylist.id,
        stylistName: stylist.name,
        defaultDate: new Date(year, month - 1, day),
        slotStart: slotStart.toISOString(),
      });
    },
    [date]
  );

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
                  {/* Hour grid cells — tap an empty one to start a booking */}
                  {hours.map((h, i) => {
                    const available = isHourAvailable(stylist, h);
                    return (
                      <div
                        key={h}
                        onClick={(e) => handleCellClick(e, stylist)}
                        className={`absolute w-full cursor-pointer border-b ${
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

                    const block = (menuProps?: React.HTMLAttributes<HTMLDivElement>) => (
                      <Tooltip key={b.id}>
                        <TooltipTrigger asChild>
                          <div
                            draggable={!terminal}
                            onDragStart={(e) => handleDragStart(e, b)}
                            onDragEnd={handleDragEnd}
                            {...menuProps}
                            className={`absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 shadow-sm ${bookingStatusStyle(b.status).block} ${
                              terminal
                                ? 'cursor-default opacity-60'
                                : 'cursor-grab active:cursor-grabbing'
                            } ${isDragging ? 'opacity-30' : ''}`}
                            style={{
                              top: getTopPx(b.startTime),
                              height: blockHeight,
                              zIndex: isDragging ? 50 : 10,
                              // Long-press opens our own menu on terminal blocks
                              // — suppress iOS's native text-selection callout.
                              ...(menuProps
                                ? { WebkitTouchCallout: 'none', userSelect: 'none' }
                                : {}),
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

                    // Terminal (past) bookings aren't draggable and have no
                    // other interaction — give them the same context menu the
                    // list view uses (view / rebook / send nudge), reachable
                    // by desktop right-click or mobile long-press. Active
                    // (non-terminal) bookings surface their status options
                    // the same way — tap/click the block itself — since the
                    // compact timeline block has no room for a dedicated
                    // "..." button like the list view's rows have.
                    if (terminal) {
                      return (
                        <PastBookingMenu key={b.id} bookingId={b.id} status={b.status}>
                          {(menuProps) => block(menuProps)}
                        </PastBookingMenu>
                      );
                    }
                    return (
                      <ActiveBookingMenu
                        key={b.id}
                        bookingId={b.id}
                        serviceId={b.serviceId}
                        serviceDuration={b.serviceDuration}
                        stylistId={b.stylistId}
                        startTime={b.startTime}
                      >
                        {(menuProps) => block(menuProps)}
                      </ActiveBookingMenu>
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

      {/* New booking from a tapped cell */}
      <Dialog
        open={!!createPrefill}
        onOpenChange={(open) => {
          if (!open) setCreatePrefill(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
          </DialogHeader>
          {createPrefill && (
            <BookingForm
              services={services}
              stylistsByService={stylistsByService}
              prefill={createPrefill}
              onClose={() => setCreatePrefill(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
