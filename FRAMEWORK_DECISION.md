# Framework Decision: AI-Native Salon Operating System

## TL;DR — WINNER: Next.js (App Router) + Supabase + Prisma + Tailwind + shadcn/ui

**Verdict: Stick with the planned stack. Upgrade to Next.js 15+ (not 14).** The evidence is overwhelming and unambiguous. No alternative comes close for this specific use case.

---

## The Three Contenders

| Metric                    | Next.js (15+)       | SvelteKit (2.49) | React Router v7 (ex-Remix)  |
| ------------------------- | ------------------- | ---------------- | --------------------------- |
| **GitHub Stars**          | 138,526             | 20,032           | ~53K (react-router)         |
| **npm Weekly Downloads**  | 27.6M               | 786K             | ~12M (react-router)         |
| **Full-time Maintainers** | 30+ (Vercel-funded) | Volunteer-driven | Shopify-funded (small team) |
| **Latest Stable**         | v15.x (v16 canary)  | v2.49            | v7.x                        |

---

## Criterion-by-Criterion Analysis

### 1. SSR for Booking Pages (SEO for Salon Discovery)

**Next.js: ★★★★★**

- Server Components are the default — every booking page is SSR'd with zero config
- Partial Prerendering (PPR) in v15: static shell loads instantly from CDN, dynamic booking availability streams in — perfect for salon discovery pages that need both SEO and real-time data
- `generateMetadata()` for dynamic per-salon SEO tags, structured data (JSON-LD) embedded in initial HTML
- Sites built with Next.js typically score 90+ on Lighthouse audits

**SvelteKit: ★★★★☆**

- SSR works well via `+page.server.ts` load functions
- Excellent performance (Svelte's compiler produces smaller bundles)
- But no equivalent to PPR — you must choose between full SSR or prerendering per route

**React Router v7: ★★★☆☆**

- Framework mode supports SSR via loaders
- But: Remix v3 has abandoned React and is experimental/not production-ready. React Router v7 is stable but the ecosystem is in a confusing transitional state
- Developer community is fragmenting — some migrating to TanStack

**Winner: Next.js** — PPR is a game-changer for booking pages where you need instant static shells with streaming dynamic availability.

---

### 2. API Routes for Webhooks (Stripe, Twilio, WhatsApp)

**Next.js: ★★★★★**

- Route Handlers in `app/api/` handle POST webhooks trivially
- The official Next.js org ships a SaaS starter (`nextjs/saas-starter`) pre-configured with Stripe + shadcn/ui — this exact pattern is production-proven
- Server Actions for form mutations eliminate API boilerplate for internal CRUD
- Raw `Request`/`Response` web standard objects — Stripe signature verification works identically to Express

**SvelteKit: ★★★★☆**

- `+server.ts` files handle webhooks well with standard Request/Response
- Works fine but fewer production examples for Stripe/Twilio webhook patterns

**React Router v7: ★★★☆☆**

- Action/loader model works for webhooks but less intuitive for standalone POST endpoints
- Fewer documented webhook integration patterns

**Winner: Next.js** — battle-tested webhook patterns, official SaaS starter with Stripe.

---

### 3. Real-time Capabilities (Booking Availability Updates)

**Next.js: ★★★★★**

- Supabase has an **official guide** specifically for "Realtime with Next.js" (updated March 2026)
- Supabase Realtime channels with RLS policies work with the `@supabase/ssr` package out of the box
- Client Components subscribe to Supabase Realtime for live booking slot updates
- Server Components fetch initial state; client components handle subscriptions — clean separation

**SvelteKit: ★★★★☆**

- Supabase Realtime works via the same JS client
- Svelte's reactivity model is arguably more elegant for real-time updates
- But: Supabase's official SSR auth docs note SvelteKit support exists but is not the primary documented path

**React Router v7: ★★★☆☆**

- No special real-time support; uses same Supabase client
- Less documentation for this specific pattern

**Winner: Next.js** — official Supabase Realtime + Next.js guide, with `@supabase/ssr` providing seamless server/client auth handoff.

---

### 4. Image Handling (Virtual Hairstyle Try-On / AI Processing Pipeline)

**Next.js: ★★★★★ — This is the knockout punch.**

- **Vercel AI SDK**: Purpose-built TypeScript SDK with `generateImage()` supporting OpenAI, Replicate, Fal, Google Vertex — all swappable with one line of code
- Official Vercel template: "AI SDK Image Generator" — Next.js + AI SDK + shadcn/ui for image generation with multiple providers
- Multimodal prompting: Send client photos to AI models, stream results back via Server Components
- `next/image` for automatic optimization of client photos and AI-generated hairstyle previews
- Supabase Storage for photo uploads with RLS-protected buckets

**SvelteKit: ★★★☆☆**

- AI SDK technically supports Svelte but all templates and examples are Next.js-first
- No equivalent image optimization component (`next/image`)
- Would need to wire up image processing pipeline manually

**React Router v7: ★★★☆☆**

- Same manual wiring required
- No built-in image optimization

**Winner: Next.js** — The Vercel AI SDK gives you a plug-and-play pipeline for the virtual hairstyle try-on feature. This is the single biggest differentiator for your Phase 2.

---

### 5. Supabase Integration Quality

**Next.js: ★★★★★**

- `@supabase/ssr` was built for Next.js first — handles cookie-based auth across Server Components, Route Handlers, and Middleware
- Official quickstart, tutorials, and realtime guide all use Next.js as the primary example
- A Udemy course exists specifically for "Next.js 15 & Supabase - Build a Salon & Spa Booking App"
- Multiple production booking systems on GitHub use this exact stack (hotel booking, rental booking)

**SvelteKit: ★★★★☆**

- `@supabase/ssr` also supports SvelteKit with `hooks.server.ts`
- Official quickstart and tutorial exist
- However, a community developer noted: "The main documentation for Supabase and SvelteKit is flawed" — requiring workarounds
- Fewer production examples

**React Router v7: ★★☆☆☆**

- No dedicated Supabase integration package
- Must use generic `supabase-js` client with manual cookie handling

**Winner: Next.js** — Supabase treats Next.js as its primary framework partner. The integration is deeper and better documented.

---

### 6. shadcn/ui and Component Ecosystem

**Next.js: ★★★★★**

- shadcn/ui was built for React/Next.js — 111K+ GitHub stars, the most-starred React UI project
- CLI v4.0.5 (March 2026) natively supports Next.js, Vite, Remix, Astro
- February 2026 Visual Builder reduces setup friction to near zero
- Massive ecosystem: dashboard templates, booking components, calendar pickers, data tables
- The official Next.js SaaS starter ships with shadcn/ui

**SvelteKit: ★★☆☆☆**

- `shadcn-svelte` exists as a community port — not maintained by shadcn
- Significantly smaller component library
- Fewer third-party extensions (no equivalent to the "awesome-shadcn-ui" ecosystem with 100+ extensions)

**React Router v7: ★★★★☆**

- shadcn/ui CLI supports Remix/React Router
- Full React ecosystem available
- But component templates assume Next.js patterns (Server Components, etc.)

**Winner: Next.js** — shadcn/ui is a React/Next.js-native project. The component ecosystem for salon dashboards (calendars, client cards, data tables) is unmatched.

---

### 7. Deployment Simplicity

**Next.js: ★★★★☆**

- **Vercel**: One-click deploy, zero config, automatic preview deployments
- **Self-hosted**: Docker with `output: 'standalone'` is well-documented. Works on any Node.js host, Kubernetes, AWS, etc.
- Caveat: Self-hosting requires more DevOps knowledge for caching, image optimization, and multi-instance coordination
- Verified adapters coming for Cloudflare and Netlify
- Next.js can also export as fully static site if needed

**SvelteKit: ★★★★★**

- Adapter system is more elegant — `adapter-node`, `adapter-vercel`, `adapter-cloudflare`, etc.
- Simpler deployment model, fewer "hidden" platform dependencies
- Smaller bundle sizes = lower hosting costs

**React Router v7: ★★★★☆**

- Vite-based, deploys easily to most platforms
- Good Docker story

**Winner: SvelteKit** slightly edges out here for pure deployment flexibility. But Next.js is absolutely fine — especially when starting with Vercel and potentially self-hosting later. The difference is marginal.

---

### 8. Community Size and Maintenance Status

**Next.js: ★★★★★**

- 138K+ GitHub stars, 27.6M weekly npm downloads
- 30+ full-time Vercel engineers maintaining it
- 68% of JavaScript developers use Next.js (State of JS 2024)
- Powers Netflix, TikTok, Uber, Nike, Starbucks, ChatGPT, GitHub, Linear
- "In 2026, Next.js remains the gold standard" — multiple independent sources

**SvelteKit: ★★★☆☆**

- 20K GitHub stars, 786K weekly npm downloads (35x smaller than Next.js)
- Volunteer-driven (Svelte is MIT-licensed, community-funded via Open Collective)
- Excellent developer satisfaction but small talent pool for hiring
- Only ~10 contributors to `@sveltejs/kit`

**React Router v7: ★★☆☆☆**

- Ecosystem in turmoil: Remix merged into React Router, Remix v3 abandoned React
- Developer community is fragmenting — many migrating to TanStack or Next.js
- "Some devs turn to TanStack after Remix/React Router merger" — community confidence is shaken

**Winner: Next.js** — by an order of magnitude. Critical for a startup: hiring React/Next.js developers is trivially easy; hiring Svelte developers is hard.

---

## Final Scorecard

| Criterion                       | Next.js   | SvelteKit | React Router v7 |
| ------------------------------- | --------- | --------- | --------------- |
| 1. SSR for Booking Pages        | ★★★★★     | ★★★★☆     | ★★★☆☆           |
| 2. API Routes for Webhooks      | ★★★★★     | ★★★★☆     | ★★★☆☆           |
| 3. Real-time Capabilities       | ★★★★★     | ★★★★☆     | ★★★☆☆           |
| 4. Image Handling / AI Pipeline | ★★★★★     | ★★★☆☆     | ★★★☆☆           |
| 5. Supabase Integration         | ★★★★★     | ★★★★☆     | ★★☆☆☆           |
| 6. shadcn/ui Ecosystem          | ★★★★★     | ★★☆☆☆     | ★★★★☆           |
| 7. Deployment Simplicity        | ★★★★☆     | ★★★★★     | ★★★★☆           |
| 8. Community & Maintenance      | ★★★★★     | ★★★☆☆     | ★★☆☆☆           |
| **TOTAL**                       | **39/40** | **29/40** | **23/40**       |

---

## Recommended Stack (Updated)

```
Framework:    Next.js 15+ (App Router)     ← Upgrade from 14, get PPR + Turbopack
Database:     Supabase (Postgres + Auth + Realtime + Storage)
ORM:          Prisma (with Supabase connection pooler)
Styling:      Tailwind CSS v4
Components:   shadcn/ui (v4 CLI)
AI:           Vercel AI SDK (for Phase 2 hairstyle try-on)
Payments:     Stripe (via Route Handlers)
SMS:          Twilio (via Route Handlers)
WhatsApp:     Twilio WhatsApp API or Meta Business API
Deployment:   Vercel (MVP) → Docker self-host (scale)
```

## One Critical Upgrade: Next.js 14 → 15+

Your plan says Next.js 14. **Upgrade to 15+.** Here's why:

1. **Partial Prerendering (PPR)**: Static salon pages with streaming booking availability — massive SEO + UX win
2. **Turbopack stable**: 10x faster dev server HMR
3. **React 19**: `useActionState`, `useFormStatus` for booking forms
4. **`next/image` improvements**: Sharp included by default (no extra install for self-hosting)
5. **Improved caching**: Better `stale-while-revalidate` headers for self-hosting
6. **AI SDK compatibility**: Latest Vercel AI SDK templates target Next.js 15

The upgrade from 14 → 15 is straightforward (codemods available). Do it now before writing any code.

---

## Why Not SvelteKit?

SvelteKit is an excellent framework — leaner, faster DX, more elegant reactivity. But for **this specific product**:

1. **The AI pipeline is the moat** — Vercel AI SDK's image generation with Next.js is plug-and-play. With SvelteKit you'd build it from scratch.
2. **shadcn/ui ecosystem** — Calendar components, data tables, client card templates, dashboard layouts are all React/Next.js native. SvelteKit has community ports but they're 1/50th the size.
3. **Hiring** — You'll eventually need to hire. React/Next.js developers are 35x more available than Svelte developers.
4. **Supabase is Next.js-first** — The integration is deeper, better documented, and more battle-tested.

## Why Not React Router v7 / Remix?

The ecosystem is in active turmoil. Remix v3 has abandoned React entirely (experimental Preact-based rewrite). React Router v7 framework mode is stable but the developer community is fragmenting. Betting your product on a framework whose identity is in flux is unwise. The official Remix website now says: "If you're looking for a full stack, React-based framework, check out React Router" — and many developers are instead checking out Next.js or TanStack.

---

_Analysis completed March 31, 2026. Based on npm downloads, GitHub statistics, official documentation, production examples, and current framework status._
