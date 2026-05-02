# UI/UX Enhancement Plan — Design-Forward ReactBits for OpenChair

## Context

This is **Terence London**'s hairdressing salon SaaS — a premium Melbourne salon (Templestowe) with 40+ years in the business. They value appearance and design. Their website (terencelondon.com.au) features: hero with "Hair by Design · Colour • Cut • Style • Transform", service cards, editorial collections (Idol, Lumière, Vivo), before/after transformations, testimonials, and team profiles with initials. Premium products: GHD, La Biosthetique, Medavita.

The dashboard is the **main page** — it must feel premium and alive, not like a spreadsheet. We'll also add a hero banner image from Unsplash to the dashboard to set the tone.

## Current State

| Area           | File                                        | Problem                                      |
| -------------- | ------------------------------------------- | -------------------------------------------- |
| Landing        | `src/app/page.tsx`                          | 3 lines: h1 + p + button. Zero personality   |
| Auth           | `src/app/(auth)/layout.tsx`                 | `bg-gray-50`, bare card — prototype feel     |
| Dashboard      | `src/app/(dashboard)/dashboard/page.tsx`    | Flat stat cards, static numbers, plain list  |
| Sidebar        | `src/app/(dashboard)/layout.tsx` line 49    | Plain `<h1>OpenChair</h1>` — no brand        |
| Client Detail  | `src/app/(dashboard)/clients/[id]/page.tsx` | Stats work, but static and flat              |
| Public Booking | `src/app/book/[salonSlug]/page.tsx`         | White bg, basic form                         |
| CSS            | `src/app/globals.css`                       | Standard shadcn vars, zero custom animations |

## Design Vision

**"Premium salon software that looks as good as the haircuts"**

Inspired by terencelondon.com.au's design language:

- Dark, premium surfaces with subtle light effects
- Typography-forward — bold headings, refined details
- Aspirational salon imagery setting the mood
- Numbers that feel alive, not static

## Dashboard Redesign — The Hero

The dashboard currently opens with:

```
Dashboard (plain h1)
Salon Name · Date (muted text)
4x flat stat cards
Today's Schedule list
Bookings by Stylist
```

**New design:**

- **Hero welcome banner** at top — Unsplash salon image (dark overlay + gradient) with greeting text "Good morning, [Name]" + salon name + date, animated with BlurText
- **4 SpotlightCard stat cards** with animated Counter numbers — mouse glow effect
- **Today's Schedule** with AnimatedList stagger
- **Bookings by Stylist** unchanged but in SpotlightCard wrapper

Unsplash image URL (free, no attribution required):
`https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80` (salon interior, warm tones)
Downloaded to `public/images/salon-hero.jpg` for self-hosting.

## ReactBits Components (8 — trimmed from 10, KISS)

### Must-Have (5)

| Component         | Dep    | Where                                | Source                                                                                             |
| ----------------- | ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **SpotlightCard** | CSS    | Dashboard + client detail stat cards | Adapted from ReactBits — `useRef` + `onMouseMove` + radial-gradient, state-based opacity           |
| **CountUp**       | motion | All stat numbers                     | ReactBits CountUp — `useMotionValue`, `useSpring`, `useInView`, `Intl.NumberFormat`                |
| **BlurText**      | motion | Page titles, dashboard greeting      | ReactBits BlurText — per-word `motion.span`, blur(10px)→blur(0px) + y offset, IntersectionObserver |
| **GradientText**  | CSS    | "OpenChair" brand in sidebar         | Simple `background-clip: text` with animated gradient                                              |
| **AnimatedList**  | motion | Dashboard schedule, booking history  | `motion.div` stagger with fade+slide                                                               |

### Nice-to-Have (3)

| Component       | Dep    | Where                          |
| --------------- | ------ | ------------------------------ |
| **Aurora**      | CSS    | Landing + auth backgrounds     |
| **ShinyText**   | motion | Landing tagline, empty states  |
| **ScrollFloat** | motion | Section headings on long pages |

### Dropped (KISS)

- **SplitText** — uses GSAP (heavy dep), BlurText achieves same effect with motion only
- **Dock** — cool but complex, sidebar works fine on mobile with hamburger

## Source Code — Key Implementation References

### SpotlightCard (from ReactBits TS+Tailwind)

- Uses `useRef<HTMLDivElement>`, `useState` for position + opacity
- `onMouseMove` calculates `e.clientX - rect.left` for position
- Renders: outer div with `relative rounded-3xl border overflow-hidden` + inner div with `pointer-events-none absolute inset-0` using `radial-gradient(circle at ${x}px ${y}px, ${color}, transparent 80%)`
- Adapted for light theme: use `rgba(120, 119, 198, 0.15)` instead of white-on-dark

### CountUp (from ReactBits TS+Tailwind)

```
Props: to, from=0, direction='up', delay=0, duration=2, className, separator, startWhen=true
Uses: useMotionValue, useSpring (damping=20+40*(1/duration), stiffness=100*(1/duration)), useInView
Renders: <span ref={ref} /> — sets textContent via springValue.on('change') callback
Formats via Intl.NumberFormat with separator support
```

### BlurText (from ReactBits TS+Tailwind)

```
Props: text, delay=200, className, animateBy='words', direction='top', threshold=0.1
Uses: motion from 'motion/react', IntersectionObserver (manual, not useInView)
Splits text by words/letters, renders motion.span per segment
Default from: { filter: 'blur(10px)', opacity: 0, y: -50 }
Default to: [{ filter: 'blur(5px)', opacity: 0.5, y: 5 }, { filter: 'blur(0px)', opacity: 1, y: 0 }]
Builds keyframes array, uses stepDuration=0.35 with times array
```

### ShinyText (from ReactBits TS+Tailwind)

```
Uses motion/react: useMotionValue, useAnimationFrame, useTransform
Props: text, speed=2, color='#b5b5b5', shineColor='#ffffff', spread=120
Animates a gradient mask position via useAnimationFrame
```

## File Map

### New Files

- `public/images/salon-hero.jpg` — download from Unsplash
- `src/components/ui/spotlight-card.tsx`
- `src/components/ui/count-up.tsx`
- `src/components/ui/blur-text.tsx`
- `src/components/ui/gradient-text.tsx`
- `src/components/ui/animated-list.tsx`
- `src/components/ui/aurora-background.tsx`
- `src/components/ui/shiny-text.tsx`

### Modified Files

- `package.json` — add `motion`
- `src/app/globals.css` — aurora keyframes, gradient-text animation
- `src/app/page.tsx` — full redesign with Aurora + BlurText + GradientText + ShinyText
- `src/app/(auth)/layout.tsx` — Aurora background
- `src/app/(dashboard)/layout.tsx` — GradientText for "OpenChair" in sidebar (line 49)
- `src/app/(dashboard)/dashboard/page.tsx` — hero banner + SpotlightCard + CountUp + AnimatedList + BlurText greeting
- `src/app/(dashboard)/clients/[id]/page.tsx` — SpotlightCard + CountUp stats
- `src/app/(dashboard)/clients/page.tsx` — BlurText title
- `src/app/(dashboard)/bookings/page.tsx` — BlurText title
- `src/app/(dashboard)/team/page.tsx` — BlurText title
- `src/app/(dashboard)/services/page.tsx` — BlurText title
- `src/app/(dashboard)/settings/page.tsx` — BlurText title
- `src/app/(dashboard)/bookings/recurring/page.tsx` — BlurText title
- `src/app/(dashboard)/bookings/waitlist/page.tsx` — BlurText title
- `src/app/book/[salonSlug]/page.tsx` — Aurora bg

## Existing Code to Remember

### Dashboard layout structure (line 46-64 of layout.tsx):

```tsx
<div id="salon-theme-scope" className={cn('flex min-h-screen', isDark && 'dark')}>
  <aside className="hidden w-64 border-r bg-background lg:block">
    <div className="px-6 py-4">
      <h1 className="text-lg font-bold">OpenChair</h1> // ← line 49, replace with GradientText
    </div>
    <Sidebar />
  </aside>
  ...
</div>
```

### Pages with h1 to replace (grep results):

- `src/app/(dashboard)/bookings/page.tsx:98` — `<h1 ...>Bookings</h1>`
- `src/app/(dashboard)/dashboard/page.tsx:109` — `<h1 ...>Dashboard</h1>`
- `src/app/(dashboard)/clients/page.tsx:36` — `<h1 ...>Clients</h1>`
- `src/app/(dashboard)/services/page.tsx:92` — `<h1 ...>Services</h1>`
- `src/app/(dashboard)/settings/page.tsx:20` — `<h1 ...>Settings</h1>`
- `src/app/(dashboard)/team/page.tsx:24` — `<h1 ...>Team</h1>`
- `src/app/(dashboard)/bookings/recurring/page.tsx:33` — `<h1 ...>Recurring Bookings</h1>`
- `src/app/(dashboard)/bookings/waitlist/page.tsx:35` — `<h1 ...>Waitlist</h1>`
- `src/app/(dashboard)/bookings/[id]/page.tsx:54` — `<h1 ...>Booking Details</h1>`
- `src/app/(dashboard)/clients/[id]/page.tsx:88` — `<h1 ...>{client.name}</h1>`
- `src/app/(dashboard)/team/[id]/page.tsx:39` — `<h1 ...>{stylist.name}</h1>`

All use pattern: `<h1 className="text-2xl font-bold tracking-tight">TEXT</h1>`

### Auth layout (entire file):

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

### Landing page (entire file):

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">OpenChair</h1>
      <p className="text-lg text-muted-foreground">AI-native salon operating system</p>
      <Button asChild>
        <Link href="/sign-in">Sign In</Link>
      </Button>
    </div>
  );
}
```

## Steps

1. Install `motion` package — run `npm install motion`
2. Download Unsplash salon hero image to `public/images/salon-hero.jpg` using curl from `https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80`
3. Add CSS animations to `src/app/globals.css` — aurora keyframes (3 floating gradient blobs, blur(60px), mix-blend-mode), gradient-text animated background-clip class
4. Create `src/components/ui/spotlight-card.tsx` — port ReactBits SpotlightCard to TypeScript: useRef + useState for position/opacity, onMouseMove tracking, radial-gradient overlay div, adapted for light theme with `rgba(120, 119, 198, 0.15)` default, props: `children`, `className`, `spotlightColor`
5. Create `src/components/ui/count-up.tsx` — port ReactBits CountUp to TypeScript using `useMotionValue`, `useSpring`, `useInView` from `motion/react`, renders `<span>` with textContent set via springValue change listener, Intl.NumberFormat for formatting, props: `to`, `from?`, `duration?`, `className?`, `separator?`
6. Create `src/components/ui/blur-text.tsx` — port ReactBits BlurText to TypeScript using `motion` from `motion/react`, splits text into words, each word is `motion.span` with blur(10px)→blur(0px) + y offset animation, IntersectionObserver trigger, props: `text`, `delay?`, `className?`, `animateBy?`, `direction?`
7. Create `src/components/ui/gradient-text.tsx` — client component wrapping children in span with animated gradient background-clip, CSS animation rotates gradient angle, props: `children`, `className`
8. Create `src/components/ui/animated-list.tsx` — client component using `motion.div` from `motion/react`, wraps each child in staggered fade+slide animation, props: `children`, `className`, `delay?`
9. Create `src/components/ui/aurora-background.tsx` — div with 3 absolute-positioned gradient circles animated with CSS keyframes, `filter: blur(60px)`, `opacity: 0.3`, props: `children`, `className`
10. Create `src/components/ui/shiny-text.tsx` — port ReactBits ShinyText to TypeScript using `useMotionValue`, `useAnimationFrame`, `useTransform` from `motion/react`, animated gradient mask, props: `text`, `speed?`, `className?`, `color?`, `shineColor?`
11. Redesign `src/app/page.tsx` — AuroraBackground wrapping full page, BlurText for "OpenChair" hero (text-6xl font-bold), GradientText wrapping the brand name, ShinyText for tagline "AI-native salon operating system", centered layout with prominent CTA button
12. Update `src/app/(auth)/layout.tsx` — wrap content in AuroraBackground, remove `bg-gray-50`
13. Update `src/app/(dashboard)/layout.tsx` line 49 — replace `<h1 className="text-lg font-bold">OpenChair</h1>` with `<GradientText className="text-lg font-bold">OpenChair</GradientText>`
14. Redesign `src/app/(dashboard)/dashboard/page.tsx` — add hero welcome banner at top (salon-hero.jpg with dark gradient overlay, BlurText greeting "Good morning" + salon name + date), wrap 4 stat cards in SpotlightCard with CountUp for numbers, wrap today's schedule items in AnimatedList
15. Update `src/app/(dashboard)/clients/[id]/page.tsx` — wrap 4 stat cards in SpotlightCard, use CountUp for totalVisits and noShowCount numbers
16. Add BlurText page title animation to all dashboard pages — replace `<h1 className="text-2xl font-bold tracking-tight">TEXT</h1>` with `<BlurText text="TEXT" className="text-2xl font-bold tracking-tight" />` in: clients/page.tsx, bookings/page.tsx, team/page.tsx, services/page.tsx, settings/page.tsx, bookings/recurring/page.tsx, bookings/waitlist/page.tsx, bookings/[id]/page.tsx, team/[id]/page.tsx
17. Update `src/app/book/[salonSlug]/page.tsx` — add AuroraBackground wrapper for premium public booking experience
18. Run quality gates — `npx tsc --noEmit`, `npx next lint`, `npx vitest run` — fix all errors
