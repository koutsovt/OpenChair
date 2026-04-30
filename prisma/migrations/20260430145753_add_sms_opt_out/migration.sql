-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "birthDate" DATETIME,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "smsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "clients_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_clients" ("birthDate", "createdAt", "email", "id", "isActive", "name", "notes", "phone", "salonId", "source", "updatedAt") SELECT "birthDate", "createdAt", "email", "id", "isActive", "name", "notes", "phone", "salonId", "source", "updatedAt" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE INDEX "clients_salonId_idx" ON "clients"("salonId");
CREATE INDEX "clients_phone_idx" ON "clients"("phone");
CREATE INDEX "clients_email_idx" ON "clients"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
