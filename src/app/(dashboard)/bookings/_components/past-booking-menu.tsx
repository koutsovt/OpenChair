'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Eye, CalendarPlus, MessageSquareHeart } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sendRebookNudge } from '@/server/actions/bookings';
import { useLongPress, type LongPressHandlers } from '@/hooks/useLongPress';
import type { BookingStatus } from '@/types';

// Shared shape for the handlers PastBookingMenu hands to its render prop, so
// callers (booking-list, booking-timeline) can type their own wrapped
// elements against one definition instead of re-declaring it per call site.
export type PastBookingMenuProps = {
  onContextMenu: (e: React.MouseEvent) => void;
} & LongPressHandlers;

/**
 * Context menu for a past (terminal) appointment, opened by desktop
 * right-click OR mobile long-press. The row's inline action menu hides for
 * terminal statuses, so this fills that gap with the actions that still make
 * sense after a visit: view, rebook, and (for completed visits) send a
 * rebooking nudge.
 *
 * Touch support exists because iOS Safari (and most mobile browsers) never
 * fire the native `contextmenu` DOM event on long-press — see useLongPress.
 * Without it, the menu simply never appeared on a phone or tablet.
 *
 * Uses a render prop so the caller keeps ownership of the target element (no
 * invalid DOM injected between e.g. `<tbody>` and `<tr>`); we only attach the
 * event handlers and an off-screen anchored trigger.
 */
export function PastBookingMenu({
  bookingId,
  status,
  children,
}: {
  bookingId: string;
  status: BookingStatus;
  children: (props: PastBookingMenuProps) => React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPending, startTransition] = useTransition();

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPoint({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  const longPressHandlers = useLongPress((p) => {
    setPoint(p);
    setOpen(true);
  });

  const handleNudge = () => {
    setOpen(false);
    startTransition(async () => {
      const result = await sendRebookNudge(bookingId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Rebooking nudge sent');
      router.refresh();
    });
  };

  // The menu (trigger anchor + content) is portalled to <body> so no stray
  // element lands between <tbody> and <tr>.
  const menu =
    typeof document !== 'undefined'
      ? createPortal(
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <span
                aria-hidden
                style={{ position: 'fixed', left: point.x, top: point.y, width: 0, height: 0 }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => router.push(`/bookings/${bookingId}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(`/bookings/${bookingId}?rebook=1`)}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Rebook
              </DropdownMenuItem>
              {status === 'COMPLETED' && (
                <DropdownMenuItem onSelect={handleNudge} disabled={isPending}>
                  <MessageSquareHeart className="mr-2 h-4 w-4" />
                  Send rebooking nudge
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>,
          document.body
        )
      : null;

  return (
    <>
      {children({ onContextMenu, ...longPressHandlers })}
      {menu}
    </>
  );
}
