-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "imageUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "salons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "imageUrl" TEXT,
    "theme" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "apiKey" TEXT,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "salons_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stylists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "imageUrl" TEXT,
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "stylists_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stylists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stylist_availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stylistId" TEXT NOT NULL,
    CONSTRAINT "stylist_availability_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "service_categories_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT NOT NULL,
    "categoryId" TEXT,
    CONSTRAINT "services_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stylist_services" (
    "stylistId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "priceOverride" INTEGER,
    "durationOverride" INTEGER,

    PRIMARY KEY ("stylistId", "serviceId"),
    CONSTRAINT "stylist_services_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stylist_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "birthDate" DATETIME,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "clients_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "price" INTEGER,
    "clientId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "serviceId" TEXT NOT NULL,
    "stylistId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "recurringBookingId" TEXT,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_recurringBookingId_fkey" FOREIGN KEY ("recurringBookingId") REFERENCES "recurring_bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recurring_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intervalWeeks" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "stylistId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "recurring_bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "recurring_bookings_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "recurring_bookings_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "preferredDateStart" DATETIME NOT NULL,
    "preferredDateEnd" DATETIME NOT NULL,
    "preferredTimeStart" TEXT,
    "preferredTimeEnd" TEXT,
    "notifiedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "stylistId" TEXT,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "waitlist_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "waitlist_entries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "waitlist_entries_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "stylists" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "waitlist_entries_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "twilioSid" TEXT,
    "bookingId" TEXT,
    "clientId" TEXT,
    "salonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sms_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sms_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sms_logs_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "salons_slug_key" ON "salons"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "salons_apiKey_key" ON "salons"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "salons_ownerId_key" ON "salons"("ownerId");

-- CreateIndex
CREATE INDEX "salons_slug_idx" ON "salons"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "stylists_userId_key" ON "stylists"("userId");

-- CreateIndex
CREATE INDEX "stylists_salonId_idx" ON "stylists"("salonId");

-- CreateIndex
CREATE INDEX "stylist_availability_stylistId_idx" ON "stylist_availability"("stylistId");

-- CreateIndex
CREATE UNIQUE INDEX "stylist_availability_stylistId_dayOfWeek_startTime_key" ON "stylist_availability"("stylistId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "service_categories_salonId_idx" ON "service_categories"("salonId");

-- CreateIndex
CREATE INDEX "services_salonId_idx" ON "services"("salonId");

-- CreateIndex
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");

-- CreateIndex
CREATE INDEX "clients_salonId_idx" ON "clients"("salonId");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "bookings_salonId_startTime_idx" ON "bookings"("salonId", "startTime");

-- CreateIndex
CREATE INDEX "bookings_stylistId_startTime_idx" ON "bookings"("stylistId", "startTime");

-- CreateIndex
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "recurring_bookings_salonId_nextRunDate_idx" ON "recurring_bookings"("salonId", "nextRunDate");

-- CreateIndex
CREATE INDEX "recurring_bookings_clientId_idx" ON "recurring_bookings"("clientId");

-- CreateIndex
CREATE INDEX "waitlist_entries_salonId_status_idx" ON "waitlist_entries"("salonId", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_clientId_idx" ON "waitlist_entries"("clientId");

-- CreateIndex
CREATE INDEX "sms_logs_salonId_createdAt_idx" ON "sms_logs"("salonId", "createdAt");

-- CreateIndex
CREATE INDEX "sms_logs_phone_idx" ON "sms_logs"("phone");

-- CreateIndex
CREATE INDEX "sms_logs_bookingId_idx" ON "sms_logs"("bookingId");
