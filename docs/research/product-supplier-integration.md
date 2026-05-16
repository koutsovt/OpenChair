# Product & Supplier Integration Research

**Topic:** How hair-product suppliers distribute their catalogs to salons, and how salon-management platforms ingest and link those catalogs to appointments.
**Prepared for:** OpenChair MVP planning
**Date:** May 2026
**Status:** Research / planning input — no implementation decisions finalised

---

## 1. Supplier-Side Distribution

### How Suppliers Reach Salons

Professional hair-product brands do not sell direct to most salons. The standard distribution chain is:

```
Brand (L'Oréal, Wella, Schwarzkopf, etc.)
  → Country distributor / sales rep
    → Wholesale distributor (SalonCentric US, Savoy AU, John Wurzel AU, etc.)
      → Salon (orders online, in-store, or via rep)
```

This means the "catalog" a salon sees is the _distributor's_ catalog, not the brand's own catalog. The brand provides product data to the distributor; the distributor maintains the SKU list.

### Wholesale Portals and Their Integration Capabilities

**SalonCentric (US — L'Oréal-owned, largest US professional distributor)**

- Operates a web portal and iOS/Android app. The app supports barcode scanning to look up product info, watch videos, and add to a shopping list, but checkout redirects to the website. There is **no public API** for programmatic catalog access. SalonCentric runs on the **Mirakl** marketplace platform (this is how third-party brands sell through it). The Mirakl layer exposes structured product fields (name, UPC/barcode, SKU, image URL, category) to sellers, but this is a _seller-side_ onboarding tool, not a buyer-side catalog API for salons. Products must have UPCs to list.
- **EDI**: SalonCentric is a recognised EDI trading partner. eZCom and similar EDI middleware vendors list it; this is used by _brands_ and _distributors_ to exchange purchase orders and invoices, not by individual salons.
- **Bottom line for OpenChair:** No public API. Salons order via web/app. Integration would require a Mirakl seller account (not applicable for a salon OS) or a bespoke arrangement with SalonCentric's B2B team. Would need verification.

**Wella / Wellastore (US, AU, NZ, EU)**

- Wella launched the **Wellastore** app for iOS/Android in 2022, with mobile ordering tools and a digital shade chart. In 2025 it added an AI consultation feature (InspoLab™). Operates in 20+ markets including AU and NZ.
- **No public API confirmed.** Wella's B2B portal is proprietary. There may be trade/partner arrangements for larger salon groups, but nothing publicly documented. _Would need to verify directly with Wella's B2B team._
- Shade codes follow the international notation: `6/0` (base shade 6, neutral), `7/3` (level 7, golden), e.g. `Koleston Perfect 7/3`. This notation is consistent across Wella's ranges (Koleston, Color Touch, Illumina, Inoa at L'Oréal).

**Schwarzkopf Professional / Goldwell (Henkel and Kao respectively)**

- Both operate B2B portals for authorised salon accounts. No public developer API documented. Goldwell's parent Kao operates country entities (Kao Australia Pty Ltd, etc.) but catalog access is gated behind salon account relationships.
- Shade codes: Schwarzkopf IGORA uses `7-0`, `8-77` notation. Goldwell Topchic uses `7N`, `8KG` notation. Each brand has its own system — there is no cross-brand shade-code standard.

**Kevin Murphy (Australian brand, global reach)**

- Consumer-facing site shows product range. Wholesale ordering is through authorised distributors (AU: various regional reps). No public API or EDI feed documented.

**Davines / Redken / Aveda / Bumble and bumble**

- Similar pattern: brand website shows products, actual wholesale is through distributor accounts. Redken is L'Oréal-owned, distributed in AU through L'Oréal Professional Products Division.

### Common Product Identifiers

| Identifier                              | Description                                                                     | Availability                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **GTIN / EAN / UPC barcode**            | 13-digit (EAN) or 12-digit (UPC) barcode on physical packaging                  | Printed on every retail/pro product; required by SalonCentric for marketplace listings |
| **Supplier SKU**                        | Brand's own internal product code (e.g. Wella `81318393`)                       | Available on product packaging and distributor portals                                 |
| **Shade code**                          | Colour-specific suffix (e.g. `7/3`, `6/45`, `7N`)                               | Brand-specific notation; not standardised across brands                                |
| **Open Beauty Facts / Open Food Facts** | Community-sourced open database of beauty product barcodes, ingredients, images | Free; patchy for professional products, good for retail consumer ranges                |

### Manufacturer-Provided Product Data

What brands _do_ publish publicly (on their websites and distributor portals):

- Product name, range/collection name, size/weight
- Shade names and codes (for colour products)
- Ingredients list (INCI format — legally required in AU, EU, US)
- MSDS/SDS sheets (safety data sheets — available on request or brand website)
- Marketing images and hero photography
- Recommended retail price (RRP) — widely published; wholesale prices are gated

What is **not** publicly available without a trade account:

- Wholesale price tiers
- Real-time stock availability
- Structured catalog download (CSV/JSON/API)

---

## 2. Salon Software Ingestion Patterns

### Platform-by-Platform Summary

**Phorest** (Ireland-based; strong in AU, UK, US, IE)

- Phorest has a public-facing API (`api-requests@phorest.com` for access requests; documented at `developer.phorest.com`). The API exposes products (read-only: barcode, stock levels, cost, sale price), transactions, and clients.
- Product import: Phorest's onboarding team imports products from prior systems as part of migration. There is no documented self-serve CSV import for products in public docs, but migration specialists handle this.
- Supplier integrations: Phorest's partner page lists **SalonCentric** (US) and **Colourstart** as featured partners, and the Vish color-management integration. The SalonCentric link appears to be a commercial/co-marketing partnership rather than a live catalog API feed — would need verification with Phorest support.
- Phorest supports a "colour formula and service notes" feature natively (freetext per appointment).
- Data model inferred: Product → (barcode, name, brand, cost_price, retail_price, stock_qty) → linked to Transaction → linked to Client.

**Fresha** (UK-based; global, free-tier model)

- Product import: CSV upload supported. Template fields include: product name, SKU, barcode (EAN/UPC), brand, supplier name, category, short description, full description, supply price, retail price, tax, stock quantity, retail sales enabled flag.
- No direct supplier feed documented; supplier is a free-text field on the product record.
- Barcode scanning supported at POS (hardware barcode scanner or phone camera).
- No colour formula tracking feature documented.
- Data model: Product → (SKU, barcode, brand, supplier, supply_price, retail_price, stock_qty, retail_sales_enabled). Inventory tracked per product; no variant-level (e.g. per-shade) stock granularity documented.

**Timely** (New Zealand-based; strong in AU/NZ; acquired by EverCommerce 2021)

- Timely offers an open API that has been used for custom integrations. No documented direct supplier catalog feed.
- Inventory module: products, stock tracking, low-stock alerts. Import via CSV.
- No colour formula tracking documented as a native feature.
- AU/NZ-specific: dominant brands in those markets (Wella, Schwarzkopf, Kevin Murphy, Goldwell) would be entered manually or via CSV.

**Vagaro** (US-focused; large user base)

- Barcode scanning supported: scanning a known barcode auto-populates product name, brand, and images from Vagaro's own product database.
- CSV bulk import, barcode scanning, manual entry all supported.
- Inventory tracks: brand, vendor, barcode, cost, retail price, stock qty, reorder point.
- Automatic stock deduction tied to POS sales and services.
- No documented direct supplier API feed.

**SalonBiz** (US; acquired by EverCommerce; sister product to Timely)

- Deep Vish integration for color management (see Section 3).
- Empowered Ordering feature: supports ordering directly within SalonBiz for specific brands including Bumble and bumble; auto-generates purchase orders when stock falls below minimum.
- Data model: products have brand, vendor, barcode, cost, retail, stock levels; colour formulas stored as notes per client appointment (structured via Vish or as freetext).

**Boulevard** (US; premium/enterprise)

- Vish integration supported (color formula tracking at appointment level).
- Inventory: barcode scanning, low-stock alerts, automated purchase orders, supplier management.
- API for third-party integrations documented at `developers.joinblvd.com`.

**Mangomint / MindBody / Zenoti** (US; enterprise-leaning)

- Standard pattern: CSV import or barcode scan, no public supplier feed.
- Zenoti exposes APIs for integration with vendor systems for ordering; structured inventory with expected usage per service (enables COGS tracking).

**Booksy / Salonized / Treatwell** (global / EU)

- Standard CSV import or manual entry. No documented supplier catalog integrations. Booksy and Treatwell are primarily booking/marketplace plays; inventory is less developed.

### Key Takeaway: No One Has a Live Supplier Feed

Every platform researched relies on **manual data entry, CSV import, or barcode scan** to ingest the product catalog. The closest to a live feed is Vagaro's barcode database (recognises known UPCs and auto-fills metadata), and SalonBiz's Empowered Ordering for specific brands. There is no industry-standard supplier API for hair product catalogs — this gap is structural.

---

## 3. Product-to-Client Linkage During Appointment

### The Industry Standard: Vish

The clearest best-in-class example of appointment-level product tracking is **Vish** (getvish.com), which integrates with Phorest, SalonBiz, Boulevard, Booker, Shortcuts, and SalonIQ.

**Vish workflow:**

1. Stylist opens the appointment in the Vish iPad app (synced from POS).
2. Selects service and opens a formula bowl.
3. Picks manufacturer → product category → specific product (colour + developer).
4. Sets target weight or ratio; the Bluetooth scale weighs product as it's dispensed into the bowl.
5. After application, the bowl is reweighed. Exact grams used (not estimated) are recorded.
6. Multiple bowls per service are supported (e.g. root formula + highlight formula + toner).
7. Formula is saved to client history automatically; notes push back to the salon POS.
8. The front desk receives exact product usage and any add-on charges without manual communication.

**Data captured per bowl/formula:**

- Manufacturer, product line, shade code
- Target grams (pre-mix) and actual grams used (post-reweigh)
- Developer type and ratio (e.g. 1:1, 1:2, 30vol)
- Processing notes (freetext)
- Cost and billable amount

**Vish data model (logical):**

```
Appointment
  └── Service (e.g. "Full Colour")
        └── Formula / Bowl (many per service)
              ├── product_id (manufacturer + SKU)
              ├── target_grams
              ├── actual_grams_used
              ├── developer_product_id
              ├── developer_ratio
              └── notes
```

This feeds: client colour history recall, COGS per service, inventory deduction, waste tracking, and revenue capture for missed add-ons.

**SalonBiz native formula notes:**
Without Vish, SalonBiz stores colour formulas as structured free-text notes attached to a client appointment from the tablet app. This is still the dominant pattern in smaller salons: stylists type "Wella Koleston 7/3 + 9/0 60g each, 30vol, 35 min" into a notes field. No gram-level tracking; formula accuracy depends on stylist memory.

**Phorest native formula tracking:**
Phorest tracks "colour formulas to important life events" as client notes. The Vish integration adds weight-based formula tracking on top. Without Vish, it's freetext.

### Non-Colour Products at Appointment Close

For non-colour products (treatments, retail sold at close), the pattern is:

- Stylist or front desk adds products to the checkout/POS line at appointment close.
- Products are selected from inventory by name, barcode scan, or search.
- Stock decrements; client purchase history is updated.
- This is standard in all major platforms (Phorest, Vagaro, Fresha, etc.).

### Use Cases Unlocked by Product-to-Appointment Linkage

| Use Case                      | What It Requires                                                         |
| ----------------------------- | ------------------------------------------------------------------------ |
| Colour formula recall         | Formula stored per appointment, retrievable per client                   |
| Allergy / sensitivity history | Products tagged with ingredients or allergen flags; linked to client     |
| COGS per service              | Cost price per product × grams used, per appointment                     |
| Retail recommendation         | Products used on client surfaced as "recommend to take home"             |
| Reorder trigger               | Stock level decrements drive low-stock alerts and PO generation          |
| Waste reduction               | Actual vs. expected product usage per stylist (requires weight tracking) |

---

## 4. Recommendation for OpenChair

### Tier 1 — MVP: Manual Catalog + Manual Link to Appointment

**What it is:** Owner enters products manually (or uploads a CSV). At appointment close, stylist ticks products used from a list.

**Data model changes needed:**

```prisma
model Product {
  id          String  @id @default(cuid())
  salonId     String
  name        String
  brand       String?
  sku         String?
  barcode     String?
  category    String?  // "colour", "treatment", "retail"
  costPrice   Int?     // cents
  retailPrice Int?     // cents
  stockQty    Int      @default(0)
  isBackbar   Boolean  @default(false)  // backbar = in-service use only
  // relations
  salonId     // → Salon
}

model BookingProduct {
  id         String  @id @default(cuid())
  bookingId  String
  productId  String
  qtyUsed    Decimal  // grams, ml, or units
  unit        String   // "g", "ml", "unit"
  isBillable  Boolean @default(false)
  notes       String?
  // formula fields (optional, freetext for now)
  formulaNote String?
}
```

**User pain solved:** Stylists can record what was used. Owner can track rough COGS. Client history shows products used. Allergy context is manually noted.

**Estimated dev effort:** 1–2 sprints. Product CRUD, CSV import, BookingProduct junction table, a product picker in the appointment close flow (after `IN_PROGRESS` → `COMPLETED` status change).

---

### Tier 2 — Barcode Scan at Appointment Close

**What it is:** Phone camera scans barcode on product tube/bottle. System looks up barcode in local inventory; if found, adds to appointment. If not found, prompts to create new product record. No supplier API needed.

**Why this is better than Tier 1:** Adding products by scanning is 10× faster than typing or scrolling a list, especially in a busy colour salon. Barcodes on Wella/Schwarzkopf/L'Oréal tubes are standard EAN-13.

**Data model changes:** None beyond Tier 1 — just expose a barcode lookup endpoint (`GET /api/inventory/lookup?barcode=4015600116255`).

**Optional enhancement:** If the barcode is not in local inventory, do a lookup against Open Beauty Facts API (free, no auth required) to pre-fill product name and brand. This covers consumer-range products well; professional products are spottier.

**Estimated dev effort:** +1 sprint on top of Tier 1. Uses browser `BarcodeDetector` API (supported on Chrome/Android; Safari has some limitations) or a library like `@zxing/library`.

---

### Tier 3 — Direct Supplier Feed (Top 3 AU Suppliers)

**What it is:** OpenChair pulls a product catalog from a supplier's API or CSV feed, auto-populating inventory. Salon doesn't need to enter products manually.

**Target market note:** OpenChair's CLAUDE.md references `Australia/Sydney` timezone as the default, suggesting AU is the primary market.

**AU dominant professional suppliers:**

1. **Schwarzkopf Professional** (Henkel Australia) — IGORA, Blondme, Silklift
2. **Wella Professionals** (Wella Company / Wella AU) — Koleston, Color Touch, Illumina
3. **L'Oréal Professional Products Division AU** — Majirel, INOA, Redken

**Reality check:** None of these have public partner APIs for catalog access as of May 2026. Integration would require:

- Contacting each brand's B2B/tech team to negotiate a data feed agreement
- Likely EDI (X12 or EDIFACT) or a scheduled CSV export via SFTP
- A brand catalog is hundreds of SKUs; colour ranges alone are 50–100+ shades

This is a significant business-development effort, not just a dev effort. The right path is to build Tiers 1 and 2 first, gain traction, then negotiate supplier data feeds as a growth initiative — following the same pattern Phorest/SalonBiz took years to establish.

**Alternative shortcut for Tier 3:** Build an import from Vish's product database. Vish already has a curated catalog of professional colour products by manufacturer. As a partner/integration, OpenChair could ingest the same product data. Would require business relationship with Vish.

**Estimated dev effort for Tier 3 proper:** 6–12 weeks per supplier, plus business development time. Not MVP.

---

## 5. Open Questions

The owner needs to answer these before scoping the implementation:

1. **Which market(s) are we targeting first — AU only, or AU + US?**
   The dominant distributors, brand names, and shade-code conventions differ between markets. AU prioritises Wella/Schwarzkopf/Goldwell; US prioritises SalonCentric's catalog (Redken, Matrix, Biolage). This affects which supplier feed is worth pursuing in Tier 3.

2. **Colour formula tracking: at the bowl level or as a single freetext note per appointment?**
   Bowl-level (Vish-style) requires a scale, more UI complexity, and a richer data model. Freetext per appointment is simpler and covers 80% of stylists' actual behaviour. These are meaningfully different engineering investments.

3. **Is backbar (in-service product consumed) tracked separately from retail (product sold to client at checkout)?**
   These are different inventory motions: backbar decrements per use but isn't invoiced separately; retail is a billable sale. Most platforms handle them differently. OpenChair needs a `isBackbar` flag and potentially separate stock pools.

4. **Do we want to track exact grams used (requires hardware — a scale), or approximate quantity (e.g. "one tube of Wella 7/3 used")?**
   Gram-level tracking unlocks waste reduction and precise COGS but requires a Bluetooth scale (hardware sell/recommend). Tube-level tracking is software-only and solves formula recall without hardware dependency. This is the key architectural decision for the colour formula feature.

5. **Are allergies tracked at the ingredient level, or as a client freetext note?**
   Ingredient-level tracking requires a product ingredient database (INCI data), which is available from Open Beauty Facts for consumer products but incomplete for professional ranges. Freetext allergy notes (already in the `Client.allergies` field) are simpler and cover the MVP.

6. **Does the owner want to support retail product sales (client buys a bottle to take home) within OpenChair's POS, or is that out of scope for MVP?**
   Retail sales involve payment, inventory deduction, and potentially tax rules different from services. This is a meaningful scope expansion.

7. **Is there an existing relationship with any distributor (Wella rep, SalonCentric account, etc.) that could accelerate a Tier 3 supplier feed negotiation?**
   A direct relationship with a brand rep is the fastest path to a structured data feed.

---

## Appendix: Key Reference URLs

- Phorest API getting started: `https://support.phorest.com/hc/en-us/articles/360018509300`
- Phorest Vish integration: `https://support.phorest.com/hc/en-us/articles/360018622300`
- Fresha product import: `https://www.fresha.com/help-center/knowledge-base/inventory/154-importing-an-existing-product-list`
- Vish formula tracking docs: `https://docs.getvish.com/docs/tablet-mixing/`
- Vish advanced mixing: `https://docs.getvish.com/docs/tablet-advanced-mixing/`
- SalonCentric marketplace (Mirakl): `https://support.channelengine.com/hc/en-us/articles/13791139313949`
- SalonCentric EDI: `https://www.ezcomsoftware.com/retailer-edi/salon-centric-edi/`
- Wella Wellastore: Wikipedia / Wella Company official site
- Open Beauty Facts (free barcode database): `https://world.openbeautyfacts.org/`

---

_This document reflects public information available as of May 2026. API availability and supplier integration programs change; all Tier 3 assumptions should be verified directly with supplier B2B teams before committing to implementation._
