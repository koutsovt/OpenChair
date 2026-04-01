# Booking Cards Redesign — Colour-coded, prioritised, scannable

## Problem

The booking list view is a plain table — hard to scan, no visual priority, no colour coding beyond tiny status badges. Stylists need to glance at their schedule and instantly know what's next, what's urgent, and what type of service.

## Design Decisions

### Colour system

Two layers of colour — **status** (border/accent) + **service category** (left stripe):

**Status colours** (bold left border + background tint):

- `PENDING` → amber/orange border — needs confirmation, action required
- `CONFIRMED` → blue border — locked in, coming up
- `IN_PROGRESS` → purple border + subtle pulse ring — happening now, top priority
- `COMPLETED` → green border, slightly muted — done
- `CANCELLED` → red border, faded opacity — dismissed
- `NO_SHOW` → gray border, faded — dead slot

**Service category indicator** (small coloured dot):

- Cuts & Styling → slate dot
- Colour → pink/rose dot
- Treatments → teal dot

### Card layout (list view)

Replace the flat table with **booking cards** in a vertical stack:

```
┌─ purple border ──────────────────────────────────┐
│ ●pink  BALAYAGE                    ⏰ IN PROGRESS │
│ 10:00 – 13:00 (3h)                  Jade Nguyen  │
│ 👤 Mia Johnson            $280.00        [⋯]    │
└──────────────────────────────────────────────────┘
```

Key affordances:

- **Bold 4px left border** in status colour — instantly scannable
- **Status badge** top-right with icon
- **Time prominently displayed** in mono font, large
- **Duration shown** so stylist knows how long
- **Client name + service** are the two biggest text elements
- **IN_PROGRESS cards** get a subtle ring/glow animation — the "now" indicator
- **PENDING cards** get a pulsing amber dot — needs attention
- Cards are `rounded-xl` with `shadow-sm` — pronounced box, not flat

### Timeline view

Already colour-coded via `BOOKING_STATUS_COLORS`. Enhance:

- Thicker left border (4px) on each block
- Service category dot
- Slightly larger text, more padding
- IN_PROGRESS blocks get subtle glow

### Priority ordering in list view

Group bookings visually:

1. **Now** — IN_PROGRESS first (purple glow)
2. **Needs attention** — PENDING (amber pulse)
3. **Coming up** — CONFIRMED, sorted by time
4. **Done** — COMPLETED, CANCELLED, NO_SHOW at bottom, slightly dimmed

## Files to change

- **`src/lib/constants.ts`** (lines 10-17) — Richer status colour config with border, bg, text, and dot colours. Add service category colours.
- **`src/app/(dashboard)/bookings/_components/booking-list.tsx`** (full rewrite) — Replace Table with card-based layout
- **`src/app/(dashboard)/bookings/_components/booking-timeline.tsx`** (line 89) — Enhanced block styling with thicker border + category dot
- **`src/app/(dashboard)/bookings/page.tsx`** (line 78) — Pass `serviceCategory` through to bookingRows

## Steps

1. Update `src/lib/constants.ts` — expand `BOOKING_STATUS_COLORS` to include border, background, text, badge, and icon colours per status. Add `SERVICE_CATEGORY_COLORS` map with dot colours (slate/pink/teal). Add priority sort order map.
2. Update `src/app/(dashboard)/bookings/page.tsx` — add `serviceCategoryName` field to the `bookingRows` mapping (the service's category is already available via include, just need to add `category` to the service include).
3. Rewrite `src/app/(dashboard)/bookings/_components/booking-list.tsx` — replace the Table with a card-based vertical stack layout. Each card has: 4px left border in status colour, service category dot, large time display, client name, service name, stylist, price, status badge with icon, action menu. Cards sorted by priority (IN_PROGRESS → PENDING → CONFIRMED → rest). IN_PROGRESS gets ring animation, PENDING gets pulsing dot. Terminal statuses (COMPLETED/CANCELLED/NO_SHOW) get reduced opacity.
4. Enhance `src/app/(dashboard)/bookings/_components/booking-timeline.tsx` — add 4px left border to booking blocks, add service category dot, increase padding and text size slightly, add subtle ring/shadow to IN_PROGRESS blocks.
5. Run quality gates: lint, typecheck, and build to verify zero errors.
