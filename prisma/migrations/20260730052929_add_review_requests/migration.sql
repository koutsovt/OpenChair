-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "reviewSmsConsent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "salons" ADD COLUMN     "googlePlaceId" TEXT;

-- CreateTable
CREATE TABLE "review_requests" (
    "id" TEXT NOT NULL,
    "linkToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "followUpSentAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_requests_linkToken_key" ON "review_requests"("linkToken");

-- CreateIndex
CREATE UNIQUE INDEX "review_requests_bookingId_key" ON "review_requests"("bookingId");

-- CreateIndex
CREATE INDEX "review_requests_salonId_idx" ON "review_requests"("salonId");

-- CreateIndex
CREATE INDEX "review_requests_clientId_idx" ON "review_requests"("clientId");

-- CreateIndex
CREATE INDEX "review_requests_sentAt_followUpSentAt_clickedAt_idx" ON "review_requests"("sentAt", "followUpSentAt", "clickedAt");

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
