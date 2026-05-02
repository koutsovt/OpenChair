-- AlterTable
ALTER TABLE "clients" ADD COLUMN "allergies" TEXT,
ADD COLUMN "hairType" TEXT,
ADD COLUMN "hairTexture" TEXT,
ADD COLUMN "naturalColour" TEXT,
ADD COLUMN "productPreferences" TEXT,
ADD COLUMN "preferredStylistId" TEXT;

-- AlterTable
ALTER TABLE "stylists" ADD COLUMN "calendarToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stylists_calendarToken_key" ON "stylists"("calendarToken");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_preferredStylistId_fkey" FOREIGN KEY ("preferredStylistId") REFERENCES "stylists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
