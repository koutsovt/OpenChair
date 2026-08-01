'use client';

import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 500;
// Finger moving past this many px means the user is scrolling/dragging, not
// long-pressing — cancel so we never hijack native touch scrolling.
const MOVE_CANCEL_THRESHOLD_PX = 10;

export type LongPressHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
};

/**
 * Detects a touch long-press and invokes onLongPress with the touch point.
 *
 * iOS Safari (13+) never fires the native `contextmenu` DOM event on
 * long-press — it only shows its own text-selection "callout" — so any menu
 * that relies solely on `onContextMenu` (which works fine for a desktop
 * right-click) never appears on touch devices. This hook is the missing
 * touch->context-menu translation: touchstart arms a timer, touchmove past a
 * small threshold cancels it (so it never blocks scrolling or dragging), and
 * touchend/touchcancel before the timer fires cancels it too (ordinary tap).
 *
 * Never calls preventDefault() in touchstart/touchmove — doing so would
 * block native page scroll for every touch, not just long-presses.
 */
export function useLongPress(onLongPress: (point: { x: number; y: number }) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const point = { x: touch.clientX, y: touch.clientY };
      startRef.current = point;
      timerRef.current = setTimeout(() => {
        onLongPress(point);
        clear();
      }, LONG_PRESS_MS);
    },
    [onLongPress, clear]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const start = startRef.current;
      if (!touch || !start) return;
      const dx = Math.abs(touch.clientX - start.x);
      const dy = Math.abs(touch.clientY - start.y);
      if (dx > MOVE_CANCEL_THRESHOLD_PX || dy > MOVE_CANCEL_THRESHOLD_PX) {
        clear();
      }
    },
    [clear]
  );

  const handlers: LongPressHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd: clear,
    onTouchCancel: clear,
  };

  return handlers;
}
