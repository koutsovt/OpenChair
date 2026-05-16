-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('COLOUR', 'DEVELOPER', 'SHAMPOO', 'CONDITIONER', 'TREATMENT', 'STYLING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('TUBE', 'BOTTLE', 'SACHET', 'EACH');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shadeCode" TEXT,
    "sku" TEXT,
    "category" "ProductCategory" NOT NULL,
    "unit" "ProductUnit" NOT NULL,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "salonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_products" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_preferred_products" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT,
    "label" TEXT NOT NULL,
    "formula" TEXT,
    "notes" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT true,
    "addedByUserId" TEXT,
    "salonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_preferred_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_salonId_category_idx" ON "products"("salonId", "category");

-- CreateIndex
CREATE INDEX "products_salonId_brand_idx" ON "products"("salonId", "brand");

-- CreateIndex
CREATE INDEX "products_archivedAt_idx" ON "products"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_salonId_brand_name_shadeCode_key" ON "products"("salonId", "brand", "name", "shadeCode");

-- CreateIndex
CREATE INDEX "booking_products_bookingId_idx" ON "booking_products"("bookingId");

-- CreateIndex
CREATE INDEX "booking_products_productId_idx" ON "booking_products"("productId");

-- CreateIndex
CREATE INDEX "client_preferred_products_clientId_pinned_idx" ON "client_preferred_products"("clientId", "pinned");

-- CreateIndex
CREATE INDEX "client_preferred_products_clientId_label_idx" ON "client_preferred_products"("clientId", "label");

-- CreateIndex
CREATE INDEX "client_preferred_products_salonId_idx" ON "client_preferred_products"("salonId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_products" ADD CONSTRAINT "booking_products_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_products" ADD CONSTRAINT "booking_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_preferred_products" ADD CONSTRAINT "client_preferred_products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_preferred_products" ADD CONSTRAINT "client_preferred_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_preferred_products" ADD CONSTRAINT "client_preferred_products_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_preferred_products" ADD CONSTRAINT "client_preferred_products_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
