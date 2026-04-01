# Automated Scheduling — Auto-assign, Smart Suggestions, Recurring, Waitlist

## Current State

### Schema (`prisma/schema.prisma`)

- **Booking** model: id, startTime, endTime, status (PENDING/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW), notes, price, clientId?, guestName?, guestPhone?, serviceId, stylistId, salonId, cancelledAt?, cancelReason?
- **Stylist** model: id, name, email, phone, bio, isActive, sortOrder, salonId, userId?
- **StylistAvailability** model: id, dayOfWeek (0-6), startTime ("09:00"), endTime ("17:00"), isActive, stylistId
- **StylistService** join table: stylistId, serviceId, priceOverride?, durationOverride?
- **Service** model: id, name, price (cents), duration (mins), isActive, salonId, categoryId?
- **Client** model: id, name, phone?, email?, notes?, source?, isActive, salonId

### Key existing code

- `src/lib/slots.ts` — `getAvailableSlots(date, availability, existingBookings, serviceDuration, timezone, slotInterval)` returns `TimeSlot[]`
- `src/lib/booking-validation.ts` — `findConflictingBooking()` and `validateBooking()` check for overlaps
- `src/server/actions/bookings.ts` — `createBooking()`, `updateBookingStatus()`, `rescheduleBooking()`, `getAvailableSlotsAction()`
- `src/lib/twilio.ts` — `sendSMS(to, body)` with dev mode fallback
- `src/lib/sms-templates.ts` — confirmation, reminder, cancellation message builders
- `src/app/api/cron/reminders/route.ts` — daily cron sends reminder SMS for tomorrow's bookings
- `src/lib/constants.ts` — `DEFAULT_SLOT_INTERVAL = 30`
- `src/types/index.ts` — re-exports Prisma types + composite types like BookingWithRelations, TimeSlot, BookingFormData

### Public booking flow

- `src/app/book/[salonSlug]/page.tsx` — choose stylist
- `src/app/book/[salonSlug]/[stylistId]/page.tsx` — pick time slot (requires `?serviceId=`)
- `src/app/book/[salonSlug]/confirm/page.tsx` — confirm and create booking

### Dashboard booking views

- `src/app/(dashboard)/bookings/page.tsx` — server component, fetches day's bookings, renders list or timeline
- `src/app/(dashboard)/bookings/_components/booking-list.tsx` — table view with BookingActions dropdown
- `src/app/(dashboard)/bookings/_components/booking-timeline.tsx` — visual grid: stylist columns, absolute-positioned blocks, `HOUR_HEIGHT=60px`, `START_HOUR=6`, `END_HOUR=22`. Currently static, no drag support.
- `src/app/(dashboard)/bookings/_components/booking-actions.tsx` — dropdown with status changes only (Complete, In Progress, No Show, Cancel). No reschedule.
- `src/server/actions/bookings.ts` — `rescheduleBooking(id, newStartTime)` exists but is NOT wired to any UI. Only changes time, not stylist.

---

## Feature 0: Manual Appointment Moving & Rescheduling

Stylists and owners need to manually drag appointments on the timeline or reschedule via a dialog.

### Drag-and-drop on timeline (`src/app/(dashboard)/bookings/_components/booking-timeline.tsx`)

- **Vertical drag** = change time (snap to 15-min grid)
- **Horizontal drag** = change stylist (snap to column)
- Use native HTML5 drag API (no extra dependencies)
- During drag: show ghost outline at snapped position, dim original block
- On drop: call `rescheduleBooking()` with new time + optional new stylist
- If conflict: show error toast, snap back to original position
- Only non-terminal bookings are draggable (not COMPLETED/CANCELLED/NO_SHOW)

### Reschedule dialog (from list view + booking detail)

- Add "Reschedule" option to `BookingActions` dropdown
- Opens a dialog with date picker + time slot grid for the booking's stylist
- On confirm: calls `rescheduleBooking()`

### Server action changes (`src/server/actions/bookings.ts`)

- Extend `rescheduleBooking(id, newStartTime, newStylistId?)` to accept optional stylist change
- Validate: conflict check, stylist availability check, stylist has the service
- Send SMS to client: "Your appointment has been moved to [new date/time]"

### SMS template (`src/lib/sms-templates.ts`)

- Add `bookingRescheduledMessage()` for notifying clients of moved appointments

---

## Feature 1: Auto-assign Stylists

When a client picks a service + time but **no stylist preference**, the system picks the best available one.

### Scoring algorithm (`src/lib/scheduling/auto-assign.ts`)

For each eligible stylist (has the service, is available, no conflict):

- **Availability score** (40%): Does the stylist have the slot free? Binary gate + time buffer bonus (more gap around the slot = better)
- **Workload balance** (30%): Fewer bookings that day = higher score (spread work evenly)
- **Gap minimization** (20%): Prefer filling gaps between existing bookings over creating new gaps (back-to-back is efficient)
- **Recency bonus** (10%): If the client has seen this stylist before, slight preference for continuity

### Implementation

- New function: `autoAssignStylist(salonId, serviceId, startTime, clientId?)` → returns `{ stylistId, score, reason }` or null
- Integrate into `createBooking()` — if `stylistId` is `"auto"`, call auto-assign
- Integrate into public booking flow — add "Any available stylist" option

---

## Feature 2: Smart Suggestions

Suggest optimal times based on stylist availability, existing gaps, and preferences.

### Algorithm (`src/lib/scheduling/smart-suggestions.ts`)

Given a service + optional stylist + date range, return ranked time slots:

- **Gap-filling priority**: Slots that fill gaps between existing bookings score highest
- **Peak avoidance**: Slightly prefer off-peak times when the day is already busy
- **Buffer time**: Avoid slots that leave tiny unusable gaps (e.g. 15min gap between bookings)
- **Multi-day**: Can suggest across a date range (e.g. "next 7 days")

### Output type

```ts
type SuggestedSlot = {
  start: Date;
  end: Date;
  stylistId: string;
  stylistName: string;
  score: number; // 0-100
  reason: string; // "Fills gap between bookings", "Back-to-back efficient"
};
```

### Integration

- New server action: `getSuggestedSlots(salonId, serviceId, stylistId?, dateRange)`
- Show in booking form as "Recommended times" section above the regular slot grid

---

## Feature 3: Recurring Bookings

Clients who come regularly (e.g. every 6 weeks for colour) can set up auto-repeating appointments.

### Schema changes (`prisma/schema.prisma`)

```prisma
model RecurringBooking {
  id            String   @id @default(cuid())
  intervalWeeks Int      // e.g. 6
  dayOfWeek     Int      // preferred day 0-6
  preferredTime String   // "10:00"
  isActive      Boolean  @default(true)
  nextRunDate   DateTime // when to create the next booking
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  clientId  String
  client    Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  serviceId String
  service   Service @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  stylistId String
  stylist   Stylist @relation(fields: [stylistId], references: [id], onDelete: Restrict)
  salonId   String
  salon     Salon   @relation(fields: [salonId], references: [id], onDelete: Cascade)

  bookings  Booking[] // generated bookings

  @@index([salonId, nextRunDate])
  @@index([clientId])
  @@map("recurring_bookings")
}
```

Also add to Booking model:

```prisma
recurringBookingId String?
recurringBooking   RecurringBooking? @relation(fields: [recurringBookingId], references: [id])
```

And add relations to Client, Service, Stylist, Salon models.

### Cron job (`src/app/api/cron/recurring/route.ts`)

- Runs daily (same auth as reminders cron)
- Finds RecurringBookings where `nextRunDate <= today + 14 days` and `isActive = true`
- For each: tries to create a booking at preferred time
  - If slot taken, uses auto-assign or smart suggestions to find nearest slot
  - Creates the booking, advances `nextRunDate` by `intervalWeeks`
  - Sends SMS: "Your recurring appointment has been booked: [details]"
  - If no slot found within ±2 days of preferred, marks as "needs attention" and notifies salon owner

### UI

- Add "Make recurring" toggle on booking detail page
- Recurring bookings page under `/bookings/recurring` (list, edit, pause/resume)

---

## Feature 4: Waitlist Auto-fill

When a cancellation opens a slot, auto-notify waitlisted clients.

### Schema changes (`prisma/schema.prisma`)

```prisma
model WaitlistEntry {
  id          String          @id @default(cuid())
  status      WaitlistStatus  @default(WAITING)
  preferredDateStart DateTime
  preferredDateEnd   DateTime
  preferredTimeStart String?  // "09:00"
  preferredTimeEnd   String?  // "17:00"
  notifiedAt  DateTime?
  expiresAt   DateTime        // auto-expire after X days
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  clientId  String
  client    Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  serviceId String
  service   Service @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  stylistId String?
  stylist   Stylist? @relation(fields: [stylistId], references: [id], onDelete: SetNull)
  salonId   String
  salon     Salon   @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@index([salonId, status])
  @@index([clientId])
  @@map("waitlist_entries")
}

enum WaitlistStatus {
  WAITING
  NOTIFIED
  BOOKED
  EXPIRED
  CANCELLED
}
```

Add relations to Client, Service, Stylist, Salon models.

### Cancellation trigger

When `updateBookingStatus()` sets status to `CANCELLED`:

1. Query waitlist entries matching the freed slot (service, stylist or any, date/time range)
2. Sort by `createdAt` (FIFO)
3. Send SMS: "A slot just opened up at [salon]! [service] with [stylist] on [date] at [time]. Reply BOOK to claim it."
4. Mark entry as `NOTIFIED`, set expiry (e.g. 2 hours to respond)
5. If no response, notify next person

### UI

- "Join waitlist" button on public booking page when no slots available
- Waitlist management page at `/bookings/waitlist` for salon owner

---

## File changes summary

### New files

- `src/lib/scheduling/auto-assign.ts` — auto-assign algorithm
- `src/lib/scheduling/smart-suggestions.ts` — smart slot suggestions
- `src/lib/scheduling/recurring.ts` — recurring booking creation logic
- `src/lib/scheduling/waitlist.ts` — waitlist matching and notification
- `src/server/actions/recurring.ts` — CRUD actions for recurring bookings
- `src/server/actions/waitlist.ts` — CRUD actions for waitlist
- `src/app/api/cron/recurring/route.ts` — daily cron for recurring bookings
- `src/app/(dashboard)/bookings/recurring/page.tsx` — recurring bookings management
- `src/app/(dashboard)/bookings/waitlist/page.tsx` — waitlist management
- `src/app/(dashboard)/bookings/_components/reschedule-dialog.tsx` — reschedule time picker dialog
- `src/lib/__tests__/auto-assign.test.ts` — unit tests
- `src/lib/__tests__/smart-suggestions.test.ts` — unit tests
- `src/lib/__tests__/recurring.test.ts` — unit tests
- `src/lib/__tests__/waitlist.test.ts` — unit tests

### Modified files

- `prisma/schema.prisma` — add RecurringBooking, WaitlistEntry models + relations
- `src/types/index.ts` — add new type exports
- `src/server/actions/bookings.ts` — extend `rescheduleBooking()` to accept `newStylistId`, integrate auto-assign into `createBooking()`, trigger waitlist on cancellation
- `src/app/(dashboard)/bookings/_components/booking-timeline.tsx` — add HTML5 drag-and-drop: draggable booking blocks, drop zones in stylist columns, snap-to-grid (15min), ghost preview, conflict toast, call `rescheduleBooking()` on drop
- `src/app/(dashboard)/bookings/_components/booking-actions.tsx` — add "Reschedule" menu item that opens reschedule dialog
- `src/app/(dashboard)/bookings/_components/booking-list.tsx` — show recurring icon on recurring bookings
- `src/app/(dashboard)/bookings/_components/new-booking-dialog.tsx` — add "Any stylist" option + show smart suggestions
- `src/app/(dashboard)/bookings/[id]/page.tsx` — add "Make recurring" action
- `src/app/book/[salonSlug]/page.tsx` — add "Any available stylist" option
- `src/app/book/[salonSlug]/[stylistId]/page.tsx` — show smart suggestions, add waitlist option
- `src/lib/sms-templates.ts` — add rescheduled, recurring, and waitlist message templates
- `src/components/layout/sidebar.tsx` — no change needed (waitlist/recurring are sub-pages of bookings)

## Steps

1. Add RecurringBooking and WaitlistEntry models to `prisma/schema.prisma` with all fields, relations (to Client, Service, Stylist, Salon, Booking), indexes, and enums. Add `recurringBookingId` field to Booking model. Add reverse relations on Client, Service, Stylist, and Salon models. Run `npx prisma migrate dev --name add-recurring-and-waitlist`.
2. Add new type exports to `src/types/index.ts` for RecurringBooking, WaitlistEntry, WaitlistStatus, SuggestedSlot, and AutoAssignResult types.
3. Create `src/lib/scheduling/auto-assign.ts` with `autoAssignStylist(salonId, serviceId, startTime, clientId?)` function that scores eligible stylists by availability (40%), workload balance (30%), gap minimization (20%), and client history recency (10%), returning `{ stylistId, stylistName, score, reason }` or null.
4. Create `src/lib/scheduling/smart-suggestions.ts` with `getSuggestedSlots(salonId, serviceId, stylistId?, startDate, endDate, limit?)` that returns ranked `SuggestedSlot[]` — prioritizing gap-filling, back-to-back efficiency, and avoiding tiny unusable gaps between bookings.
5. Create `src/lib/scheduling/recurring.ts` with `processRecurringBooking(recurring)` that creates the next booking at preferred time (falling back to auto-assign/nearest slot if unavailable), advances `nextRunDate`, and returns the result.
6. Create `src/lib/scheduling/waitlist.ts` with `matchWaitlistEntries(salonId, stylistId, serviceId, startTime, endTime)` that finds matching WAITING entries sorted by createdAt, and `notifyWaitlistClient(entry, slot)` that sends SMS and updates status to NOTIFIED.
7. Add SMS templates to `src/lib/sms-templates.ts`: `bookingRescheduledMessage()`, `recurringBookingMessage()`, `waitlistNotificationMessage()`, `waitlistExpiredMessage()`.
8. Extend `rescheduleBooking()` in `src/server/actions/bookings.ts` to accept optional `newStylistId` parameter. When provided, validate the new stylist has the service and is available, then update both `startTime`, `endTime`, and `stylistId`. Send rescheduled SMS to client.
9. Create `src/server/actions/recurring.ts` with server actions: `createRecurringBooking()`, `updateRecurringBooking()`, `pauseRecurringBooking()`, `deleteRecurringBooking()`, `listRecurringBookings()`.
10. Create `src/server/actions/waitlist.ts` with server actions: `addToWaitlist()`, `cancelWaitlistEntry()`, `listWaitlistEntries()`.
11. Modify `src/server/actions/bookings.ts`: in `createBooking()`, if `stylistId === "auto"`, call `autoAssignStylist()` to pick the best stylist. In `updateBookingStatus()`, when status is set to CANCELLED, call `matchWaitlistEntries()` and `notifyWaitlistClient()` for the freed slot.
12. Create new server action `getSuggestedSlotsAction()` in `src/server/actions/bookings.ts` that wraps `getSuggestedSlots()` for client use.
13. Rewrite `src/app/(dashboard)/bookings/_components/booking-timeline.tsx` to add drag-and-drop: make non-terminal booking blocks `draggable`, track drag state with `onDragStart`/`onDragEnd`, add `onDragOver`/`onDrop` handlers on the stylist column area, calculate snapped time (15-min intervals) and target stylist from drop coordinates, show a ghost preview div during drag, call `rescheduleBooking()` on successful drop, show error toast on conflict, use `useOptimistic` to move the block instantly before server confirmation.
14. Create `src/app/(dashboard)/bookings/_components/reschedule-dialog.tsx` — a dialog with a date picker and time slot grid for picking a new time. Takes `bookingId`, `currentStartTime`, `serviceDuration`, `stylistId`. On confirm calls `rescheduleBooking()`.
15. Update `src/app/(dashboard)/bookings/_components/booking-actions.tsx` to add a "Reschedule" menu item (with `CalendarClock` icon) that opens the RescheduleDialog. Pass booking data needed by the dialog.
16. Create `src/app/api/cron/recurring/route.ts` — daily cron (same Bearer auth pattern as reminders) that processes all RecurringBookings where `nextRunDate <= today + 14 days` and `isActive = true`, creating bookings and sending SMS notifications.
17. Create `src/app/(dashboard)/bookings/recurring/page.tsx` — management page showing all recurring bookings with pause/resume/edit/delete actions.
18. Create `src/app/(dashboard)/bookings/waitlist/page.tsx` — management page showing waitlist entries with status, client info, and cancel actions.
19. Update `src/app/(dashboard)/bookings/_components/new-booking-dialog.tsx` to add "Any available stylist" option in the stylist dropdown and a "Recommended times" section powered by smart suggestions.
20. Update `src/app/book/[salonSlug]/page.tsx` to add an "Any available stylist" card option alongside the individual stylist cards.
21. Update `src/app/book/[salonSlug]/[stylistId]/page.tsx` to show a "Join waitlist" button when no slots are available for the selected date, and highlight smart-suggested slots with a "Recommended" badge.
22. Write unit tests in `src/lib/__tests__/auto-assign.test.ts` for the auto-assign scoring algorithm covering: single stylist, multiple stylists with different workloads, client history preference, and no-availability edge case.
23. Write unit tests in `src/lib/__tests__/smart-suggestions.test.ts` for smart suggestions covering: gap-filling priority, back-to-back preference, multi-day range, and empty schedule.
24. Write unit tests in `src/lib/__tests__/recurring.test.ts` for recurring booking processing covering: happy path creation, slot-unavailable fallback, and nextRunDate advancement.
25. Write unit tests in `src/lib/__tests__/waitlist.test.ts` for waitlist matching covering: matching by service/stylist/time, FIFO ordering, and expiry handling.
26. Run full quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm exec prisma validate`, `pnpm format`, `pnpm build` — fix any errors until all pass clean.
