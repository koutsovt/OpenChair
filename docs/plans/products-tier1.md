# Tier-1 Product Tracking — Implementation Plan

**Scope lock:**

- Market: Australia only
- Granularity: product-level (not per-gram)
- Inventory: one combined pool — backbar and retail share the same product list; no retail POS flow

**ORM:** Prisma (PostgreSQL via Supabase) — matches existing `prisma/schema.prisma`

---

## 1. Data Model

Add three models and two enums to `prisma/schema.prisma`. Copy-paste ready.

```prisma
// ============================================================
// PRODUCTS (Tier 1)
// ============================================================

enum ProductCategory {
  COLOUR
  DEVELOPER
  SHAMPOO
  CONDITIONER
  TREATMENT
  STYLING
  OTHER
}

enum ProductUnit {
  TUBE
  BOTTLE
  SACHET
  EACH
}

model Product {
  id         String          @id @default(cuid())
  brand      String
  name       String
  shadeCode  String?         // e.g. "7/3", "6/45" — null for non-colour products
  sku        String?
  category   ProductCategory
  unit       ProductUnit
  notes      String?
  archivedAt DateTime?       // soft-delete; null = active

  salonId String
  salon   Salon  @relation(fields: [salonId], references: [id], onDelete: Cascade)

  bookingProducts    BookingProduct[]
  preferredByClients ClientPreferredProduct[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([salonId, brand, name, shadeCode])  // natural dedup key
  @@index([salonId, category])
  @@index([salonId, brand])
  @@index([archivedAt])
  @@map("products")
}

model BookingProduct {
  id        String  @id @default(cuid())
  bookingId String
  productId String
  quantity  Int     @default(1)
  notes     String? // freetext: "applied to roots only", "mixed with 30vol"

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  createdAt DateTime @default(now())

  @@index([bookingId])
  @@index([productId])
  @@map("booking_products")
}

model ClientPreferredProduct {
  id        String  @id @default(cuid())
  clientId  String
  productId String? // nullable — stylist can record a formula without picking a specific product
  label     String  // e.g. "Base colour", "Toner", "Highlights", "Allergic to"
  formula   String? // freetext: "60g Wella 7/3 + 60g Wella 9/0 + 20vol, 35min"
  notes     String? // scalp sensitivity, brand prefs, things to avoid
  pinned    Boolean @default(true) // pinned = shown prominently; false = collapsed archive

  addedByUserId String?
  salonId       String

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  product     Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  addedByUser User?    @relation(fields: [addedByUserId], references: [id], onDelete: SetNull)
  salon       Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([clientId, pinned])   // primary access pattern
  @@index([clientId, label])
  @@index([salonId])
  @@map("client_preferred_products")
}
```

**Add to existing models:**

```prisma
// In model Booking — add after smsLogs line:
productsUsed BookingProduct[]

// In model Salon — add after smsLogs line:
products          Product[]
clientPreferences ClientPreferredProduct[]

// In model Client — add after waitlistEntries line:
preferredProducts ClientPreferredProduct[]

// In model User — add after sessions line:
clientPreferencesAdded ClientPreferredProduct[]
```

**Client product history** is computed — no additional model needed. The query is:

```
prisma.bookingProduct.findMany({ where: { booking: { clientId } }, include: { product: true, booking: true }, orderBy: { createdAt: 'desc' } })
```

**Migration command:**

```bash
npx prisma migrate dev --name add_products_tier1
```

> The `ClientPreferredProduct.productId` is nullable so stylists can save a freetext formula entry before a matching product exists in the catalog. This avoids blocking the workflow.

---

## 2. CSV Import Format

### Column spec (order matters for template download)

| Column       | Required | Description                                                                              | Example                          |
| ------------ | -------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| `brand`      | ✅       | Brand name                                                                               | `Wella Professionals`            |
| `name`       | ✅       | Product/range name                                                                       | `Koleston Perfect Pure Naturals` |
| `shade_code` | optional | Colour shade code                                                                        | `7/0`                            |
| `sku`        | optional | Supplier/internal code                                                                   | `81318393`                       |
| `category`   | ✅       | One of: `colour`, `developer`, `shampoo`, `conditioner`, `treatment`, `styling`, `other` | `colour`                         |
| `unit`       | ✅       | One of: `tube`, `bottle`, `sachet`, `each`                                               | `tube`                           |
| `notes`      | optional | Internal notes                                                                           | `Use with Welloxon 30vol`        |

### Example rows (realistic AU salon stock)

```csv
brand,name,shade_code,sku,category,unit,notes
Wella Professionals,Koleston Perfect Pure Naturals,7/0,,colour,tube,
Wella Professionals,Koleston Perfect Pure Naturals,7/3,,colour,tube,Golden warm brown
Wella Professionals,Koleston Perfect Pure Naturals,9/0,,colour,tube,
Wella Professionals,Welloxon Perfect 30vol,,WO30,developer,bottle,Use 1:1 with Koleston
Schwarzkopf Professional,IGORA Royal Naturals,7-0,,colour,tube,
Schwarzkopf Professional,IGORA Royal,8-77,,colour,tube,Copper blonde
Schwarzkopf Professional,BlondMe Premium Lift 9+,,,colour,sachet,Foil work only
Kevin Murphy,HYDRATE-ME.WASH,,,shampoo,bottle,Dry/colour-treated hair
Kevin Murphy,ANGEL.WASH,,,shampoo,bottle,Fine hair
Kevin Murphy,KILLER.CURLS,,,styling,bottle,
GHD,Heat Protection Spray,,,styling,bottle,Pre-blowdry
Wella Professionals,Color Touch Sunlights,/34,,colour,tube,Balayage toning
```

### Validation rules

- **Enum coercion**: case-insensitive (`Colour` → `COLOUR`; `TUBE` → `TUBE`). Any value not in the enum after coercion is an error.
- **Required field check**: empty `brand`, `name`, `category`, or `unit` is an error.
- **Duplicate detection**: within the upload batch and against existing products, `brand + name + shade_code` (shade_code normalised to empty string when null) must be unique per salon. Duplicates within the batch are flagged; duplicates against existing records offer an "update" vs "skip" choice.
- **shade_code format**: no strict validation — freetext is fine. Optional warning if non-empty for category `shampoo`/`conditioner`/`developer`/`styling`/`other`.
- **Error report format**: inline per-row, shown in the import preview table:
  ```
  Row 3: invalid category "colur" — must be one of: colour, developer, shampoo, conditioner, treatment, styling, other
  Row 7: brand is required
  Row 12: duplicate of row 4 (same brand + name + shade_code)
  ```
- Valid rows import regardless of errors in other rows. Invalid rows are skipped and listed in the post-import summary.

---

## 3. UI Flows

### Products list page — `/products`

```
<ProductsPage>
  <PageHeader title="Products" />
  <div className="flex gap-2">           // toolbar
    <SearchInput placeholder="Search by brand, name, shade…" />
    <BrandFilterSelect />                // populated from distinct brands in DB
    <CategoryFilterSelect />             // enum values
    <Button onClick={openImportDialog}>Import CSV</Button>
    <Button onClick={openAddModal}>Add Product</Button>
  </div>
  <ProductsTable>                        // columns: Brand | Name | Shade | Category | Unit | Notes | Actions
    <TableRow per product>
      <ArchiveButton />                  // soft-delete; doesn't show archived by default
      <EditButton />
    </TableRow>
  </ProductsTable>
  <ShowArchivedToggle />                 // reveals archivedAt != null products greyed out
</ProductsPage>
```

### Add/edit product modal

```
<ProductFormModal>
  <Input name="brand" required />
  <Input name="name" required />
  <Input name="shadeCode" placeholder="e.g. 7/3 — leave blank if not a colour" />
  <Input name="sku" />
  <CategorySelect enum values />
  <UnitSelect enum values />
  <Textarea name="notes" />
  <Button type="submit">Save</Button>
</ProductFormModal>
```

### CSV import dialog

```
<CsvImportDialog>
  Step 1: <FileDropZone accept=".csv" />
          <DownloadTemplateLink />        // pre-filled template CSV

  Step 2: (after file parsed client-side)
  <PreviewTable rows={first10Rows}>
    <ValidationBadge per row: ✅ valid | ⚠ warning | ❌ error />
    <InlineErrorMessage per invalid row />
  </PreviewTable>
  <SummaryBar>X valid, Y invalid (will be skipped)</SummaryBar>
  <Button disabled={validCount === 0}>Import {validCount} rows</Button>

  Step 3: (after import)
  <ResultSummary imported={N} skipped={M} errors={[...]} />
</CsvImportDialog>
```

### Appointment-close flow (booking detail page — critical UX)

Added as a new collapsible section below the existing booking detail card. **No modal — fully inline.**

```
<ProductsUsedSection bookingId={id} clientId={booking.clientId}>
  <SectionHeader>Products used</SectionHeader>

  // Quick-action bar — shown when client has preferred products
  {client?.preferredProducts.filter(p => p.pinned).length > 0 && (
    <QuickActionBar>
      <Button variant="outline" onClick={applyPreferredProducts}>
        ✦ Apply preferred products  // bulk-adds client's pinned preferred products
      </Button>
    </QuickActionBar>
  )}

  // Product picker — no modal, inline combobox
  <ProductCombobox
    placeholder="Search brand, name or shade…"
    recentProducts={last10UsedByThisStylist}  // pinned to top
    onSelect={(product) => addProductToBooking(product.id)}
  />

  // Added products list
  {productsUsed.map(bp => (
    <ProductRow key={bp.id}>
      <ProductLabel>{bp.product.brand} — {bp.product.name} {bp.product.shadeCode}</ProductLabel>
      <QuantityStepper min={1} value={bp.quantity} onChange={updateQty} />
      <NoteInput placeholder="e.g. applied to roots only" value={bp.notes} onChange={updateNote} />
      <PinToClientButton
        title="Save to client's preferred products"
        onClick={() => openPinInlineForm(bp)}
      />  // small pin icon — opens tiny inline form below the row
      <RemoveButton onClick={() => removeProduct(bp.id)} />
    </ProductRow>
  ))}

  // Inline pin form — appears below a row when PinToClientButton is clicked
  {pinningRow && (
    <InlinePinForm>
      <Input name="label" placeholder="Label, e.g. Base colour" required autoFocus />
      <Textarea name="formula" placeholder="Formula notes (optional)" rows={2} />
      <Textarea name="notes" placeholder="Other notes (optional)" rows={2} />
      <Button size="sm" onClick={saveToPreferred}>Save to {client.name}'s profile</Button>
      <Button size="sm" variant="ghost" onClick={cancelPin}>Cancel</Button>
    </InlinePinForm>
  )}

  // Quick-repeat action
  {clientPreviousBookingProducts.length > 0 && (
    <Button variant="outline" onClick={repeatLastVisitProducts}>
      ↩ Repeat products from last visit ({format(lastVisitDate, 'dd MMM')})
    </Button>
  )}
</ProductsUsedSection>
```

**UX note:** The two quick-actions serve different intents:

- **"Apply preferred products"** = pre-fill from the curated client card (start of the close-out flow)
- **"Pin to client's preferred"** = save a product just used into the curated card (end of the flow, when something new or changed was used)

### Client profile — two product panels

The client detail page gets two distinct product-related panels, added after the hair profile card.

**Panel 1: "Preferred products & formulas"** (curated — stylist-maintained)

This is the hero panel. It renders prominently because it answers the daily question: _"What did we use on her last time and what should we use today?"_

```
<ClientPreferredProductsCard>
  <CardTitle>Preferred products & formulas</CardTitle>

  // Pinned entries — shown by default
  {pinnedEntries.map(entry => (
    <PreferredProductRow key={entry.id}>
      <Label className="font-bold">{entry.label}</Label>          // e.g. "Base colour"
      {entry.product && (
        <ProductChip>{entry.product.brand} {entry.product.name} {entry.product.shadeCode}</ProductChip>
      )}
      {entry.formula && (
        <FormulaText className="font-mono text-sm">{entry.formula}</FormulaText>
      )}
      {entry.notes && <NotesText className="text-muted-foreground">{entry.notes}</NotesText>}
      <InlineActions>
        <EditIconButton />    // opens edit modal
        <UnpinIconButton />   // moves to archive
        <DeleteIconButton />  // confirms then deletes
      </InlineActions>
    </PreferredProductRow>
  ))}

  <Button variant="default" onClick={openAddPreferredModal}>
    + Add preferred product
  </Button>

  // Unpinned archive — collapsed by default
  <Collapsible trigger={`Archive (${unpinnedCount} unpinned)`}>
    {unpinnedEntries.map(entry => (
      <PreferredProductRow key={entry.id} className="opacity-60">
        // same structure; RePinButton instead of UnpinButton
      </PreferredProductRow>
    ))}
  </Collapsible>
</ClientPreferredProductsCard>
```

**Add/edit preferred product modal:**

```
<PreferredProductModal>
  <Input name="label" placeholder="e.g. Base colour, Toner, Allergic to" required />
  <ProductCombobox name="productId" placeholder="Search catalog (optional)" />
  <Textarea name="formula" placeholder="e.g. 60g Wella 7/3 + 60g Wella 9/0 + 20vol, 35min" />
  <Textarea name="notes" placeholder="Scalp sensitivity, brand preferences, things to avoid…" />
  <Button type="submit">Save</Button>
</PreferredProductModal>
```

**Panel 2: "Hair history"** (auto-aggregated from bookings)

Below the curated panel. Reverse-chronological, grouped by visit.

```
<ClientHairHistoryCard>
  <CardTitle>Hair history</CardTitle>
  {visitGroups.map(group => (
    <VisitGroup key={group.bookingId}>
      <VisitHeader>
        <DateLabel>{format(group.startTime, 'dd MMM yyyy')}</DateLabel>
        <Link href={`/bookings/${group.bookingId}`}>View booking →</Link>
      </VisitHeader>
      {group.products.map(bp => (
        <ProductLabel key={bp.id}>
          {bp.product.brand} — {bp.product.name} {bp.product.shadeCode}
          {bp.notes && <NoteChip>{bp.notes}</NoteChip>}
        </ProductLabel>
      ))}
    </VisitGroup>
  ))}
</ClientHairHistoryCard>
```

---

## 4. API / Server Endpoints

Follows the existing pattern: **Server Actions** for mutations, **server component reads** for queries. Zod validation on all inputs. All actions call `getAuthenticatedSalon()` first.

| Action/Route               | Method           | Path / Function                         | Input                                                        | Output                                                                                                                                  |
| -------------------------- | ---------------- | --------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| List products              | server component | `getProducts(filters)`                  | `{ brand?, category?, includeArchived? }`                    | `Product[]`                                                                                                                             |
| Create product             | server action    | `createProduct(data)`                   | `{ brand, name, shadeCode?, sku?, category, unit, notes? }`  | `{ success, productId? }`                                                                                                               |
| Update product             | server action    | `updateProduct(id, data)`               | Partial product fields                                       | `{ success }`                                                                                                                           |
| Archive product            | server action    | `archiveProduct(id)`                    | `{ id }`                                                     | `{ success }`                                                                                                                           |
| Bulk import                | server action    | `importProductsCsv(rows)`               | `ParsedRow[]` (parsed client-side)                           | `{ imported, skipped, errors[] }`                                                                                                       |
| List booking products      | server component | `getBookingProducts(bookingId)`         | `bookingId`                                                  | `BookingProduct[]` with product                                                                                                         |
| Add product to booking     | server action    | `addProductToBooking(data)`             | `{ bookingId, productId, quantity?, notes? }`                | `{ success, bookingProductId? }`                                                                                                        |
| Update booking product     | server action    | `updateBookingProduct(id, data)`        | `{ quantity?, notes? }`                                      | `{ success }`                                                                                                                           |
| Remove booking product     | server action    | `removeBookingProduct(id)`              | `{ id }`                                                     | `{ success }`                                                                                                                           |
| Client product history     | server component | `getClientProductHistory(clientId)`     | `clientId, limit?`                                           | `BookingProduct[]` with booking + product                                                                                               |
| List preferred products    | server component | `getClientPreferredProducts(clientId)`  | `clientId`                                                   | `ClientPreferredProduct[]` with product, sorted pinned-first                                                                            |
| Create preferred product   | server action    | `createPreferredProduct(data)`          | `{ clientId, label, productId?, formula?, notes?, pinned? }` | `{ success, id? }`                                                                                                                      |
| Update preferred product   | server action    | `updatePreferredProduct(id, data)`      | `{ label?, productId?, formula?, notes?, pinned? }`          | `{ success }`                                                                                                                           |
| Delete preferred product   | server action    | `deletePreferredProduct(id)`            | `{ id }`                                                     | `{ success }`                                                                                                                           |
| Apply preferred to booking | server action    | `applyPreferredProductsToBooking(data)` | `{ bookingId, clientId }`                                    | `{ success, addedCount }` — bulk-creates `BookingProduct` rows from client's pinned preferred products that have a non-null `productId` |

Revalidation: all mutations call `revalidatePath('/bookings/[id]')` and `revalidatePath('/clients/[id]')` as appropriate.

---

## 5. Migration & Rollout

```bash
# After updating prisma/schema.prisma:
npx prisma migrate dev --name add_products_tier1
npx prisma generate
```

No feature flag needed — the Products page and `BookingProduct` section are purely additive. Existing bookings simply show an empty "Products used" section.

**Seed file** at `seed/products-au-starter.csv` — a ~30-product AU starter set covering the most common Wella, Schwarzkopf, and Kevin Murphy SKUs, ready to import via the CSV dialog on first setup.

---

## 6. Out of Scope — Tier 1

| Feature                                                  | Future tier                                                                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Barcode scanning (phone camera)                          | Tier 2                                                                                                                                   |
| Supplier catalog feeds (Wella, Schwarzkopf APIs)         | Tier 3                                                                                                                                   |
| Per-gram weight tracking (Vish-style)                    | Tier 3 / hardware                                                                                                                        |
| Separate retail vs. backbar inventory pools              | Tier 2                                                                                                                                   |
| Stock level tracking + reorder thresholds                | Tier 2                                                                                                                                   |
| Low-stock alerts                                         | Tier 2                                                                                                                                   |
| COGS per service / margin reporting                      | Tier 2                                                                                                                                   |
| Allergy warnings as structured/flagged fields            | Future — allergies live in `ClientPreferredProduct.notes` freetext for now (e.g. label: "Allergic to", notes: "PPD in oxidative colour") |
| Structured formula fields (bowl, ratio, processing time) | Tier 3 / Vish integration                                                                                                                |
| Product images                                           | Future                                                                                                                                   |
| Wholesale / cost-price tracking                          | Tier 2                                                                                                                                   |

---

## 7. Estimated Effort

| Section                                                                                                                    | Estimate                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Schema additions + Prisma migration (incl. `ClientPreferredProduct`)                                                       | 2.5 hrs                   |
| Server actions + queries — products + booking products                                                                     | 4 hrs                     |
| Server actions + queries — client preferred products (6 endpoints)                                                         | 2 hrs                     |
| Products list page + add/edit modal                                                                                        | 4 hrs                     |
| CSV import: client-side parser, validation, dialog UI                                                                      | 5 hrs                     |
| Booking detail — products used section (combobox, quantity stepper, "apply preferred", inline pin form, repeat-last-visit) | 8 hrs                     |
| Client profile — preferred products panel (curated, pinned/archive, add/edit modal)                                        | 4 hrs                     |
| Client profile — hair history panel (grouped by visit)                                                                     | 2 hrs                     |
| AU starter seed CSV (`seed/products-au-starter.csv`)                                                                       | 1 hr                      |
| Tests (server action unit tests, matching existing `src/server/__tests__/` pattern)                                        | 4 hrs                     |
| **Total**                                                                                                                  | **~36.5 hrs (~4.5 days)** |
